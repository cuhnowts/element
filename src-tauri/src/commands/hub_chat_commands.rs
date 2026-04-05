use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

use crate::ai::gateway::AiGateway;
use crate::ai::types::{ChatMessage, ChatRequest, ToolDefinition};
use crate::db::connection::Database;

/// Managed state for hub chat cancellation
pub struct HubChatCancelFlag(pub Arc<AtomicBool>);

#[tauri::command]
pub async fn hub_chat_send(
    messages: Vec<ChatMessage>,
    system_prompt: String,
    tools: Option<Vec<ToolDefinition>>,
    app: AppHandle,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
    cancel_flag: State<'_, HubChatCancelFlag>,
) -> Result<(), String> {
    // Reset cancel flag at start
    cancel_flag.0.store(false, Ordering::SeqCst);

    let provider = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway
            .get_default_provider(&db)
            .map_err(|e| e.to_string())?
    };

    let request = ChatRequest {
        system_prompt,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
        tools,
    };

    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(32);

    let app_clone = app.clone();
    let flag = cancel_flag.0.clone();

    // Forwarder checks cancel flag on each chunk
    let forwarder = tokio::spawn(async move {
        while let Some(chunk) = rx.recv().await {
            if flag.load(Ordering::SeqCst) {
                break;
            }
            let _ = app_clone.emit("hub-chat-stream-chunk", &chunk);
        }
    });

    let result = provider.chat_stream(request, tx).await;
    let _ = forwarder.await;

    // Check if cancelled
    if cancel_flag.0.load(Ordering::SeqCst) {
        let _ = app.emit("hub-chat-stream-done", ());
        return Ok(());
    }

    match result {
        Ok(_response) => {
            let _ = app.emit("hub-chat-stream-done", ());
            Ok(())
        }
        Err(e) => {
            let error_msg = e.to_string();
            let _ = app.emit("hub-chat-stream-error", &error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub fn hub_chat_stop(cancel_flag: State<'_, HubChatCancelFlag>) -> Result<(), String> {
    cancel_flag.0.store(true, Ordering::SeqCst);
    Ok(())
}
