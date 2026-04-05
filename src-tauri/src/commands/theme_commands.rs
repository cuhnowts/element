use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::project::Project;
use crate::models::task::Task;
use crate::models::theme::{CreateThemeInput, Theme, UpdateThemeInput};

#[tauri::command]
pub async fn create_theme(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    name: String,
    color: String,
) -> Result<Theme, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = CreateThemeInput { name, color };
    let theme = db.create_theme(input).map_err(|e| e.to_string())?;
    app.emit("theme-created", &theme)
        .map_err(|e| e.to_string())?;
    Ok(theme)
}

#[tauri::command]
pub async fn list_themes(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<Vec<Theme>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_themes().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_theme(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    theme_id: String,
    name: Option<String>,
    color: Option<String>,
) -> Result<Theme, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = UpdateThemeInput { name, color };
    let theme = db
        .update_theme(&theme_id, input)
        .map_err(|e| e.to_string())?;
    app.emit("theme-updated", &theme)
        .map_err(|e| e.to_string())?;
    Ok(theme)
}

#[tauri::command]
pub async fn delete_theme(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    theme_id: String,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.delete_theme(&theme_id).map_err(|e| e.to_string())?;
    app.emit("theme-deleted", &theme_id)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reorder_themes(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    ordered_ids: Vec<String>,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.reorder_themes(ordered_ids).map_err(|e| e.to_string())?;
    app.emit("themes-reordered", ())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_theme_item_counts(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    theme_id: String,
) -> Result<(i64, i64), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_theme_item_counts(&theme_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn assign_project_theme(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
    theme_id: Option<String>,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let project = db
        .assign_project_theme(&project_id, theme_id.as_deref())
        .map_err(|e| e.to_string())?;
    app.emit("project-updated", &project)
        .map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub async fn assign_task_theme(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    task_id: String,
    theme_id: Option<String>,
) -> Result<Task, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let task = db
        .assign_task_theme(&task_id, theme_id.as_deref())
        .map_err(|e| e.to_string())?;
    app.emit("task-updated", &task).map_err(|e| e.to_string())?;
    Ok(task)
}
