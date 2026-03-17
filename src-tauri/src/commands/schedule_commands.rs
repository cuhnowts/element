use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::schedule::Schedule;

#[tauri::command]
pub async fn create_schedule(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    workflow_id: String,
    cron_expression: String,
) -> Result<Schedule, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let schedule = db
        .create_schedule(&workflow_id, &cron_expression)
        .map_err(|e| e.to_string())?;
    app.emit("schedule-created", &schedule)
        .map_err(|e| e.to_string())?;
    Ok(schedule)
}

#[tauri::command]
pub async fn get_schedule_for_workflow(
    state: State<'_, std::sync::Mutex<Database>>,
    workflow_id: String,
) -> Result<Option<Schedule>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_schedule_by_workflow(&workflow_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_schedule(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    schedule_id: String,
    cron_expression: String,
) -> Result<Schedule, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let schedule = db
        .update_schedule_cron(&schedule_id, &cron_expression)
        .map_err(|e| e.to_string())?;
    app.emit("schedule-updated", &schedule)
        .map_err(|e| e.to_string())?;
    Ok(schedule)
}

#[tauri::command]
pub async fn toggle_schedule(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    schedule_id: String,
    is_active: bool,
) -> Result<Schedule, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let schedule = db
        .toggle_schedule(&schedule_id, is_active)
        .map_err(|e| e.to_string())?;
    app.emit("schedule-toggled", &schedule)
        .map_err(|e| e.to_string())?;
    Ok(schedule)
}

#[tauri::command]
pub async fn delete_schedule(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    schedule_id: String,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.delete_schedule(&schedule_id)
        .map_err(|e| e.to_string())?;
    app.emit("schedule-deleted", &schedule_id)
        .map_err(|e| e.to_string())?;
    Ok(())
}
