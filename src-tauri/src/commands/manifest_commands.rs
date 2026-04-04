use std::sync::{Arc, Mutex};
use std::time::Duration;

use chrono::Timelike;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::ai::gateway::AiGateway;
use crate::ai::types::CompletionRequest;
use crate::db::connection::Database;
use crate::models::manifest::{build_manifest_string, ManifestRebuildTrigger, ManifestState};

/// Build (or rebuild) the context manifest and cache it.
/// Returns the manifest markdown string.
#[tauri::command]
pub async fn build_context_manifest(
    db_state: State<'_, Arc<Mutex<Database>>>,
    manifest_state: State<'_, ManifestState>,
) -> Result<String, String> {
    let manifest = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        build_manifest_string(&db)?
    };

    {
        let mut cached = manifest_state.cached.lock().map_err(|e| e.to_string())?;
        *cached = manifest.clone();
    }

    Ok(manifest)
}

/// Generate an AI briefing by streaming LLM output as Tauri events.
///
/// Events emitted:
/// - `briefing-chunk`: each streamed text chunk
/// - `briefing-complete`: when generation finishes successfully
/// - `briefing-error`: on failure or missing provider
#[tauri::command]
pub async fn generate_briefing(
    app: AppHandle,
    db_state: State<'_, Arc<Mutex<Database>>>,
    manifest_state: State<'_, ManifestState>,
    gateway: State<'_, AiGateway>,
) -> Result<(), String> {
    // Read cached manifest (or build if empty)
    let manifest = {
        let cached = manifest_state.cached.lock().map_err(|e| e.to_string())?;
        cached.clone()
    };

    let manifest = if manifest.is_empty() {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        let fresh = build_manifest_string(&db)?;
        {
            let mut cached = manifest_state.cached.lock().map_err(|e| e.to_string())?;
            *cached = fresh.clone();
        }
        fresh
    } else {
        manifest
    };

    // Get provider (API provider first, falls back to CLI tool)
    let provider = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        match gateway.get_default_provider(&db) {
            Ok(p) => p,
            Err(_) => {
                let _ = app.emit(
                    "briefing-error",
                    "No AI provider or CLI tool configured. Add one in Settings to enable the daily briefing.",
                );
                return Ok(());
            }
        }
    };

    let request = CompletionRequest {
        system_prompt: build_briefing_system_prompt(),
        user_message: manifest,
        max_tokens: 1024,
        temperature: 0.7,
        tools: None,
        tool_results: None,
    };

    // Create channel for streaming
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(32);

    let app_clone = app.clone();

    // Spawn forwarder task to emit briefing chunks to frontend
    let forwarder = tokio::spawn(async move {
        while let Some(chunk) = rx.recv().await {
            let _ = app_clone.emit("briefing-chunk", &chunk);
        }
    });

    // Run the streaming completion
    let result = provider.complete_stream(request, tx).await;

    // Wait for forwarder to finish
    let _ = forwarder.await;

    match result {
        Ok(_) => {
            let _ = app.emit("briefing-complete", ());
            Ok(())
        }
        Err(e) => {
            let error_msg = e.to_string();
            let _ = app.emit("briefing-error", &error_msg);
            Ok(())
        }
    }
}

/// Build a time-aware system prompt for the daily briefing.
fn build_briefing_system_prompt() -> String {
    let hour = chrono::Local::now().hour();
    let time_context = if hour < 12 {
        "morning. Focus on planning the day ahead and highlighting top priorities."
    } else if hour < 17 {
        "afternoon. Focus on progress so far and what's left to accomplish today."
    } else {
        "evening. Focus on wrapping up and summarizing what was accomplished."
    };

    format!(
        "You are an executive briefing assistant. The user's current time is {}.\n\
        \n\
        Given the project status below, produce a structured daily briefing.\n\
        \n\
        **Format (strict):**\n\
        \n\
        Start with a 2-3 sentence executive summary: the most important thing right now, \
        overall trajectory, and one clear recommendation for today.\n\
        \n\
        Then for each active project, use exactly this markdown structure:\n\
        \n\
        ---\n\
        \n\
        #### Project Name\n\
        \n\
        - **Status:** on track / needs attention / blocked\n\
        - **Current phase:** phase name — X% complete\n\
          - Key accomplishment or blocker detail\n\
          - Second detail if relevant\n\
        - **Next action:** specific, concrete next step\n\
        \n\
        Skip projects with no active work.\n\
        \n\
        **Writing rules:**\n\
        - Use nested bullet points (indented with two spaces) for supporting details\n\
        - Front-load every bullet with the conclusion first\n\
        - Bold all project names, phase names, and key terms\n\
        - Use `---` horizontal rules between projects for visual separation\n\
        - Be direct — no filler, no cheerleading, no \"let's\" or \"we should\"\n\
        - Do NOT include a greeting — the app adds one separately\n\
        - Do NOT echo raw data — synthesize and prioritize\n\
        - Keep total response under 500 words\n\
        \n\
        ---\n\
        \n\
        #### Today's Plan\n\
        \n\
        After the project summaries, add a \"Today's Plan\" section.\n\
        Use the \"Today's Schedule\" data from the project status to narrate what the user should work on.\n\
        \n\
        **Rules for Today's Plan:**\n\
        - List the scheduled tasks in time order with their time slots\n\
        - If the schedule shows OVERFLOW, explicitly state which tasks won't fit and ask: \
        \"What should we work on today?\"\n\
        - If tasks have no due date, suggest 1-2 that would benefit from a deadline. \
        Format each suggestion on its own line as: SUGGEST_DUE_DATE:{{\"taskId\":\"<id>\",\"date\":\"<YYYY-MM-DD>\",\"taskTitle\":\"<title>\"}}\n\
        - Never auto-apply changes. Only suggest.\n\
        - If no schedule data is present, say the day is open and suggest reviewing undated tasks",
        time_context
    )
}

/// Spawn a background task that rebuilds the manifest cache on a debounced schedule.
///
/// Returns a sender that mutation commands can use to trigger a rebuild.
/// After receiving a trigger, waits 5 seconds, drains any additional triggers,
/// then rebuilds the manifest from the database.
pub fn spawn_manifest_rebuilder(app_handle: AppHandle) -> tokio::sync::mpsc::Sender<()> {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<()>(16);

    tauri::async_runtime::spawn(async move {
        while rx.recv().await.is_some() {
            // Debounce: wait 5 seconds
            tokio::time::sleep(Duration::from_secs(5)).await;

            // Drain any additional triggers that arrived during the wait
            while rx.try_recv().is_ok() {}

            // Rebuild the manifest
            let db_state = app_handle.state::<Arc<Mutex<Database>>>();
            let manifest_state = app_handle.state::<ManifestState>();

            let result = {
                let db = match db_state.lock() {
                    Ok(db) => db,
                    Err(e) => {
                        eprintln!("Manifest rebuilder: failed to lock DB: {}", e);
                        continue;
                    }
                };
                build_manifest_string(&db)
            };

            match result {
                Ok(manifest) => {
                    if let Ok(mut cached) = manifest_state.cached.lock() {
                        *cached = manifest;
                    }
                }
                Err(e) => {
                    eprintln!("Manifest rebuilder: failed to build manifest: {}", e);
                }
            }
        }
    });

    tx
}
