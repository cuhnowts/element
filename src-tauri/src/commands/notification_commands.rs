use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::notification::{CreateNotificationInput, Notification};

#[tauri::command]
pub async fn create_notification(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    title: String,
    body: String,
    priority: String,
    category: Option<String>,
    project_id: Option<String>,
    action_url: Option<String>,
) -> Result<Notification, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = CreateNotificationInput {
        title: title.clone(),
        body: body.clone(),
        priority: priority.clone(),
        category,
        project_id,
        action_url,
    };
    let notification = db.create_notification(input).map_err(|e| e.to_string())?;
    db.prune_notifications(100).map_err(|e| e.to_string())?;

    if priority == "critical" {
        use tauri_plugin_notification::NotificationExt;
        let _ = app
            .notification()
            .builder()
            .title(&title)
            .body(&body)
            .show();
    }

    app.emit("notification:created", &notification)
        .map_err(|e| e.to_string())?;
    Ok(notification)
}

#[tauri::command]
pub async fn list_notifications(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<Vec<Notification>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_notifications().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mark_notification_read(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    notification_id: String,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.mark_notification_read(&notification_id)
        .map_err(|e| e.to_string())?;
    app.emit("notification:read", &notification_id)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn mark_all_notifications_read(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.mark_all_notifications_read()
        .map_err(|e| e.to_string())?;
    app.emit("notifications:all-read", ())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn clear_all_notifications(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.clear_all_notifications().map_err(|e| e.to_string())?;
    app.emit("notifications:cleared", ())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_unread_count(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<i64, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_unread_count().map_err(|e| e.to_string())
}
