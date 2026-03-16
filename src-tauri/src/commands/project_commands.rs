use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::project::{CreateProjectInput, Project};

#[tauri::command]
pub async fn create_project(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    name: String,
    description: Option<String>,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = CreateProjectInput { name, description };
    let project = db.create_project(input).map_err(|e| e.to_string())?;
    app.emit("project-created", &project)
        .map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub async fn list_projects(
    state: State<'_, std::sync::Mutex<Database>>,
) -> Result<Vec<Project>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_project(
    state: State<'_, std::sync::Mutex<Database>>,
    project_id: String,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_project(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_project(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    project_id: String,
    name: String,
    description: String,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let project = db
        .update_project(&project_id, &name, &description)
        .map_err(|e| e.to_string())?;
    app.emit("project-updated", &project)
        .map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub async fn delete_project(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    project_id: String,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.delete_project(&project_id)
        .map_err(|e| e.to_string())?;
    app.emit("project-deleted", &project_id)
        .map_err(|e| e.to_string())?;
    Ok(())
}
