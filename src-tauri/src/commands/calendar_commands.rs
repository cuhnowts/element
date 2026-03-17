use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::credentials::CredentialManager;
use crate::db::connection::Database;
use crate::plugins::core::calendar::{
    self, CalendarAccount, CalendarEvent,
};

#[tauri::command]
pub async fn list_calendar_accounts(
    state: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<CalendarAccount>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    calendar::list_calendar_accounts(db.conn()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn connect_google_calendar(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
    cred_state: State<'_, Mutex<CredentialManager>>,
) -> Result<CalendarAccount, String> {
    // Generate PKCE
    let code_verifier = calendar::generate_code_verifier();
    let code_challenge = calendar::compute_code_challenge(&code_verifier);

    // Start OAuth localhost server via tauri-plugin-oauth with a oneshot channel
    let (tx, rx) = tokio::sync::oneshot::channel::<String>();
    let tx = std::sync::Mutex::new(Some(tx));

    let port = tauri_plugin_oauth::start_with_config(
        tauri_plugin_oauth::OauthConfig::default(),
        move |url| {
            if let Some(tx) = tx.lock().unwrap().take() {
                let _ = tx.send(url);
            }
        },
    )
    .map_err(|e| format!("Failed to start OAuth server: {}", e))?;

    // Build Google OAuth URL and open in system browser
    let auth_url = calendar::build_google_auth_url(port, &code_challenge);
    open::that(&auth_url).map_err(|e| format!("Failed to open browser: {}", e))?;

    // Wait for callback with auth code (or timeout)
    let callback_url = tokio::time::timeout(
        std::time::Duration::from_secs(300),
        rx,
    )
    .await
    .map_err(|_| "OAuth flow timed out after 5 minutes".to_string())?
    .map_err(|_| "OAuth callback channel closed".to_string())?;

    // Extract the authorization code from the callback URL
    let parsed = url::Url::parse(&callback_url)
        .map_err(|e| format!("Failed to parse callback URL: {}", e))?;
    let auth_code = parsed
        .query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.to_string())
        .ok_or_else(|| "No authorization code in callback URL".to_string())?;

    // Exchange code for tokens
    let client = reqwest::Client::new();
    let token_resp = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", calendar::GOOGLE_CLIENT_ID_STR),
            ("code", &auth_code),
            ("code_verifier", &code_verifier),
            ("grant_type", "authorization_code"),
            ("redirect_uri", &format!("http://localhost:{}/callback", port)),
        ])
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {}", e))?;

    let token_json: serde_json::Value = token_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let refresh_token = token_json
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "No refresh_token in response".to_string())?;

    let access_token = token_json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "No access_token in response".to_string())?;

    // Get user email from Google
    let userinfo: serde_json::Value = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to get user info: {}", e))?
        .json()
        .await
        .map_err(|e| format!("Failed to parse user info: {}", e))?;

    let email = userinfo
        .get("email")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown@google.com")
        .to_string();

    let display_name = userinfo
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Google Calendar")
        .to_string();

    // Store refresh token in credential vault
    let cred_mgr = cred_state.lock().map_err(|e| e.to_string())?;
    let credential = cred_mgr
        .create(
            &format!("google-calendar-{}", &email),
            "oauth_token",
            refresh_token,
            "Google Calendar OAuth refresh token",
        )
        .map_err(|e| e)?;
    drop(cred_mgr);

    // Determine next color_index
    let db = state.lock().map_err(|e| e.to_string())?;
    let existing = calendar::list_calendar_accounts(db.conn()).map_err(|e| e.to_string())?;
    let color_index = existing.len() as i32;

    let now = chrono::Utc::now().to_rfc3339();
    let account = CalendarAccount {
        id: uuid::Uuid::new_v4().to_string(),
        provider: "google".to_string(),
        email,
        display_name,
        credential_id: credential.id,
        sync_token: None,
        last_synced_at: None,
        color_index,
        enabled: true,
        created_at: now,
    };

    calendar::save_calendar_account(db.conn(), &account).map_err(|e| e.to_string())?;

    app.emit("calendar-connected", &account)
        .map_err(|e| e.to_string())?;

    Ok(account)
}

#[tauri::command]
pub async fn connect_outlook_calendar(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
    cred_state: State<'_, Mutex<CredentialManager>>,
) -> Result<CalendarAccount, String> {
    // Generate PKCE
    let code_verifier = calendar::generate_code_verifier();
    let code_challenge = calendar::compute_code_challenge(&code_verifier);

    // Start OAuth localhost server
    let (tx, rx) = tokio::sync::oneshot::channel::<String>();
    let tx = std::sync::Mutex::new(Some(tx));

    let port = tauri_plugin_oauth::start_with_config(
        tauri_plugin_oauth::OauthConfig::default(),
        move |url| {
            if let Some(tx) = tx.lock().unwrap().take() {
                let _ = tx.send(url);
            }
        },
    )
    .map_err(|e| format!("Failed to start OAuth server: {}", e))?;

    let auth_url = calendar::build_outlook_auth_url(port, &code_challenge);
    open::that(&auth_url).map_err(|e| format!("Failed to open browser: {}", e))?;

    // Wait for callback
    let callback_url = tokio::time::timeout(
        std::time::Duration::from_secs(300),
        rx,
    )
    .await
    .map_err(|_| "OAuth flow timed out after 5 minutes".to_string())?
    .map_err(|_| "OAuth callback channel closed".to_string())?;

    let parsed = url::Url::parse(&callback_url)
        .map_err(|e| format!("Failed to parse callback URL: {}", e))?;
    let auth_code = parsed
        .query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.to_string())
        .ok_or_else(|| "No authorization code in callback URL".to_string())?;

    // Exchange code for tokens
    let client = reqwest::Client::new();
    let token_resp = client
        .post("https://login.microsoftonline.com/common/oauth2/v2.0/token")
        .form(&[
            ("client_id", calendar::MICROSOFT_CLIENT_ID_STR),
            ("code", &auth_code),
            ("code_verifier", &code_verifier),
            ("grant_type", "authorization_code"),
            ("redirect_uri", &format!("http://localhost:{}/callback", port)),
            ("scope", "https://graph.microsoft.com/Calendars.Read offline_access"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {}", e))?;

    let token_json: serde_json::Value = token_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let refresh_token = token_json
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "No refresh_token in response".to_string())?;

    let access_token = token_json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "No access_token in response".to_string())?;

    // Get user info from Microsoft Graph
    let userinfo: serde_json::Value = client
        .get("https://graph.microsoft.com/v1.0/me")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to get user info: {}", e))?
        .json()
        .await
        .map_err(|e| format!("Failed to parse user info: {}", e))?;

    let email = userinfo
        .get("mail")
        .or_else(|| userinfo.get("userPrincipalName"))
        .and_then(|v| v.as_str())
        .unwrap_or("unknown@outlook.com")
        .to_string();

    let display_name = userinfo
        .get("displayName")
        .and_then(|v| v.as_str())
        .unwrap_or("Outlook Calendar")
        .to_string();

    // Store refresh token
    let cred_mgr = cred_state.lock().map_err(|e| e.to_string())?;
    let credential = cred_mgr
        .create(
            &format!("outlook-calendar-{}", &email),
            "oauth_token",
            refresh_token,
            "Outlook Calendar OAuth refresh token",
        )
        .map_err(|e| e)?;
    drop(cred_mgr);

    let db = state.lock().map_err(|e| e.to_string())?;
    let existing = calendar::list_calendar_accounts(db.conn()).map_err(|e| e.to_string())?;
    let color_index = existing.len() as i32;

    let now = chrono::Utc::now().to_rfc3339();
    let account = CalendarAccount {
        id: uuid::Uuid::new_v4().to_string(),
        provider: "outlook".to_string(),
        email,
        display_name,
        credential_id: credential.id,
        sync_token: None,
        last_synced_at: None,
        color_index,
        enabled: true,
        created_at: now,
    };

    calendar::save_calendar_account(db.conn(), &account).map_err(|e| e.to_string())?;

    app.emit("calendar-connected", &account)
        .map_err(|e| e.to_string())?;

    Ok(account)
}

#[tauri::command]
pub async fn sync_calendar(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
    cred_state: State<'_, Mutex<CredentialManager>>,
    account_id: String,
) -> Result<(), String> {
    let account = {
        let db = state.lock().map_err(|e| e.to_string())?;
        let accounts =
            calendar::list_calendar_accounts(db.conn()).map_err(|e| e.to_string())?;
        accounts
            .into_iter()
            .find(|a| a.id == account_id)
            .ok_or_else(|| format!("Account not found: {}", account_id))?
    };

    let refresh_token = {
        let cred_mgr = cred_state.lock().map_err(|e| e.to_string())?;
        cred_mgr.get_secret(&account.credential_id)?
    };

    let client = reqwest::Client::new();

    let (access_token, new_refresh) = match account.provider.as_str() {
        "google" => calendar::refresh_google_token(&client, &refresh_token)
            .await
            .map_err(|e| e.to_string())?,
        "outlook" => calendar::refresh_outlook_token(&client, &refresh_token)
            .await
            .map_err(|e| e.to_string())?,
        other => return Err(format!("Unknown provider: {}", other)),
    };

    if let Some(ref new_rt) = new_refresh {
        let cred_mgr = cred_state.lock().map_err(|e| e.to_string())?;
        cred_mgr
            .update(&account.credential_id, None, None, None, Some(new_rt))
            .map_err(|e| e)?;
    }

    let (mut events, next_token) = match account.provider.as_str() {
        "google" => calendar::sync_google_calendar(
            &client,
            &access_token,
            "primary",
            account.sync_token.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())?,
        "outlook" => calendar::sync_outlook_calendar(
            &client,
            &access_token,
            account.sync_token.as_deref(),
        )
        .await
        .map_err(|e| e.to_string())?,
        _ => unreachable!(),
    };

    for event in &mut events {
        event.account_id = account.id.clone();
    }

    let db = state.lock().map_err(|e| e.to_string())?;
    calendar::save_events(db.conn(), &events).map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    calendar::update_sync_token(db.conn(), &account.id, next_token.as_deref(), &now)
        .map_err(|e| e.to_string())?;

    app.emit("calendar-synced", ())
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn sync_all_calendars(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
    cred_state: State<'_, Mutex<CredentialManager>>,
) -> Result<(), String> {
    let accounts = {
        let db = state.lock().map_err(|e| e.to_string())?;
        calendar::list_calendar_accounts(db.conn()).map_err(|e| e.to_string())?
    };

    for account in accounts.iter().filter(|a| a.enabled) {
        let refresh_token = {
            let cred_mgr = cred_state.lock().map_err(|e| e.to_string())?;
            match cred_mgr.get_secret(&account.credential_id) {
                Ok(token) => token,
                Err(e) => {
                    eprintln!("Failed to get token for {}: {}", account.email, e);
                    continue;
                }
            }
        };

        let client = reqwest::Client::new();
        let token_result = match account.provider.as_str() {
            "google" => calendar::refresh_google_token(&client, &refresh_token).await,
            "outlook" => calendar::refresh_outlook_token(&client, &refresh_token).await,
            _ => continue,
        };

        let (access_token, new_refresh) = match token_result {
            Ok(r) => r,
            Err(e) => {
                eprintln!("Token refresh failed for {}: {}", account.email, e);
                continue;
            }
        };

        if let Some(ref new_rt) = new_refresh {
            let cred_mgr = cred_state.lock().map_err(|e| e.to_string())?;
            let _ = cred_mgr.update(&account.credential_id, None, None, None, Some(new_rt));
        }

        let sync_result = match account.provider.as_str() {
            "google" => {
                calendar::sync_google_calendar(
                    &client,
                    &access_token,
                    "primary",
                    account.sync_token.as_deref(),
                )
                .await
            }
            "outlook" => {
                calendar::sync_outlook_calendar(
                    &client,
                    &access_token,
                    account.sync_token.as_deref(),
                )
                .await
            }
            _ => continue,
        };

        if let Ok((mut events, next_token)) = sync_result {
            for event in &mut events {
                event.account_id = account.id.clone();
            }
            let db = state.lock().map_err(|e| e.to_string())?;
            let _ = calendar::save_events(db.conn(), &events);
            let now = chrono::Utc::now().to_rfc3339();
            let _ = calendar::update_sync_token(
                db.conn(),
                &account.id,
                next_token.as_deref(),
                &now,
            );
        }
    }

    app.emit("calendar-synced", ())
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn disconnect_calendar(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
    cred_state: State<'_, Mutex<CredentialManager>>,
    account_id: String,
) -> Result<(), String> {
    let credential_id = {
        let db = state.lock().map_err(|e| e.to_string())?;
        let accounts =
            calendar::list_calendar_accounts(db.conn()).map_err(|e| e.to_string())?;
        accounts
            .iter()
            .find(|a| a.id == account_id)
            .map(|a| a.credential_id.clone())
            .ok_or_else(|| format!("Account not found: {}", account_id))?
    };

    {
        let cred_mgr = cred_state.lock().map_err(|e| e.to_string())?;
        cred_mgr.delete(&credential_id).map_err(|e| e)?;
    }

    let db = state.lock().map_err(|e| e.to_string())?;
    calendar::delete_calendar_account(db.conn(), &account_id).map_err(|e| e.to_string())?;

    app.emit("calendar-disconnected", &account_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn list_calendar_events(
    state: State<'_, Arc<Mutex<Database>>>,
    start: String,
    end: String,
) -> Result<Vec<CalendarEvent>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    calendar::list_events_for_range(db.conn(), &start, &end).map_err(|e| e.to_string())
}
