use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::sync::Mutex;

use tauri::{AppHandle, State};

use crate::db::connection::Database;
use crate::heartbeat::types::HeartbeatConfig;
use crate::heartbeat::HeartbeatState;

/// Get the current heartbeat configuration from app_settings.
#[tauri::command]
pub async fn get_heartbeat_config(
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<HeartbeatConfig, String> {
    let db = db_state.lock().map_err(|e| e.to_string())?;

    let enabled = db
        .get_app_setting("heartbeat_enabled")
        .map_err(|e| e.to_string())?
        .map(|v| v != "false")
        .unwrap_or(true);

    let interval_minutes = db
        .get_app_setting("heartbeat_interval_minutes")
        .map_err(|e| e.to_string())?
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(30);

    let provider_id = db
        .get_app_setting("heartbeat_provider_id")
        .map_err(|e| e.to_string())?;

    Ok(HeartbeatConfig {
        enabled,
        interval_minutes,
        provider_id,
    })
}

/// Update the heartbeat configuration in app_settings.
#[tauri::command]
pub async fn set_heartbeat_config(
    config: HeartbeatConfig,
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db = db_state.lock().map_err(|e| e.to_string())?;

    db.set_app_setting("heartbeat_enabled", &config.enabled.to_string())
        .map_err(|e| e.to_string())?;
    db.set_app_setting(
        "heartbeat_interval_minutes",
        &config.interval_minutes.to_string(),
    )
    .map_err(|e| e.to_string())?;

    match &config.provider_id {
        Some(id) => {
            db.set_app_setting("heartbeat_provider_id", id)
                .map_err(|e| e.to_string())?;
        }
        None => {
            // Clear provider_id by setting to empty string
            db.set_app_setting("heartbeat_provider_id", "")
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Manually trigger a heartbeat tick (for testing and "check now" button).
#[tauri::command]
pub async fn trigger_heartbeat(app: AppHandle) -> Result<(), String> {
    crate::heartbeat::run_heartbeat_tick(&app).await
}

/// Get the current heartbeat status (running flag + latest assessment).
#[tauri::command]
pub async fn get_heartbeat_status(
    state: State<'_, HeartbeatState>,
) -> Result<serde_json::Value, String> {
    let running = state.running.load(Ordering::SeqCst);
    let assessment = state
        .latest_assessment
        .lock()
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "running": running,
        "latest_assessment": *assessment,
    }))
}
