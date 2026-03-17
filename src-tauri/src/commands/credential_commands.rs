use tauri::{AppHandle, Emitter, State};

use crate::credentials::{Credential, CredentialManager};

#[tauri::command]
pub async fn list_credentials(
    state: State<'_, std::sync::Mutex<CredentialManager>>,
) -> Result<Vec<Credential>, String> {
    let mgr = state.lock().map_err(|e| e.to_string())?;
    mgr.list()
}

#[tauri::command]
pub async fn create_credential(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<CredentialManager>>,
    name: String,
    credential_type: String,
    value: String,
    notes: Option<String>,
) -> Result<Credential, String> {
    let mgr = state.lock().map_err(|e| e.to_string())?;
    let cred = mgr.create(&name, &credential_type, &value, &notes.unwrap_or_default())?;
    app.emit("credential-created", &cred)
        .map_err(|e| e.to_string())?;
    Ok(cred)
}

#[tauri::command]
pub async fn get_credential_secret(
    state: State<'_, std::sync::Mutex<CredentialManager>>,
    id: String,
) -> Result<String, String> {
    let mgr = state.lock().map_err(|e| e.to_string())?;
    mgr.get_secret(&id)
}

#[tauri::command]
pub async fn update_credential(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<CredentialManager>>,
    id: String,
    name: Option<String>,
    credential_type: Option<String>,
    notes: Option<String>,
    value: Option<String>,
) -> Result<Credential, String> {
    let mgr = state.lock().map_err(|e| e.to_string())?;
    let cred = mgr.update(
        &id,
        name.as_deref(),
        credential_type.as_deref(),
        notes.as_deref(),
        value.as_deref(),
    )?;
    app.emit("credential-updated", &cred)
        .map_err(|e| e.to_string())?;
    Ok(cred)
}

#[tauri::command]
pub async fn delete_credential(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<CredentialManager>>,
    id: String,
) -> Result<(), String> {
    let mgr = state.lock().map_err(|e| e.to_string())?;
    mgr.delete(&id)?;
    app.emit("credential-deleted", &id)
        .map_err(|e| e.to_string())?;
    Ok(())
}
