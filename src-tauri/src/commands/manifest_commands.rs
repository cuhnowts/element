use std::sync::{Arc, Mutex};
use std::time::Duration;

use chrono::Timelike;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::ai::gateway::AiGateway;
use crate::ai::types::CompletionRequest;
use crate::db::connection::Database;
use crate::models::manifest::{build_manifest_string, ManifestState};
use crate::models::scoring::{compute_scores, ScoringResult};

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
/// - `briefing-chunk`: each streamed text chunk (for progress indication)
/// - `briefing-data`: complete parsed JSON briefing data
/// - `briefing-complete`: when generation finishes successfully
/// - `briefing-error`: on failure or missing provider
#[tauri::command]
pub async fn generate_briefing(
    app: AppHandle,
    db_state: State<'_, Arc<Mutex<Database>>>,
    _manifest_state: State<'_, ManifestState>,
    gateway: State<'_, AiGateway>,
    heartbeat_state: State<'_, crate::heartbeat::HeartbeatState>,
) -> Result<(), String> {
    // Compute scored project data from the scoring engine
    let scoring_result = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        compute_scores(&db)?
    };

    // Serialize scoring result as JSON for the LLM user message
    let mut user_message =
        serde_json::to_string_pretty(&scoring_result).map_err(|e| e.to_string())?;

    // Prepend heartbeat risk summary if available
    {
        let assessment = heartbeat_state
            .latest_assessment
            .lock()
            .map_err(|e| e.to_string())?;
        if let Some(ref assessment) = *assessment {
            if !assessment.risks.is_empty() {
                user_message = format!(
                    "## Deadline Risk Alert\n\n{}\n\nAssessed at: {}\n\n---\n\n{}",
                    assessment.summary, assessment.assessed_at, user_message
                );
            }
        }
    }

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
        system_prompt: build_briefing_system_prompt_json(),
        user_message,
        max_tokens: 1024,
        temperature: 0.7,
        tools: None,
        tool_results: None,
    };

    // Use non-streaming complete() to avoid channel/forwarder complexity
    let result = provider.complete(request).await;

    match result {
        Ok(response) => {
            let raw = response.content;
            let cleaned = strip_json_fences(&raw);

            match serde_json::from_str::<serde_json::Value>(cleaned) {
                Ok(mut parsed) => {
                    merge_project_ids(&mut parsed, &scoring_result);

                    let final_json_string =
                        serde_json::to_string(&parsed).map_err(|e| e.to_string())?;
                    let _ = app.emit("briefing-data", &final_json_string);
                    let _ = app.emit("briefing-complete", ());
                }
                Err(_) => {
                    let _ = app.emit(
                        "briefing-error",
                        "Briefing could not be generated. The AI response was not valid JSON.",
                    );
                }
            }
            Ok(())
        }
        Err(e) => {
            let error_msg = e.to_string();
            let _ = app.emit("briefing-error", &error_msg);
            Ok(())
        }
    }
}

/// Generate a template-based context summary from scoring data (no LLM call).
/// Used for the greeting area (per D-04).
#[tauri::command]
pub async fn generate_context_summary(
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<String, String> {
    let db = db_state.lock().map_err(|e| e.to_string())?;
    let scoring = compute_scores(&db)?;

    let summary = if scoring.projects.is_empty() {
        "Nothing on the radar today. Enjoy the clear schedule.".to_string()
    } else {
        let busy_text = if scoring.busy_score > 0.8 {
            "Packed day"
        } else if scoring.busy_score > 0.5 {
            "Moderate day"
        } else {
            "Light day"
        };
        let meetings_text = if scoring.total_meetings > 0 {
            format!(
                "{} meeting{}",
                scoring.total_meetings,
                if scoring.total_meetings == 1 { "" } else { "s" }
            )
        } else {
            "no meetings".to_string()
        };
        let tasks_text = if scoring.total_tasks_due > 0 {
            format!(
                "{} task{} due",
                scoring.total_tasks_due,
                if scoring.total_tasks_due == 1 {
                    ""
                } else {
                    "s"
                }
            )
        } else {
            "nothing due".to_string()
        };
        format!("{} -- {} and {}.", busy_text, meetings_text, tasks_text)
    };

    Ok(summary)
}

/// Strip common JSON wrappers (```json ... ```) from LLM output.
fn strip_json_fences(raw: &str) -> &str {
    let trimmed = raw.trim();
    if let Some(after_fence) = trimmed.strip_prefix("```json") {
        // skip ```json
        if let Some(end) = after_fence.rfind("```") {
            return after_fence[..end].trim();
        }
    }
    if let Some(after_fence) = trimmed.strip_prefix("```") {
        if let Some(end) = after_fence.rfind("```") {
            return after_fence[..end].trim();
        }
    }
    trimmed
}

/// Merge projectId from scoring data into parsed JSON by matching project names.
fn merge_project_ids(parsed: &mut serde_json::Value, scoring: &ScoringResult) {
    if let Some(projects) = parsed.get_mut("projects") {
        if let Some(arr) = projects.as_array_mut() {
            for project in arr.iter_mut() {
                if let Some(name) = project.get("name").and_then(|n| n.as_str()) {
                    // Find matching scored project by name
                    if let Some(scored) = scoring.projects.iter().find(|sp| sp.name == name) {
                        project["projectId"] = serde_json::json!(scored.project_id);
                    }
                }
            }
        }
    }
}

/// Build a time-aware system prompt for the daily briefing that requests JSON output.
fn build_briefing_system_prompt_json() -> String {
    let hour = chrono::Local::now().hour();
    let time_context = if hour < 12 {
        "morning. Focus on planning the day ahead and highlighting top priorities."
    } else if hour < 17 {
        "afternoon. Focus on progress so far and what's left to accomplish today."
    } else {
        "evening. Focus on wrapping up and summarizing what was accomplished."
    };

    format!(
        "You are an executive briefing assistant. The user's current time is {}\n\
        \n\
        You will receive scored project data with tags, priorities, and metrics.\n\
        Your job is to narrate this data as a concise briefing.\n\
        \n\
        Output ONLY valid JSON matching this schema (no markdown fences, no extra text):\n\
        {{\n\
          \"summary\": \"1-2 sentence overview of the day\",\n\
          \"projects\": [\n\
            {{\n\
              \"name\": \"Project Name\",\n\
              \"projectId\": 123,\n\
              \"tags\": [\"overdue\", \"blocked\"],\n\
              \"blockers\": [\"Description of blocker\"],\n\
              \"deadlines\": [\"Task X due tomorrow\"],\n\
              \"wins\": [\"Completed Task Y yesterday\"]\n\
            }}\n\
          ]\n\
        }}\n\
        \n\
        Rules:\n\
        - Keep the summary to 1-2 sentences. Tone: concise executive brief.\n\
        - Projects are already ranked by priority. Preserve the order.\n\
        - Each description should be a single readable sentence.\n\
        - Omit empty sections (if no blockers, omit the blockers array or leave empty).\n\
        - Do NOT add projects not present in the input data.\n\
        - Do NOT include markdown formatting in any field.\n\
        - The projectId field MUST match the projectId from the input data exactly.",
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

#[cfg(test)]
mod briefing_json_tests {
    use super::*;

    #[test]
    fn test_strip_json_fences_clean_json() {
        let input = r#"{"summary":"test"}"#;
        assert_eq!(strip_json_fences(input), input);
    }

    #[test]
    fn test_strip_json_fences_with_backticks() {
        let input = "```json\n{\"summary\":\"test\"}\n```";
        assert_eq!(strip_json_fences(input), r#"{"summary":"test"}"#);
    }

    #[test]
    fn test_strip_json_fences_with_plain_backticks() {
        let input = "```\n{\"summary\":\"test\"}\n```";
        assert_eq!(strip_json_fences(input), r#"{"summary":"test"}"#);
    }

    #[test]
    fn test_briefing_json_parse_valid() {
        let json_str = r#"{
            "summary": "Busy day ahead with 3 projects needing attention.",
            "projects": [
                {
                    "name": "Project Alpha",
                    "projectId": 1,
                    "tags": ["overdue", "blocked"],
                    "blockers": ["API integration stuck"],
                    "deadlines": ["Deploy by tomorrow"],
                    "wins": ["Completed auth module"]
                }
            ]
        }"#;
        let parsed: serde_json::Value = serde_json::from_str(json_str).unwrap();
        assert_eq!(
            parsed["summary"],
            "Busy day ahead with 3 projects needing attention."
        );
        let projects = parsed["projects"].as_array().unwrap();
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0]["name"], "Project Alpha");
        assert_eq!(projects[0]["tags"][0], "overdue");
        assert_eq!(projects[0]["blockers"][0], "API integration stuck");
    }

    #[test]
    fn test_briefing_json_parse_invalid() {
        let result = serde_json::from_str::<serde_json::Value>("not json");
        assert!(result.is_err());
    }

    #[test]
    fn test_merge_project_ids() {
        let scoring = ScoringResult {
            projects: vec![crate::models::scoring::ScoredProject {
                project_id: "abc-123".to_string(),
                name: "My Project".to_string(),
                priority_score: 100.0,
                tags: vec![],
                blockers: vec![],
                deadlines: vec![],
                wins: vec![],
            }],
            busy_score: 0.5,
            total_meetings: 1,
            total_tasks_due: 2,
        };

        let mut parsed: serde_json::Value = serde_json::from_str(
            r#"{"summary":"test","projects":[{"name":"My Project","projectId":0}]}"#,
        )
        .unwrap();

        merge_project_ids(&mut parsed, &scoring);

        assert_eq!(parsed["projects"][0]["projectId"], "abc-123");
    }
}
