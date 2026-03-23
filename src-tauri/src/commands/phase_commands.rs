use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::phase::{CreatePhaseInput, Phase};
use crate::models::project::Project;
use crate::models::task::Task;

#[tauri::command]
pub async fn create_phase(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
    name: String,
) -> Result<Phase, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = CreatePhaseInput {
        project_id: project_id.clone(),
        name,
    };
    let phase = db.create_phase(input).map_err(|e| e.to_string())?;
    app.emit("phase-created", &phase)
        .map_err(|e| e.to_string())?;
    Ok(phase)
}

#[tauri::command]
pub async fn list_phases(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
) -> Result<Vec<Phase>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_phases(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_phase(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    phase_id: String,
    name: String,
) -> Result<Phase, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let phase = db
        .update_phase(&phase_id, &name)
        .map_err(|e| e.to_string())?;
    app.emit("phase-updated", &phase)
        .map_err(|e| e.to_string())?;
    Ok(phase)
}

#[tauri::command]
pub async fn delete_phase(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    phase_id: String,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.delete_phase(&phase_id).map_err(|e| e.to_string())?;
    app.emit("phase-deleted", &phase_id)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reorder_phases(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
    ordered_ids: Vec<String>,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.reorder_phases(&project_id, ordered_ids)
        .map_err(|e| e.to_string())?;
    app.emit("phases-reordered", &project_id)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn link_project_directory(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
    directory_path: String,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let project = db
        .link_directory(&project_id, &directory_path)
        .map_err(|e| e.to_string())?;
    app.emit("project-updated", &project)
        .map_err(|e| e.to_string())?;
    Ok(project)
}

/// Dedicated command for setting a task's phase. Accepts nullable phase_id.
/// This is separate from update_task because the generic update_task Option pattern
/// cannot distinguish "don't change" (None) from "set to NULL" (unassign).
#[tauri::command]
pub async fn set_task_phase(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    task_id: String,
    phase_id: Option<String>,
) -> Result<Task, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let task = db
        .set_task_phase(&task_id, phase_id.as_deref())
        .map_err(|e| e.to_string())?;
    app.emit("task-updated", &task)
        .map_err(|e| e.to_string())?;
    Ok(task)
}
