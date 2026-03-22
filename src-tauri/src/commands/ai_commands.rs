use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

use crate::ai::gateway::AiGateway;
use crate::ai::prompts;
use crate::ai::types::{AiProviderConfig, CreateProviderInput, ModelInfo};
use crate::db::connection::Database;

#[tauri::command]
pub fn list_ai_providers(
    state: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<AiProviderConfig>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let gateway = AiGateway::new();
    gateway.list_providers(&db)
}

#[tauri::command]
pub fn add_ai_provider(
    input: CreateProviderInput,
    state: State<'_, Arc<Mutex<Database>>>,
    app: AppHandle,
) -> Result<AiProviderConfig, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let gateway = AiGateway::new();
    let config = gateway.create_provider(&db, input)?;
    let _ = app.emit("ai-provider-added", &config);
    Ok(config)
}

#[tauri::command]
pub fn remove_ai_provider(
    id: String,
    state: State<'_, Arc<Mutex<Database>>>,
    app: AppHandle,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let gateway = AiGateway::new();
    gateway.remove_provider(&db, &id)?;
    let _ = app.emit("ai-provider-removed", &id);
    Ok(())
}

#[tauri::command]
pub fn set_default_provider(
    id: String,
    state: State<'_, Arc<Mutex<Database>>>,
    app: AppHandle,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let gateway = AiGateway::new();
    gateway.set_default(&db, &id)?;
    let _ = app.emit("ai-provider-updated", &id);
    Ok(())
}

#[tauri::command]
pub async fn test_provider_connection(
    id: String,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
) -> Result<bool, String> {
    // Extract config while holding the lock, then drop it
    let config = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway.test_connection(&db, &id)?
    };

    let provider = gateway
        .build_provider(&config)
        .map_err(|e| e.to_string())?;

    provider.test_connection().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_provider_models(
    id: String,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
) -> Result<Vec<ModelInfo>, String> {
    // Extract config while holding the lock, then drop it
    let config = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway.list_models_for_provider(&db, &id)?
    };

    let provider = gateway
        .build_provider(&config)
        .map_err(|e| e.to_string())?;

    provider.list_models().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn ai_assist_task(
    task_id: String,
    app: AppHandle,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
) -> Result<(), String> {
    // Extract task and provider config synchronously, then drop the lock
    let (task, project_name, provider_config) = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        let task = db.get_task(&task_id).map_err(|e| e.to_string())?;
        let project_name = task
            .project_id
            .as_deref()
            .and_then(|pid| db.get_project(pid).map(|p| p.name).ok());
        let config = gateway
            .get_default_config(&db)
            .map_err(|e| e.to_string())?;
        (task, project_name, config)
    };

    let provider = gateway
        .build_provider(&provider_config)
        .map_err(|e| e.to_string())?;

    let request = prompts::build_scaffold_request(
        &task.title,
        project_name.as_deref(),
        &task.description,
        &task.context,
    );

    // Create channel for streaming
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(32);

    let app_clone = app.clone();

    // Spawn task to forward stream chunks to frontend
    let forwarder = tokio::spawn(async move {
        while let Some(chunk) = rx.recv().await {
            let _ = app_clone.emit("ai-stream-chunk", &chunk);
        }
    });

    // Run the streaming completion
    let result = provider.complete_stream(request, tx).await;

    // Wait for forwarder to finish
    let _ = forwarder.await;

    match result {
        Ok(response) => {
            let scaffold = prompts::parse_scaffold_response(&response.content)
                .map_err(|e| e.to_string())?;
            let _ = app.emit("ai-stream-complete", &scaffold);
            Ok(())
        }
        Err(e) => {
            let error_msg = e.to_string();
            let _ = app.emit("ai-stream-error", &error_msg);
            Err(error_msg)
        }
    }
}
