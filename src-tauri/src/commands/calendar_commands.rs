use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::credentials::CredentialManager;
use crate::db::connection::Database;
use crate::plugins::core::calendar::{
    self, CalendarAccount, CalendarError, CalendarEvent,
};

/// Resolve Google client ID: app setting > compile-time env > placeholder.
fn resolve_google_client_id(db: &Database) -> String {
    db.get_app_setting("google_client_id")
        .ok()
        .flatten()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| calendar::GOOGLE_CLIENT_ID_STR.to_string())
}

/// Resolve Microsoft client ID: app setting > compile-time env > placeholder.
fn resolve_microsoft_client_id(db: &Database) -> String {
    db.get_app_setting("microsoft_client_id")
        .ok()
        .flatten()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| calendar::MICROSOFT_CLIENT_ID_STR.to_string())
}

/// Per-account sync helper -- reusable by sync_all_if_stale and post-connect triggers.
/// Uses AppHandle to resolve state internally, avoiding Send issues across await points.
/// Returns the number of events synced on success.
pub async fn sync_calendar_for_account(
    app: &AppHandle,
    account_id: &str,
) -> Result<usize, String> {
    use tauri::Manager;

    let db_arc = app.state::<Arc<Mutex<Database>>>().inner().clone();

    let account = {
        let db = db_arc.lock().map_err(|e| e.to_string())?;
        let accounts =
            calendar::list_calendar_accounts(db.conn()).map_err(|e| e.to_string())?;
        accounts
            .into_iter()
            .find(|a| a.id == account_id)
            .ok_or_else(|| format!("Account not found: {}", account_id))?
    };

    let refresh_token = {
        let cred_mgr_state = app.state::<Mutex<CredentialManager>>();
        let cred_mgr = cred_mgr_state.lock().map_err(|e| e.to_string())?;
        cred_mgr.get_secret(&account.credential_id)?
    };

    let client = reqwest::Client::new();

    // Resolve runtime client IDs for token refresh
    let google_cid = {
        let db = db_arc.lock().map_err(|e| e.to_string())?;
        resolve_google_client_id(&db)
    };

    // Token refresh with TokenRevoked detection (D-01)
    let refresh_result = match account.provider.as_str() {
        "google" => calendar::refresh_google_token_with_id(&client, &refresh_token, &google_cid).await,
        "outlook" => calendar::refresh_outlook_token(&client, &refresh_token).await,
        other => return Err(format!("Unknown provider: {}", other)),
    };

    let (access_token, new_refresh) = match refresh_result {
        Ok(r) => r,
        Err(CalendarError::TokenRevoked(msg)) => {
            let db = db_arc.lock().map_err(|e| e.to_string())?;
            calendar::disable_calendar_account(db.conn(), account_id)
                .map_err(|e| e.to_string())?;
            drop(db);
            let _ = app.emit("calendar-account-disabled", account_id);
            return Err(format!("Calendar account disabled -- token revoked: {}", msg));
        }
        Err(e) => return Err(e.to_string()),
    };

    if let Some(ref new_rt) = new_refresh {
        let cred_mgr_state = app.state::<Mutex<CredentialManager>>();
        let cred_mgr = cred_mgr_state.lock().map_err(|e| e.to_string())?;
        cred_mgr
            .update(&account.credential_id, None, None, None, Some(new_rt))
            .map_err(|e| e)?;
    }

    // Sync events
    let sync_result = match account.provider.as_str() {
        "google" => calendar::sync_google_calendar(
            &client,
            &access_token,
            "primary",
            account.sync_token.as_deref(),
        )
        .await,
        "outlook" => calendar::sync_outlook_calendar(
            &client,
            &access_token,
            account.sync_token.as_deref(),
        )
        .await,
        _ => unreachable!(),
    };

    match sync_result {
        Ok((mut events, next_token)) => {
            for event in &mut events {
                event.account_id = account.id.clone();
            }
            let (cancelled, active): (Vec<_>, Vec<_>) =
                events.into_iter().partition(|e| e.status == "cancelled");
            let db = db_arc.lock().map_err(|e| e.to_string())?;
            if !cancelled.is_empty() {
                let ids: Vec<String> = cancelled.iter().map(|e| e.id.clone()).collect();
                let _ = calendar::delete_events_by_ids(db.conn(), &ids, account_id);
            }
            let count = calendar::save_events(db.conn(), &active).map_err(|e| e.to_string())?;
            let now = chrono::Utc::now().to_rfc3339();
            calendar::update_sync_token(db.conn(), &account.id, next_token.as_deref(), &now)
                .map_err(|e| e.to_string())?;
            Ok(count)
        }
        Err(CalendarError::SyncTokenExpired) => {
            {
                let db = db_arc.lock().map_err(|e| e.to_string())?;
                calendar::update_sync_token(
                    db.conn(),
                    account_id,
                    None,
                    &chrono::Utc::now().to_rfc3339(),
                )
                .map_err(|e| e.to_string())?;
            }
            let retry_result = match account.provider.as_str() {
                "google" => {
                    calendar::sync_google_calendar(&client, &access_token, "primary", None).await
                }
                "outlook" => {
                    calendar::sync_outlook_calendar(&client, &access_token, None).await
                }
                _ => unreachable!(),
            };
            match retry_result {
                Ok((mut events, next_token)) => {
                    for event in &mut events {
                        event.account_id = account.id.clone();
                    }
                    let (cancelled, active): (Vec<_>, Vec<_>) =
                        events.into_iter().partition(|e| e.status == "cancelled");
                    let db = db_arc.lock().map_err(|e| e.to_string())?;
                    if !cancelled.is_empty() {
                        let ids: Vec<String> = cancelled.iter().map(|e| e.id.clone()).collect();
                        let _ = calendar::delete_events_by_ids(db.conn(), &ids, account_id);
                    }
                    let count = calendar::save_events(db.conn(), &active).map_err(|e| e.to_string())?;
                    let now = chrono::Utc::now().to_rfc3339();
                    calendar::update_sync_token(
                        db.conn(),
                        &account.id,
                        next_token.as_deref(),
                        &now,
                    )
                    .map_err(|e| e.to_string())?;
                    Ok(count)
                }
                Err(e) => Err(format!("Retry after sync token expired failed: {}", e)),
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

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
    // Resolve client ID from app settings or compile-time env
    let google_client_id = {
        let db = state.lock().map_err(|e| e.to_string())?;
        resolve_google_client_id(&db)
    };

    if google_client_id.contains("placeholder") {
        // Open the setup page directly
        let _ = open::that("https://console.cloud.google.com/apis/credentials");
        return Err(
            "Google Calendar needs a one-time setup. A browser tab opened to Google Cloud Console. \
             Create an OAuth 2.0 Client ID (Desktop app type), then add it to your .env file as \
             GOOGLE_CLIENT_ID=your-id and restart Element.".to_string()
        );
    }

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
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
         client_id={}&\
         redirect_uri=http://localhost:{}/callback&\
         response_type=code&\
         scope=https://www.googleapis.com/auth/calendar.readonly&\
         code_challenge={}&\
         code_challenge_method=S256&\
         access_type=offline&\
         prompt=consent",
        google_client_id, port, code_challenge
    );
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
            ("client_id", google_client_id.as_str()),
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
    drop(db); // Release lock before sync_calendar_for_account

    app.emit("calendar-connected", &account)
        .map_err(|e| e.to_string())?;

    // D-05: Trigger initial sync after OAuth connect/reconnect (spawned to avoid Send issues)
    {
        let app_clone = app.clone();
        let account_id = account.id.clone();
        let email = account.email.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(e) = sync_calendar_for_account(&app_clone, &account_id).await {
                eprintln!("Post-connect sync failed for Google account {}: {}", email, e);
                // Non-fatal -- account is connected, sync will happen on next interval
            }
        });
    }

    Ok(account)
}

#[tauri::command]
pub async fn connect_outlook_calendar(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
    cred_state: State<'_, Mutex<CredentialManager>>,
) -> Result<CalendarAccount, String> {
    // Resolve client ID from app settings or compile-time env
    let microsoft_client_id = {
        let db = state.lock().map_err(|e| e.to_string())?;
        resolve_microsoft_client_id(&db)
    };

    if microsoft_client_id.contains("placeholder") {
        let _ = open::that("https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps");
        return Err(
            "Outlook Calendar needs a one-time setup. A browser tab opened to Azure Portal. \
             Register an app (Personal accounts, Mobile/Desktop platform, http://localhost redirect), \
             then add the Application ID to your .env file as MICROSOFT_CLIENT_ID=your-id and restart Element.".to_string()
        );
    }

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

    let auth_url = format!(
        "https://login.microsoftonline.com/common/oauth2/v2/authorize?\
         client_id={}&\
         redirect_uri=http://localhost:{}/callback&\
         response_type=code&\
         scope=https://graph.microsoft.com/Calendars.Read offline_access&\
         code_challenge={}&\
         code_challenge_method=S256",
        microsoft_client_id, port, code_challenge
    );
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
            ("client_id", microsoft_client_id.as_str()),
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
    drop(db); // Release lock before sync_calendar_for_account

    app.emit("calendar-connected", &account)
        .map_err(|e| e.to_string())?;

    // D-05: Trigger initial sync after OAuth connect/reconnect (spawned to avoid Send issues)
    {
        let app_clone = app.clone();
        let account_id = account.id.clone();
        let email = account.email.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(e) = sync_calendar_for_account(&app_clone, &account_id).await {
                eprintln!("Post-connect sync failed for Outlook account {}: {}", email, e);
                // Non-fatal -- account is connected, sync will happen on next interval
            }
        });
    }

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

    // Token refresh with TokenRevoked detection (D-01)
    let refresh_result = match account.provider.as_str() {
        "google" => calendar::refresh_google_token(&client, &refresh_token).await,
        "outlook" => calendar::refresh_outlook_token(&client, &refresh_token).await,
        other => return Err(format!("Unknown provider: {}", other)),
    };

    let (access_token, new_refresh) = match refresh_result {
        Ok(r) => r,
        Err(CalendarError::TokenRevoked(msg)) => {
            // D-01: Disable the account, emit event for UI badge
            let db = state.lock().map_err(|e| e.to_string())?;
            calendar::disable_calendar_account(db.conn(), &account_id)
                .map_err(|e| e.to_string())?;
            drop(db);
            let _ = app.emit("calendar-account-disabled", &account_id);
            return Err(format!("Calendar account disabled -- token revoked: {}", msg));
        }
        Err(e) => return Err(e.to_string()),
    };

    if let Some(ref new_rt) = new_refresh {
        let cred_mgr = cred_state.lock().map_err(|e| e.to_string())?;
        cred_mgr
            .update(&account.credential_id, None, None, None, Some(new_rt))
            .map_err(|e| e)?;
    }

    // Sync events with SyncTokenExpired and TokenRevoked handling
    let sync_result = match account.provider.as_str() {
        "google" => calendar::sync_google_calendar(
            &client,
            &access_token,
            "primary",
            account.sync_token.as_deref(),
        )
        .await,
        "outlook" => calendar::sync_outlook_calendar(
            &client,
            &access_token,
            account.sync_token.as_deref(),
        )
        .await,
        _ => unreachable!(),
    };

    match sync_result {
        Ok((mut events, next_token)) => {
            for event in &mut events {
                event.account_id = account.id.clone();
            }
            // D-07: Hard-delete cancelled events
            let (cancelled, active): (Vec<_>, Vec<_>) =
                events.into_iter().partition(|e| e.status == "cancelled");
            let db = state.lock().map_err(|e| e.to_string())?;
            if !cancelled.is_empty() {
                let ids: Vec<String> = cancelled.iter().map(|e| e.id.clone()).collect();
                let _ = calendar::delete_events_by_ids(db.conn(), &ids, &account_id);
            }
            calendar::save_events(db.conn(), &active).map_err(|e| e.to_string())?;
            let now = chrono::Utc::now().to_rfc3339();
            calendar::update_sync_token(db.conn(), &account.id, next_token.as_deref(), &now)
                .map_err(|e| e.to_string())?;
        }
        Err(CalendarError::SyncTokenExpired) => {
            // D-03: Clear sync token and retry as full sync
            {
                let db = state.lock().map_err(|e| e.to_string())?;
                calendar::update_sync_token(
                    db.conn(),
                    &account_id,
                    None,
                    &chrono::Utc::now().to_rfc3339(),
                )
                .map_err(|e| e.to_string())?;
            }
            // Retry with no sync token (full sync)
            let retry_result = match account.provider.as_str() {
                "google" => {
                    calendar::sync_google_calendar(&client, &access_token, "primary", None).await
                }
                _ => return Err("SyncTokenExpired only applies to Google".to_string()),
            };
            match retry_result {
                Ok((mut events, next_token)) => {
                    for event in &mut events {
                        event.account_id = account.id.clone();
                    }
                    let (cancelled, active): (Vec<_>, Vec<_>) =
                        events.into_iter().partition(|e| e.status == "cancelled");
                    let db = state.lock().map_err(|e| e.to_string())?;
                    if !cancelled.is_empty() {
                        let ids: Vec<String> = cancelled.iter().map(|e| e.id.clone()).collect();
                        let _ = calendar::delete_events_by_ids(db.conn(), &ids, &account_id);
                    }
                    let count =
                        calendar::save_events(db.conn(), &active).map_err(|e| e.to_string())?;
                    let now = chrono::Utc::now().to_rfc3339();
                    calendar::update_sync_token(
                        db.conn(),
                        &account.id,
                        next_token.as_deref(),
                        &now,
                    )
                    .map_err(|e| e.to_string())?;
                }
                Err(e) => return Err(format!("Retry after 410 failed: {}", e)),
            }
        }
        Err(e) => return Err(e.to_string()),
    }

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
            Err(CalendarError::TokenRevoked(msg)) => {
                // D-01: Disable account on permanent auth failure
                if let Ok(db) = state.lock() {
                    let _ = calendar::disable_calendar_account(db.conn(), &account.id);
                }
                let _ = app.emit("calendar-account-disabled", &account.id);
                eprintln!("Token revoked for {}: {} -- account disabled", account.email, msg);
                continue;
            }
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

        match sync_result {
            Ok((mut events, next_token)) => {
                for event in &mut events {
                    event.account_id = account.id.clone();
                }
                // D-07: Hard-delete cancelled events
                let (cancelled, active): (Vec<_>, Vec<_>) =
                    events.into_iter().partition(|e| e.status == "cancelled");
                let db = state.lock().map_err(|e| e.to_string())?;
                if !cancelled.is_empty() {
                    let ids: Vec<String> = cancelled.iter().map(|e| e.id.clone()).collect();
                    let _ = calendar::delete_events_by_ids(db.conn(), &ids, &account.id);
                }
                let _ = calendar::save_events(db.conn(), &active);
                let now = chrono::Utc::now().to_rfc3339();
                let _ = calendar::update_sync_token(
                    db.conn(),
                    &account.id,
                    next_token.as_deref(),
                    &now,
                );
            }
            Err(CalendarError::SyncTokenExpired) => {
                // D-03: Clear sync token, will do full sync next interval
                if let Ok(db) = state.lock() {
                    let now = chrono::Utc::now().to_rfc3339();
                    let _ = calendar::update_sync_token(db.conn(), &account.id, None, &now);
                }
                eprintln!(
                    "Sync token expired for {} -- will retry as full sync",
                    account.email
                );
            }
            Err(e) => {
                // D-06: Transient errors silently logged
                eprintln!("Sync failed for {}: {}", account.email, e);
            }
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

/// Debounced sync for Hub focus and manual refresh triggers.
/// Only syncs accounts that haven't been synced within the debounce window.
#[tauri::command]
pub async fn sync_all_if_stale(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
) -> Result<String, String> {
    let stale_account_ids = {
        let db_lock = state.lock().map_err(|e| e.to_string())?;
        calendar::list_calendar_accounts(db_lock.conn())
            .map_err(|e| e.to_string())?
            .into_iter()
            .filter(|a| a.enabled)
            .filter(|a| calendar::should_sync(a.last_synced_at.as_deref()))
            .map(|a| a.id)
            .collect::<Vec<_>>()
    };

    if stale_account_ids.is_empty() {
        return Ok("All accounts recently synced -- skipped".to_string());
    }

    // Trigger the existing sync flow for stale accounts only
    let mut synced = 0;
    for account_id in &stale_account_ids {
        match sync_calendar_for_account(&app, account_id).await {
            Ok(_) => synced += 1,
            Err(e) => eprintln!("Debounced sync failed for {}: {}", account_id, e),
        }
    }

    if synced > 0 {
        let _ = app.emit("calendar-synced", ());
    }

    Ok(format!("Synced {} accounts", synced))
}
