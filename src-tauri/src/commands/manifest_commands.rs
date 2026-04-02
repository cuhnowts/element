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
        Given the project status below, produce a structured daily briefing written for a CEO.\n\
        \n\
        **Format (strict):**\n\
        \n\
        1. **Opening paragraph** (2-3 sentences): Executive summary — the single most important thing \
        across all projects right now, overall trajectory, and one clear recommendation for today.\n\
        \n\
        2. **Project-by-project breakdown** using this structure for each active project:\n\
        \n\
        ### Project Name\n\
        - **Status:** one-line assessment (on track / needs attention / blocked)\n\
        - **Current phase:** name and completion %\n\
        - **Next action:** specific, actionable next step\n\
        \n\
        Skip projects with no active phases.\n\
        \n\
        **Writing rules:**\n\
        - Front-load every sentence with the conclusion, then supporting detail\n\
        - Use bullet points, never prose paragraphs after the opening\n\
        - Bold project names and phase names\n\
        - Be direct, no filler words, no cheerleading\n\
        - Do NOT include a greeting — the app adds one separately\n\
        - Do NOT repeat raw data — synthesize and prioritize\n\
        - Keep total response under 300 words",
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
