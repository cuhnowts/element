use std::path::PathBuf;
use std::sync::Mutex as StdMutex;

use tauri::{AppHandle, Emitter, Manager, State};

use crate::db::connection::Database;

/// Managed state for the plan file watcher
pub struct PlanWatcherState(
    pub StdMutex<Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>,
);

#[tauri::command]
pub async fn generate_skill_file(
    project_dir: String,
    project_name: String,
    scope: String,
    goals: String,
) -> Result<String, String> {
    let element_dir = PathBuf::from(&project_dir).join(".element");
    std::fs::create_dir_all(&element_dir)
        .map_err(|e| format!("Failed to create .element dir: {}", e))?;

    // Delete stale plan-output.json if it exists
    let output_path = element_dir.join("plan-output.json");
    if output_path.exists() {
        std::fs::remove_file(&output_path)
            .map_err(|e| format!("Failed to remove stale plan output: {}", e))?;
    }

    let content =
        crate::models::onboarding::generate_skill_file_content(&project_name, &scope, &goals);
    let skill_path = element_dir.join("onboard.md");
    std::fs::write(&skill_path, &content)
        .map_err(|e| format!("Failed to write skill file: {}", e))?;
    Ok(skill_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn start_plan_watcher(
    app: AppHandle,
    watcher_state: State<'_, PlanWatcherState>,
    project_dir: String,
) -> Result<(), String> {
    use notify::Watcher;
    use notify_debouncer_mini::new_debouncer;
    use std::time::Duration;

    let element_dir = PathBuf::from(&project_dir).join(".element");
    std::fs::create_dir_all(&element_dir).map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        move |events: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
            if let Ok(events) = events {
                for event in events {
                    if event.path.file_name()
                        == Some(std::ffi::OsStr::new("plan-output.json"))
                    {
                        if let Ok(content) = std::fs::read_to_string(&event.path) {
                            match crate::models::onboarding::parse_plan_output_file(&content) {
                                Ok(plan) => {
                                    let _ = app_handle.emit("plan-output-detected", &plan);
                                }
                                Err(e) => {
                                    let _ = app_handle.emit("plan-output-error", &e);
                                }
                            }
                        }
                        break;
                    }
                }
            }
        },
    )
    .map_err(|e| e.to_string())?;

    debouncer
        .watcher()
        .watch(&element_dir, notify::RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    let mut state = watcher_state.0.lock().map_err(|e| e.to_string())?;
    *state = Some(debouncer);
    Ok(())
}

#[tauri::command]
pub async fn stop_plan_watcher(
    watcher_state: State<'_, PlanWatcherState>,
) -> Result<(), String> {
    let mut state = watcher_state.0.lock().map_err(|e| e.to_string())?;
    *state = None; // Drop the debouncer, stops watching
    Ok(())
}

#[tauri::command]
pub async fn parse_plan_output(
    project_dir: String,
) -> Result<crate::models::onboarding::PlanOutput, String> {
    let path = PathBuf::from(&project_dir)
        .join(".element")
        .join("plan-output.json");
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read plan output: {}", e))?;
    crate::models::onboarding::parse_plan_output_file(&content)
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateResult {
    pub phase_count: i32,
    pub task_count: i32,
}

#[tauri::command]
pub async fn batch_create_plan(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
    phases: Vec<crate::models::onboarding::PendingPhaseInput>,
) -> Result<BatchCreateResult, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let tx = db
        .conn()
        .unchecked_transaction()
        .map_err(|e| e.to_string())?;

    let mut phase_count = 0i32;
    let mut task_count = 0i32;

    for (i, phase) in phases.iter().enumerate() {
        let phase_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        tx.execute(
            "INSERT INTO phases (id, project_id, name, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![phase_id, project_id, phase.name, i as i32, now, now],
        )
        .map_err(|e| e.to_string())?;
        phase_count += 1;

        for task in &phase.tasks {
            let task_id = uuid::Uuid::new_v4().to_string();
            let task_now = chrono::Utc::now().to_rfc3339();
            tx.execute(
                "INSERT INTO tasks (id, project_id, phase_id, title, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![
                    task_id,
                    project_id,
                    phase_id,
                    task.title,
                    task.description.as_deref().unwrap_or(""),
                    task_now,
                    task_now
                ],
            )
            .map_err(|e| e.to_string())?;
            task_count += 1;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    let result = BatchCreateResult {
        phase_count,
        task_count,
    };
    let _ = app.emit("plan-saved", &project_id);
    Ok(result)
}

#[tauri::command]
pub async fn get_app_setting(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    key: String,
) -> Result<Option<String>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_app_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_app_setting(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    key: String,
    value: String,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.set_app_setting(&key, &value).map_err(|e| e.to_string())
}
