use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use crate::credentials::keychain::SecretStore;
use crate::db::connection::Database;

// Embedded OAuth client IDs -- users register their own OAuth apps.
// Use option_env! so CI/dev builds compile without real credentials.
pub const GOOGLE_CLIENT_ID_STR: &str = match option_env!("GOOGLE_CLIENT_ID") {
    Some(id) => id,
    None => "placeholder-google-client-id.apps.googleusercontent.com",
};

pub const MICROSOFT_CLIENT_ID_STR: &str = match option_env!("MICROSOFT_CLIENT_ID") {
    Some(id) => id,
    None => "placeholder-microsoft-client-id",
};

// ─── Error types ──────────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum CalendarError {
    OAuthError(String),
    ApiError(String),
    DbError(String),
    CredentialError(String),
    SyncTokenExpired,         // Google 410 Gone -- sync token invalidated
    TokenRevoked(String),     // invalid_grant -- permanent auth failure
}

impl std::fmt::Display for CalendarError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CalendarError::OAuthError(msg) => write!(f, "OAuth error: {}", msg),
            CalendarError::ApiError(msg) => write!(f, "API error: {}", msg),
            CalendarError::DbError(msg) => write!(f, "Database error: {}", msg),
            CalendarError::CredentialError(msg) => write!(f, "Credential error: {}", msg),
            CalendarError::SyncTokenExpired => write!(f, "Sync token expired (410 Gone)"),
            CalendarError::TokenRevoked(msg) => write!(f, "Token revoked: {}", msg),
        }
    }
}

impl From<rusqlite::Error> for CalendarError {
    fn from(e: rusqlite::Error) -> Self {
        CalendarError::DbError(e.to_string())
    }
}

impl From<reqwest::Error> for CalendarError {
    fn from(e: reqwest::Error) -> Self {
        CalendarError::ApiError(e.to_string())
    }
}

// ─── Data models ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CalendarAccount {
    pub id: String,
    pub provider: String,
    pub email: String,
    pub display_name: String,
    pub credential_id: String,
    pub sync_token: Option<String>,
    pub last_synced_at: Option<String>,
    pub color_index: i32,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub account_id: String,
    pub title: String,
    pub description: String,
    pub location: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub all_day: bool,
    pub attendees: Vec<String>,
    pub status: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub events_updated: usize,
    pub next_sync_token: Option<String>,
}

// ─── PKCE utilities ───────────────────────────────────────────────────────────

/// Generate a PKCE code_verifier (43-128 random URL-safe characters).
pub fn generate_code_verifier() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let length = rng.gen_range(43..=128);
    let chars: Vec<u8> = (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..66);
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[idx]
        })
        .collect();
    String::from_utf8(chars).unwrap()
}

/// Compute PKCE code_challenge = BASE64URL(SHA256(code_verifier)).
pub fn compute_code_challenge(code_verifier: &str) -> String {
    use base64::Engine;
    use sha2::{Digest, Sha256};

    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let hash = hasher.finalize();

    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash)
}

/// Build the Google OAuth authorization URL.
pub fn build_google_auth_url(redirect_port: u16, code_challenge: &str) -> String {
    format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
         client_id={}&\
         redirect_uri=http://localhost:{}/callback&\
         response_type=code&\
         scope=https://www.googleapis.com/auth/calendar.readonly&\
         code_challenge={}&\
         code_challenge_method=S256&\
         access_type=offline&\
         prompt=consent",
        GOOGLE_CLIENT_ID_STR, redirect_port, code_challenge
    )
}

/// Build the Microsoft OAuth authorization URL.
pub fn build_outlook_auth_url(redirect_port: u16, code_challenge: &str) -> String {
    format!(
        "https://login.microsoftonline.com/common/oauth2/v2/authorize?\
         client_id={}&\
         redirect_uri=http://localhost:{}/callback&\
         response_type=code&\
         scope=https://graph.microsoft.com/Calendars.Read offline_access&\
         code_challenge={}&\
         code_challenge_method=S256",
        MICROSOFT_CLIENT_ID_STR, redirect_port, code_challenge
    )
}

// ─── Google Calendar API parsing ──────────────────────────────────────────────

/// Parse events from a Google Calendar API response JSON.
pub fn parse_google_events(json: &serde_json::Value, account_id: &str) -> Vec<CalendarEvent> {
    let items = match json.get("items").and_then(|v| v.as_array()) {
        Some(arr) => arr,
        None => return vec![],
    };

    items
        .iter()
        .filter_map(|item| {
            let id = item.get("id")?.as_str()?.to_string();
            let status = item.get("status").and_then(|v| v.as_str()).unwrap_or("confirmed").to_string();

            // Cancelled events from incremental sync only have id + status.
            // Return a minimal event so the caller can hard-delete it from DB.
            if status == "cancelled" {
                return Some(CalendarEvent {
                    id,
                    account_id: account_id.to_string(),
                    title: String::new(),
                    description: String::new(),
                    location: None,
                    start_time: String::new(),
                    end_time: String::new(),
                    all_day: false,
                    attendees: vec![],
                    status: "cancelled".to_string(),
                    updated_at: String::new(),
                });
            }

            let title = item
                .get("summary")
                .and_then(|v| v.as_str())
                .unwrap_or("(No title)")
                .to_string();
            let description = item
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let location = item
                .get("location")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            // Handle both dateTime (timed events) and date (all-day events)
            let start_obj = item.get("start")?;
            let end_obj = item.get("end")?;

            let (start_time, all_day) = if let Some(dt) =
                start_obj.get("dateTime").and_then(|v| v.as_str())
            {
                (dt.to_string(), false)
            } else if let Some(d) = start_obj.get("date").and_then(|v| v.as_str()) {
                (format!("{}T00:00:00Z", d), true)
            } else {
                return None;
            };

            let end_time = if let Some(dt) = end_obj.get("dateTime").and_then(|v| v.as_str()) {
                dt.to_string()
            } else if let Some(d) = end_obj.get("date").and_then(|v| v.as_str()) {
                format!("{}T00:00:00Z", d)
            } else {
                return None;
            };

            let attendees: Vec<String> = item
                .get("attendees")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|a| a.get("email").and_then(|e| e.as_str()))
                        .map(|s| s.to_string())
                        .collect()
                })
                .unwrap_or_default();

            let updated_at = item
                .get("updated")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            Some(CalendarEvent {
                id,
                account_id: account_id.to_string(),
                title,
                description,
                location,
                start_time,
                end_time,
                all_day,
                attendees,
                status,
                updated_at,
            })
        })
        .collect()
}

/// Extract the next syncToken from a Google Calendar API response.
pub fn extract_google_sync_token(json: &serde_json::Value) -> Option<String> {
    json.get("nextSyncToken")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

// ─── Microsoft Graph API parsing ──────────────────────────────────────────────

/// Parse events from a Microsoft Graph Calendar API response JSON.
pub fn parse_outlook_events(json: &serde_json::Value, account_id: &str) -> Vec<CalendarEvent> {
    let items = match json.get("value").and_then(|v| v.as_array()) {
        Some(arr) => arr,
        None => return vec![],
    };

    items
        .iter()
        .filter_map(|item| {
            let id = item.get("id")?.as_str()?.to_string();
            let title = item
                .get("subject")
                .and_then(|v| v.as_str())
                .unwrap_or("(No title)")
                .to_string();
            let description = item
                .get("bodyPreview")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let location = item
                .get("location")
                .and_then(|v| v.get("displayName"))
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string());

            let all_day = item
                .get("isAllDay")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            let start_time = item
                .get("start")
                .and_then(|v| v.get("dateTime"))
                .and_then(|v| v.as_str())
                .map(|s| {
                    // With outlook.timezone="UTC", times come back without offset or with Z.
                    // Distinguish date-separator dashes (pos 4,7) from timezone offset dashes (pos > 10).
                    if s.ends_with('Z') || s.contains('+') || s.rfind('-').map_or(false, |pos| pos > 10) {
                        s.to_string()
                    } else {
                        format!("{}Z", s)
                    }
                })?;

            let end_time = item
                .get("end")
                .and_then(|v| v.get("dateTime"))
                .and_then(|v| v.as_str())
                .map(|s| {
                    if s.ends_with('Z') || s.contains('+') || s.rfind('-').map_or(false, |pos| pos > 10) {
                        s.to_string()
                    } else {
                        format!("{}Z", s)
                    }
                })?;

            let attendees: Vec<String> = item
                .get("attendees")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|a| {
                            a.get("emailAddress")
                                .and_then(|e| e.get("address"))
                                .and_then(|addr| addr.as_str())
                        })
                        .map(|s| s.to_string())
                        .collect()
                })
                .unwrap_or_default();

            let status = item
                .get("showAs")
                .and_then(|v| v.as_str())
                .unwrap_or("busy")
                .to_string();

            let updated_at = item
                .get("lastModifiedDateTime")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            Some(CalendarEvent {
                id,
                account_id: account_id.to_string(),
                title,
                description,
                location,
                start_time,
                end_time,
                all_day,
                attendees,
                status,
                updated_at,
            })
        })
        .collect()
}

/// Extract the deltaLink from a Microsoft Graph API response.
pub fn extract_outlook_delta_link(json: &serde_json::Value) -> Option<String> {
    json.get("@odata.deltaLink")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

// ─── Google Calendar sync ─────────────────────────────────────────────────────

pub async fn sync_google_calendar(
    client: &reqwest::Client,
    access_token: &str,
    calendar_id: &str,
    sync_token: Option<&str>,
) -> Result<(Vec<CalendarEvent>, Option<String>), CalendarError> {
    let url = format!(
        "https://www.googleapis.com/calendar/v3/calendars/{}/events",
        calendar_id
    );

    let mut params: Vec<(&str, String)> = vec![
        ("singleEvents", "true".to_string()),
        ("orderBy", "startTime".to_string()),
    ];

    if let Some(token) = sync_token {
        params.push(("syncToken", token.to_string()));
    } else {
        let now = chrono::Utc::now().to_rfc3339();
        let later = (chrono::Utc::now() + chrono::Duration::days(30)).to_rfc3339();
        params.push(("timeMin", now));
        params.push(("timeMax", later));
    }

    let resp = client
        .get(&url)
        .bearer_auth(access_token)
        .query(&params)
        .send()
        .await?;

    // D-03: 410 Gone means sync token invalidated -- caller should clear and retry
    if resp.status() == reqwest::StatusCode::GONE {
        return Err(CalendarError::SyncTokenExpired);
    }

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(CalendarError::ApiError(format!(
            "Google Calendar API returned {}: {}",
            status, body
        )));
    }

    let json: serde_json::Value = resp.json().await?;
    let events = parse_google_events(&json, "");
    let next_token = extract_google_sync_token(&json);
    Ok((events, next_token))
}

// ─── Outlook Calendar sync ────────────────────────────────────────────────────

pub async fn sync_outlook_calendar(
    client: &reqwest::Client,
    access_token: &str,
    delta_link: Option<&str>,
) -> Result<(Vec<CalendarEvent>, Option<String>), CalendarError> {
    let url = if let Some(link) = delta_link {
        link.to_string()
    } else {
        let now = chrono::Utc::now().to_rfc3339();
        let later = (chrono::Utc::now() + chrono::Duration::days(30)).to_rfc3339();
        format!(
            "https://graph.microsoft.com/v1.0/me/calendarView?startDateTime={}&endDateTime={}",
            now, later
        )
    };

    let resp = client
        .get(&url)
        .bearer_auth(access_token)
        .header("Prefer", "outlook.timezone=\"UTC\", outlook.body-content-type=\"text\"")
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(CalendarError::ApiError(format!(
            "Microsoft Graph API returned {}: {}",
            status, body
        )));
    }

    let json: serde_json::Value = resp.json().await?;
    let events = parse_outlook_events(&json, "");
    let next_delta = extract_outlook_delta_link(&json);
    Ok((events, next_delta))
}

// ─── Token refresh ────────────────────────────────────────────────────────────

/// Refresh a Google OAuth access token using a refresh token.
pub async fn refresh_google_token(
    client: &reqwest::Client,
    refresh_token: &str,
) -> Result<(String, Option<String>), CalendarError> {
    let resp = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", GOOGLE_CLIENT_ID_STR),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
        ])
        .send()
        .await?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        if body.contains("invalid_grant") {
            return Err(CalendarError::TokenRevoked(body));
        }
        return Err(CalendarError::OAuthError(format!(
            "Google token refresh failed: {}",
            body
        )));
    }

    let json: serde_json::Value = resp.json().await?;
    let access_token = json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| CalendarError::OAuthError("No access_token in response".to_string()))?
        .to_string();
    let new_refresh = json
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok((access_token, new_refresh))
}

/// Refresh a Microsoft OAuth access token using a refresh token.
pub async fn refresh_outlook_token(
    client: &reqwest::Client,
    refresh_token: &str,
) -> Result<(String, Option<String>), CalendarError> {
    let resp = client
        .post("https://login.microsoftonline.com/common/oauth2/v2.0/token")
        .form(&[
            ("client_id", MICROSOFT_CLIENT_ID_STR),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
            (
                "scope",
                "https://graph.microsoft.com/Calendars.Read offline_access",
            ),
        ])
        .send()
        .await?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        if body.contains("invalid_grant") || body.contains("AADSTS700082") || body.contains("AADSTS50076") {
            return Err(CalendarError::TokenRevoked(body));
        }
        return Err(CalendarError::OAuthError(format!(
            "Microsoft token refresh failed: {}",
            body
        )));
    }

    let json: serde_json::Value = resp.json().await?;
    let access_token = json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| CalendarError::OAuthError("No access_token in response".to_string()))?
        .to_string();
    let new_refresh = json
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok((access_token, new_refresh))
}

// ─── Database operations ──────────────────────────────────────────────────────

/// Save a calendar account to the database.
pub fn save_calendar_account(
    conn: &rusqlite::Connection,
    account: &CalendarAccount,
) -> Result<(), CalendarError> {
    conn.execute(
        "INSERT INTO calendar_accounts (id, provider, email, display_name, credential_id, sync_token, last_synced_at, color_index, enabled, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            account.id,
            account.provider,
            account.email,
            account.display_name,
            account.credential_id,
            account.sync_token,
            account.last_synced_at,
            account.color_index,
            account.enabled,
            account.created_at,
        ],
    )?;
    Ok(())
}

/// List all calendar accounts.
pub fn list_calendar_accounts(
    conn: &rusqlite::Connection,
) -> Result<Vec<CalendarAccount>, CalendarError> {
    let mut stmt = conn.prepare(
        "SELECT id, provider, email, display_name, credential_id, sync_token, last_synced_at, color_index, enabled, created_at FROM calendar_accounts ORDER BY created_at",
    )?;
    let accounts = stmt
        .query_map([], |row| {
            Ok(CalendarAccount {
                id: row.get(0)?,
                provider: row.get(1)?,
                email: row.get(2)?,
                display_name: row.get(3)?,
                credential_id: row.get(4)?,
                sync_token: row.get(5)?,
                last_synced_at: row.get(6)?,
                color_index: row.get(7)?,
                enabled: row.get::<_, bool>(8)?,
                created_at: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(accounts)
}

/// Delete a calendar account (CASCADE deletes its events).
pub fn delete_calendar_account(
    conn: &rusqlite::Connection,
    account_id: &str,
) -> Result<(), CalendarError> {
    conn.execute(
        "DELETE FROM calendar_accounts WHERE id = ?1",
        rusqlite::params![account_id],
    )?;
    Ok(())
}

/// Upsert calendar events using INSERT OR REPLACE.
pub fn save_events(
    conn: &rusqlite::Connection,
    events: &[CalendarEvent],
) -> Result<usize, CalendarError> {
    let mut count = 0;
    for event in events {
        let attendees_json = serde_json::to_string(&event.attendees).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "INSERT OR REPLACE INTO calendar_events (id, account_id, title, description, location, start_time, end_time, all_day, attendees, status, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                event.id,
                event.account_id,
                event.title,
                event.description,
                event.location,
                event.start_time,
                event.end_time,
                event.all_day,
                attendees_json,
                event.status,
                event.updated_at,
            ],
        )?;
        count += 1;
    }
    Ok(count)
}

/// List events within a time range.
pub fn list_events_for_range(
    conn: &rusqlite::Connection,
    start: &str,
    end: &str,
) -> Result<Vec<CalendarEvent>, CalendarError> {
    let mut stmt = conn.prepare(
        "SELECT id, account_id, title, description, location, start_time, end_time, all_day, attendees, status, updated_at
         FROM calendar_events
         WHERE start_time >= ?1 AND end_time <= ?2
         ORDER BY start_time",
    )?;
    let events = stmt
        .query_map(rusqlite::params![start, end], |row| {
            let attendees_str: String = row.get(8)?;
            let attendees: Vec<String> =
                serde_json::from_str(&attendees_str).unwrap_or_default();
            Ok(CalendarEvent {
                id: row.get(0)?,
                account_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                location: row.get(4)?,
                start_time: row.get(5)?,
                end_time: row.get(6)?,
                all_day: row.get(7)?,
                attendees,
                status: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(events)
}

/// Update the sync token and last_synced_at for a calendar account.
pub fn update_sync_token(
    conn: &rusqlite::Connection,
    account_id: &str,
    sync_token: Option<&str>,
    last_synced_at: &str,
) -> Result<(), CalendarError> {
    conn.execute(
        "UPDATE calendar_accounts SET sync_token = ?1, last_synced_at = ?2 WHERE id = ?3",
        rusqlite::params![sync_token, last_synced_at, account_id],
    )?;
    Ok(())
}

/// Disable a calendar account (D-01: silent disable on token revocation).
pub fn disable_calendar_account(
    conn: &rusqlite::Connection,
    account_id: &str,
) -> Result<(), CalendarError> {
    conn.execute(
        "UPDATE calendar_accounts SET enabled = 0 WHERE id = ?1",
        rusqlite::params![account_id],
    )
    .map_err(|e| CalendarError::DbError(e.to_string()))?;
    Ok(())
}

/// Hard-delete calendar events by their IDs for a specific account (D-07).
pub fn delete_events_by_ids(
    conn: &rusqlite::Connection,
    event_ids: &[String],
    account_id: &str,
) -> Result<usize, CalendarError> {
    let mut deleted = 0;
    for id in event_ids {
        deleted += conn
            .execute(
                "DELETE FROM calendar_events WHERE id = ?1 AND account_id = ?2",
                rusqlite::params![id, account_id],
            )
            .map_err(|e| CalendarError::DbError(e.to_string()))?;
    }
    Ok(deleted)
}

// ─── CalendarPlugin (orchestrator) ────────────────────────────────────────────

/// Token refresh mutex to prevent race conditions (Pitfall 3 from RESEARCH.md).
static TOKEN_REFRESH_LOCK: Mutex<()> = Mutex::new(());

pub struct CalendarPlugin;

impl CalendarPlugin {
    /// Sync a single account: refresh token, fetch events, upsert to DB.
    pub async fn sync_account(
        account: &CalendarAccount,
        db: &std::sync::Mutex<Database>,
        secret_store: &dyn SecretStore,
    ) -> Result<SyncResult, CalendarError> {
        let client = reqwest::Client::new();

        // Retrieve refresh token from credential vault
        let refresh_token = secret_store
            .get_secret(&account.credential_id)
            .map_err(CalendarError::CredentialError)?;

        // Serialize token refresh through mutex (Pitfall 3)
        let (access_token, new_refresh) = {
            let _lock = TOKEN_REFRESH_LOCK
                .lock()
                .map_err(|e| CalendarError::OAuthError(e.to_string()))?;

            match account.provider.as_str() {
                "google" => refresh_google_token(&client, &refresh_token).await?,
                "outlook" => refresh_outlook_token(&client, &refresh_token).await?,
                other => {
                    return Err(CalendarError::OAuthError(format!(
                        "Unknown provider: {}",
                        other
                    )));
                }
            }
        };

        // If we got a new refresh token, update the credential vault
        if let Some(ref new_rt) = new_refresh {
            secret_store
                .set_secret(&account.credential_id, new_rt)
                .map_err(CalendarError::CredentialError)?;
        }

        // Sync events
        let (events, next_token) = match account.provider.as_str() {
            "google" => {
                let mut events_result = sync_google_calendar(
                    &client,
                    &access_token,
                    "primary",
                    account.sync_token.as_deref(),
                )
                .await?;
                // Set account_id on events
                for event in &mut events_result.0 {
                    event.account_id = account.id.clone();
                }
                events_result
            }
            "outlook" => {
                let mut events_result = sync_outlook_calendar(
                    &client,
                    &access_token,
                    account.sync_token.as_deref(),
                )
                .await?;
                for event in &mut events_result.0 {
                    event.account_id = account.id.clone();
                }
                events_result
            }
            _ => unreachable!(),
        };

        // Save to DB
        let db_lock = db.lock().map_err(|e| CalendarError::DbError(e.to_string()))?;
        let count = save_events(db_lock.conn(), &events)?;
        let now = chrono::Utc::now().to_rfc3339();
        update_sync_token(db_lock.conn(), &account.id, next_token.as_deref(), &now)?;

        Ok(SyncResult {
            events_updated: count,
            next_sync_token: next_token,
        })
    }
}

// ─── Background sync ──────────────────────────────────────────────────────────

/// Start background sync that polls all enabled accounts every 15 minutes (D-04).
pub fn start_background_sync(app_handle: tauri::AppHandle) {
    use std::sync::Arc;
    use tauri::{Emitter, Manager};

    tauri::async_runtime::spawn(async move {
        let interval = std::time::Duration::from_secs(900); // 15 minutes (D-04)

        loop {
            tokio::time::sleep(interval).await;

            // Get database from app state
            let db = match app_handle.try_state::<Arc<std::sync::Mutex<Database>>>() {
                Some(db) => db.inner().clone(),
                None => continue,
            };

            // Get all enabled accounts (lock scoped to block)
            let accounts = {
                let db_lock = match db.lock() {
                    Ok(l) => l,
                    Err(_) => continue,
                };
                match list_calendar_accounts(db_lock.conn()) {
                    Ok(accs) => accs.into_iter().filter(|a| a.enabled).collect::<Vec<_>>(),
                    Err(_) => continue,
                }
            };

            for account in &accounts {
                // Extract refresh token (lock scoped to block -- dropped before await)
                let refresh_token = {
                    let cred_mgr = match app_handle
                        .try_state::<std::sync::Mutex<crate::credentials::CredentialManager>>()
                    {
                        Some(mgr) => mgr,
                        None => continue,
                    };
                    let mgr_lock = match cred_mgr.lock() {
                        Ok(l) => l,
                        Err(_) => continue,
                    };
                    match mgr_lock.get_secret(&account.credential_id) {
                        Ok(token) => token,
                        Err(e) => {
                            eprintln!("Failed to get token for {}: {}", account.email, e);
                            continue;
                        }
                    }
                    // mgr_lock dropped here
                };

                let client = reqwest::Client::new();
                let provider = account.provider.clone();

                // Token refresh (no MutexGuard held across await)
                let refresh_result = match provider.as_str() {
                    "google" => refresh_google_token(&client, &refresh_token).await,
                    "outlook" => refresh_outlook_token(&client, &refresh_token).await,
                    _ => continue,
                };

                let (access_token, new_refresh) = match refresh_result {
                    Ok(r) => r,
                    Err(CalendarError::TokenRevoked(msg)) => {
                        // D-01: Disable account on permanent auth failure
                        if let Ok(db_lock) = db.lock() {
                            let _ = disable_calendar_account(db_lock.conn(), &account.id);
                        }
                        let _ = app_handle.emit("calendar-account-disabled", &account.id);
                        eprintln!("Token revoked during refresh for {}: {} -- account disabled", account.email, msg);
                        continue;
                    }
                    Err(e) => {
                        eprintln!("Token refresh failed for {}: {}", account.email, e);
                        continue;
                    }
                };

                // Update refresh token if new one received (scoped lock)
                if let Some(ref new_rt) = new_refresh {
                    if let Some(cred_mgr) = app_handle
                        .try_state::<std::sync::Mutex<crate::credentials::CredentialManager>>()
                    {
                        if let Ok(mgr) = cred_mgr.lock() {
                            let _ = mgr.update(
                                &account.credential_id,
                                None,
                                None,
                                None,
                                Some(new_rt),
                            );
                        }
                    }
                }

                // Fetch events (no lock held)
                let sync_result = match provider.as_str() {
                    "google" => {
                        sync_google_calendar(
                            &client,
                            &access_token,
                            "primary",
                            account.sync_token.as_deref(),
                        )
                        .await
                    }
                    "outlook" => {
                        sync_outlook_calendar(
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
                        if let Ok(db_lock) = db.lock() {
                            if !cancelled.is_empty() {
                                let ids: Vec<String> =
                                    cancelled.iter().map(|e| e.id.clone()).collect();
                                let _ = delete_events_by_ids(db_lock.conn(), &ids, &account.id);
                            }
                            let _ = save_events(db_lock.conn(), &active);
                            let now = chrono::Utc::now().to_rfc3339();
                            let _ = update_sync_token(
                                db_lock.conn(),
                                &account.id,
                                next_token.as_deref(),
                                &now,
                            );
                        }
                    }
                    Err(CalendarError::SyncTokenExpired) => {
                        // D-03: Clear sync token, will do full sync next interval
                        if let Ok(db_lock) = db.lock() {
                            let now = chrono::Utc::now().to_rfc3339();
                            let _ = update_sync_token(db_lock.conn(), &account.id, None, &now);
                        }
                        eprintln!(
                            "Sync token expired for {} -- will do full sync next interval",
                            account.email
                        );
                    }
                    Err(CalendarError::TokenRevoked(msg)) => {
                        // D-01: Disable account
                        if let Ok(db_lock) = db.lock() {
                            let _ = disable_calendar_account(db_lock.conn(), &account.id);
                        }
                        let _ = app_handle.emit("calendar-account-disabled", &account.id);
                        eprintln!(
                            "Token revoked for {}: {} -- account disabled",
                            account.email, msg
                        );
                    }
                    Err(e) => {
                        // D-06: Transient errors silently logged
                        eprintln!("Sync failed for {}: {}", account.email, e);
                    }
                }
            }

            // Emit sync completed event
            let _ = app_handle.emit("calendar-synced", ());
        }
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;
    use crate::db::migrations;

    fn setup_test_db() -> rusqlite::Connection {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&conn).unwrap();
        conn
    }

    fn make_test_account(conn: &rusqlite::Connection) -> CalendarAccount {
        // Insert a credential first (FK requirement)
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO credentials (id, name, credential_type, notes, created_at, updated_at) VALUES ('cred-1', 'test-cred', 'oauth_token', '', ?1, ?1)",
            rusqlite::params![now],
        ).unwrap();

        let account = CalendarAccount {
            id: "acct-1".to_string(),
            provider: "google".to_string(),
            email: "test@example.com".to_string(),
            display_name: "Test Account".to_string(),
            credential_id: "cred-1".to_string(),
            sync_token: None,
            last_synced_at: None,
            color_index: 0,
            enabled: true,
            created_at: now,
        };
        save_calendar_account(conn, &account).unwrap();
        account
    }

    // ─── Struct serialization tests ───────────────────────────────────────

    #[test]
    fn test_calendar_event_serializes_correctly() {
        let event = CalendarEvent {
            id: "evt-1".to_string(),
            account_id: "acct-1".to_string(),
            title: "Team Meeting".to_string(),
            description: "Weekly sync".to_string(),
            location: Some("Room A".to_string()),
            start_time: "2026-03-17T10:00:00Z".to_string(),
            end_time: "2026-03-17T11:00:00Z".to_string(),
            all_day: false,
            attendees: vec!["alice@example.com".to_string()],
            status: "confirmed".to_string(),
            updated_at: "2026-03-17T09:00:00Z".to_string(),
        };

        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["id"], "evt-1");
        assert_eq!(json["accountId"], "acct-1");
        assert_eq!(json["title"], "Team Meeting");
        assert_eq!(json["description"], "Weekly sync");
        assert_eq!(json["location"], "Room A");
        assert_eq!(json["startTime"], "2026-03-17T10:00:00Z");
        assert_eq!(json["endTime"], "2026-03-17T11:00:00Z");
        assert_eq!(json["allDay"], false);
        assert_eq!(json["attendees"][0], "alice@example.com");
        assert_eq!(json["status"], "confirmed");
    }

    #[test]
    fn test_calendar_event_deserializes_correctly() {
        let json = serde_json::json!({
            "id": "evt-2",
            "accountId": "acct-1",
            "title": "Lunch",
            "description": "",
            "location": null,
            "startTime": "2026-03-17T12:00:00Z",
            "endTime": "2026-03-17T13:00:00Z",
            "allDay": false,
            "attendees": [],
            "status": "confirmed",
            "updatedAt": "2026-03-17T09:00:00Z"
        });

        let event: CalendarEvent = serde_json::from_value(json).unwrap();
        assert_eq!(event.id, "evt-2");
        assert_eq!(event.account_id, "acct-1");
        assert!(event.location.is_none());
        assert!(event.attendees.is_empty());
    }

    #[test]
    fn test_calendar_account_serializes_correctly() {
        let account = CalendarAccount {
            id: "acct-1".to_string(),
            provider: "google".to_string(),
            email: "user@gmail.com".to_string(),
            display_name: "My Google".to_string(),
            credential_id: "cred-1".to_string(),
            sync_token: Some("token-123".to_string()),
            last_synced_at: Some("2026-03-17T10:00:00Z".to_string()),
            color_index: 0,
            enabled: true,
            created_at: "2026-03-17T09:00:00Z".to_string(),
        };

        let json = serde_json::to_value(&account).unwrap();
        assert_eq!(json["id"], "acct-1");
        assert_eq!(json["provider"], "google");
        assert_eq!(json["email"], "user@gmail.com");
        assert_eq!(json["syncToken"], "token-123");
        assert_eq!(json["colorIndex"], 0);
        assert_eq!(json["enabled"], true);
    }

    #[test]
    fn test_calendar_account_deserializes_correctly() {
        let json = serde_json::json!({
            "id": "acct-2",
            "provider": "outlook",
            "email": "user@outlook.com",
            "displayName": "Work Calendar",
            "credentialId": "cred-2",
            "syncToken": null,
            "lastSyncedAt": null,
            "colorIndex": 1,
            "enabled": true,
            "createdAt": "2026-03-17T09:00:00Z"
        });

        let account: CalendarAccount = serde_json::from_value(json).unwrap();
        assert_eq!(account.id, "acct-2");
        assert_eq!(account.provider, "outlook");
        assert!(account.sync_token.is_none());
    }

    // ─── Google event parsing tests ───────────────────────────────────────

    #[test]
    fn test_parse_google_events_extracts_events() {
        let json = serde_json::json!({
            "items": [
                {
                    "id": "g-evt-1",
                    "summary": "Sprint Planning",
                    "description": "Plan the next sprint",
                    "location": "Conference Room B",
                    "start": { "dateTime": "2026-03-17T09:00:00-07:00" },
                    "end": { "dateTime": "2026-03-17T10:00:00-07:00" },
                    "attendees": [
                        { "email": "alice@company.com" },
                        { "email": "bob@company.com" }
                    ],
                    "status": "confirmed",
                    "updated": "2026-03-16T12:00:00Z"
                },
                {
                    "id": "g-evt-2",
                    "summary": "Birthday",
                    "start": { "date": "2026-03-20" },
                    "end": { "date": "2026-03-21" },
                    "status": "confirmed",
                    "updated": "2026-03-15T08:00:00Z"
                }
            ],
            "nextSyncToken": "sync-token-abc"
        });

        let events = parse_google_events(&json, "acct-1");
        assert_eq!(events.len(), 2);

        // Timed event
        assert_eq!(events[0].id, "g-evt-1");
        assert_eq!(events[0].title, "Sprint Planning");
        assert_eq!(events[0].description, "Plan the next sprint");
        assert_eq!(events[0].location, Some("Conference Room B".to_string()));
        assert_eq!(events[0].start_time, "2026-03-17T09:00:00-07:00");
        assert_eq!(events[0].attendees.len(), 2);
        assert!(!events[0].all_day);

        // All-day event
        assert_eq!(events[1].id, "g-evt-2");
        assert_eq!(events[1].title, "Birthday");
        assert!(events[1].all_day);
        assert_eq!(events[1].start_time, "2026-03-20T00:00:00Z");

        // Sync token
        let token = extract_google_sync_token(&json);
        assert_eq!(token, Some("sync-token-abc".to_string()));
    }

    #[test]
    fn test_parse_google_events_empty_items() {
        let json = serde_json::json!({ "items": [] });
        let events = parse_google_events(&json, "acct-1");
        assert!(events.is_empty());
    }

    #[test]
    fn test_parse_google_events_missing_items() {
        let json = serde_json::json!({});
        let events = parse_google_events(&json, "acct-1");
        assert!(events.is_empty());
    }

    // ─── Outlook event parsing tests ──────────────────────────────────────

    #[test]
    fn test_parse_outlook_events_extracts_events() {
        let json = serde_json::json!({
            "value": [
                {
                    "id": "o-evt-1",
                    "subject": "1:1 Meeting",
                    "bodyPreview": "Weekly check-in",
                    "location": { "displayName": "Teams Call" },
                    "start": { "dateTime": "2026-03-17T14:00:00" },
                    "end": { "dateTime": "2026-03-17T14:30:00" },
                    "isAllDay": false,
                    "attendees": [
                        { "emailAddress": { "address": "manager@company.com" } }
                    ],
                    "showAs": "busy",
                    "lastModifiedDateTime": "2026-03-16T11:00:00Z"
                }
            ],
            "@odata.deltaLink": "https://graph.microsoft.com/v1.0/me/calendarView/delta?$deltatoken=xyz"
        });

        let events = parse_outlook_events(&json, "acct-2");
        assert_eq!(events.len(), 1);

        assert_eq!(events[0].id, "o-evt-1");
        assert_eq!(events[0].title, "1:1 Meeting");
        assert_eq!(events[0].description, "Weekly check-in");
        assert_eq!(events[0].location, Some("Teams Call".to_string()));
        assert_eq!(events[0].start_time, "2026-03-17T14:00:00Z");
        assert!(!events[0].all_day);
        assert_eq!(events[0].attendees, vec!["manager@company.com"]);

        let delta = extract_outlook_delta_link(&json);
        assert!(delta.is_some());
        assert!(delta.unwrap().contains("deltatoken=xyz"));
    }

    #[test]
    fn test_parse_outlook_events_empty() {
        let json = serde_json::json!({ "value": [] });
        let events = parse_outlook_events(&json, "acct-2");
        assert!(events.is_empty());
    }

    // ─── PKCE tests ───────────────────────────────────────────────────────

    #[test]
    fn test_code_verifier_length() {
        let verifier = generate_code_verifier();
        assert!(verifier.len() >= 43);
        assert!(verifier.len() <= 128);
    }

    #[test]
    fn test_code_verifier_url_safe_chars() {
        let verifier = generate_code_verifier();
        assert!(verifier.chars().all(|c| c.is_ascii_alphanumeric()
            || c == '-'
            || c == '.'
            || c == '_'
            || c == '~'));
    }

    #[test]
    fn test_code_challenge_is_base64url() {
        let verifier = "test-verifier-string-that-is-at-least-43-chars-long-for-pkce";
        let challenge = compute_code_challenge(verifier);
        // BASE64URL_NO_PAD: no padding, uses - and _ instead of + and /
        assert!(!challenge.contains('='));
        assert!(!challenge.contains('+'));
        assert!(!challenge.contains('/'));
        assert!(!challenge.is_empty());
    }

    #[test]
    fn test_code_challenge_deterministic() {
        let verifier = "deterministic-test-verifier-string-43-chars-long!";
        let c1 = compute_code_challenge(verifier);
        let c2 = compute_code_challenge(verifier);
        assert_eq!(c1, c2);
    }

    // ─── Database operation tests ─────────────────────────────────────────

    #[test]
    fn test_save_events_to_db() {
        let conn = setup_test_db();
        let account = make_test_account(&conn);

        let events = vec![CalendarEvent {
            id: "evt-db-1".to_string(),
            account_id: account.id.clone(),
            title: "DB Test Event".to_string(),
            description: "Testing".to_string(),
            location: Some("Office".to_string()),
            start_time: "2026-03-17T10:00:00Z".to_string(),
            end_time: "2026-03-17T11:00:00Z".to_string(),
            all_day: false,
            attendees: vec!["a@b.com".to_string()],
            status: "confirmed".to_string(),
            updated_at: "2026-03-17T09:00:00Z".to_string(),
        }];

        let count = save_events(&conn, &events).unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_save_events_upsert() {
        let conn = setup_test_db();
        let account = make_test_account(&conn);

        let events = vec![CalendarEvent {
            id: "evt-upsert".to_string(),
            account_id: account.id.clone(),
            title: "Original".to_string(),
            description: "".to_string(),
            location: None,
            start_time: "2026-03-17T10:00:00Z".to_string(),
            end_time: "2026-03-17T11:00:00Z".to_string(),
            all_day: false,
            attendees: vec![],
            status: "confirmed".to_string(),
            updated_at: "2026-03-17T09:00:00Z".to_string(),
        }];

        save_events(&conn, &events).unwrap();

        // Upsert with new title
        let updated_events = vec![CalendarEvent {
            id: "evt-upsert".to_string(),
            account_id: account.id.clone(),
            title: "Updated".to_string(),
            description: "".to_string(),
            location: None,
            start_time: "2026-03-17T10:00:00Z".to_string(),
            end_time: "2026-03-17T11:00:00Z".to_string(),
            all_day: false,
            attendees: vec![],
            status: "confirmed".to_string(),
            updated_at: "2026-03-17T10:00:00Z".to_string(),
        }];

        save_events(&conn, &updated_events).unwrap();

        let all = list_events_for_range(&conn, "2026-03-17T00:00:00Z", "2026-03-18T00:00:00Z")
            .unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].title, "Updated");
    }

    #[test]
    fn test_list_events_for_range() {
        let conn = setup_test_db();
        let account = make_test_account(&conn);

        let events = vec![
            CalendarEvent {
                id: "evt-range-1".to_string(),
                account_id: account.id.clone(),
                title: "Morning".to_string(),
                description: "".to_string(),
                location: None,
                start_time: "2026-03-17T08:00:00Z".to_string(),
                end_time: "2026-03-17T09:00:00Z".to_string(),
                all_day: false,
                attendees: vec![],
                status: "confirmed".to_string(),
                updated_at: "2026-03-17T07:00:00Z".to_string(),
            },
            CalendarEvent {
                id: "evt-range-2".to_string(),
                account_id: account.id.clone(),
                title: "Afternoon".to_string(),
                description: "".to_string(),
                location: None,
                start_time: "2026-03-17T14:00:00Z".to_string(),
                end_time: "2026-03-17T15:00:00Z".to_string(),
                all_day: false,
                attendees: vec![],
                status: "confirmed".to_string(),
                updated_at: "2026-03-17T07:00:00Z".to_string(),
            },
            CalendarEvent {
                id: "evt-range-3".to_string(),
                account_id: account.id.clone(),
                title: "Tomorrow".to_string(),
                description: "".to_string(),
                location: None,
                start_time: "2026-03-18T10:00:00Z".to_string(),
                end_time: "2026-03-18T11:00:00Z".to_string(),
                all_day: false,
                attendees: vec![],
                status: "confirmed".to_string(),
                updated_at: "2026-03-17T07:00:00Z".to_string(),
            },
        ];

        save_events(&conn, &events).unwrap();

        // Only today's events
        let today = list_events_for_range(
            &conn,
            "2026-03-17T00:00:00Z",
            "2026-03-17T23:59:59Z",
        )
        .unwrap();
        assert_eq!(today.len(), 2);
        assert_eq!(today[0].title, "Morning");
        assert_eq!(today[1].title, "Afternoon");
    }

    #[test]
    fn test_save_sync_token() {
        let conn = setup_test_db();
        let account = make_test_account(&conn);

        update_sync_token(&conn, &account.id, Some("syncToken-abc"), "2026-03-17T10:00:00Z")
            .unwrap();

        let accounts = list_calendar_accounts(&conn).unwrap();
        assert_eq!(accounts.len(), 1);
        assert_eq!(accounts[0].sync_token, Some("syncToken-abc".to_string()));
        assert_eq!(
            accounts[0].last_synced_at,
            Some("2026-03-17T10:00:00Z".to_string())
        );
    }

    #[test]
    fn test_save_and_list_calendar_accounts() {
        let conn = setup_test_db();
        let _ = make_test_account(&conn);

        let accounts = list_calendar_accounts(&conn).unwrap();
        assert_eq!(accounts.len(), 1);
        assert_eq!(accounts[0].id, "acct-1");
        assert_eq!(accounts[0].provider, "google");
        assert_eq!(accounts[0].email, "test@example.com");
    }

    #[test]
    fn test_delete_calendar_account_cascades_events() {
        let conn = setup_test_db();
        let account = make_test_account(&conn);

        let events = vec![CalendarEvent {
            id: "evt-cascade".to_string(),
            account_id: account.id.clone(),
            title: "Cascade Test".to_string(),
            description: "".to_string(),
            location: None,
            start_time: "2026-03-17T10:00:00Z".to_string(),
            end_time: "2026-03-17T11:00:00Z".to_string(),
            all_day: false,
            attendees: vec![],
            status: "confirmed".to_string(),
            updated_at: "2026-03-17T09:00:00Z".to_string(),
        }];

        save_events(&conn, &events).unwrap();
        delete_calendar_account(&conn, &account.id).unwrap();

        let remaining = list_events_for_range(
            &conn,
            "2026-03-17T00:00:00Z",
            "2026-03-18T00:00:00Z",
        )
        .unwrap();
        assert!(remaining.is_empty());
    }

    // ─── Auth URL tests ───────────────────────────────────────────────────

    #[test]
    fn test_google_auth_url_contains_required_params() {
        let url = build_google_auth_url(8080, "test-challenge");
        assert!(url.contains("accounts.google.com"));
        assert!(url.contains("response_type=code"));
        assert!(url.contains("code_challenge=test-challenge"));
        assert!(url.contains("code_challenge_method=S256"));
        assert!(url.contains("access_type=offline"));
        assert!(url.contains("calendar.readonly"));
    }

    #[test]
    fn test_outlook_auth_url_contains_required_params() {
        let url = build_outlook_auth_url(8080, "test-challenge");
        assert!(url.contains("login.microsoftonline.com"));
        assert!(url.contains("response_type=code"));
        assert!(url.contains("code_challenge=test-challenge"));
        assert!(url.contains("code_challenge_method=S256"));
        assert!(url.contains("Calendars.Read"));
    }

    // ─── SyncResult serialization ─────────────────────────────────────────

    #[test]
    fn test_sync_result_serializes() {
        let result = SyncResult {
            events_updated: 5,
            next_sync_token: Some("token-xyz".to_string()),
        };
        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["eventsUpdated"], 5);
        assert_eq!(json["nextSyncToken"], "token-xyz");
    }

    // ─── Google deltaLink handling ────────────────────────────────────────

    #[test]
    fn test_save_delta_link_as_sync_token() {
        let conn = setup_test_db();
        let account = make_test_account(&conn);

        let delta = "https://graph.microsoft.com/v1.0/me/calendarView/delta?$deltatoken=abc123";
        update_sync_token(&conn, &account.id, Some(delta), "2026-03-17T10:00:00Z").unwrap();

        let accounts = list_calendar_accounts(&conn).unwrap();
        assert_eq!(accounts[0].sync_token, Some(delta.to_string()));
    }

    // ─── Phase 26 bug-fix tests ──────────────────────────────────────────

    #[test]
    fn test_parse_google_cancelled_event() {
        let json = serde_json::json!({
            "items": [
                {
                    "id": "cancelled-evt-1",
                    "status": "cancelled"
                },
                {
                    "id": "normal-evt-1",
                    "summary": "Normal Event",
                    "start": { "dateTime": "2026-03-17T10:00:00Z" },
                    "end": { "dateTime": "2026-03-17T11:00:00Z" },
                    "status": "confirmed",
                    "updated": "2026-03-17T09:00:00Z"
                }
            ]
        });

        let events = parse_google_events(&json, "acct-1");
        assert_eq!(events.len(), 2);

        // Cancelled event has status="cancelled" and empty start_time
        let cancelled = &events[0];
        assert_eq!(cancelled.id, "cancelled-evt-1");
        assert_eq!(cancelled.status, "cancelled");
        assert!(cancelled.start_time.is_empty());
        assert!(cancelled.title.is_empty());

        // Normal event parses normally
        let normal = &events[1];
        assert_eq!(normal.id, "normal-evt-1");
        assert_eq!(normal.status, "confirmed");
        assert_eq!(normal.title, "Normal Event");
    }

    #[test]
    fn test_parse_outlook_utc_times() {
        // Microsoft Graph with outlook.timezone="UTC" returns times like "2026-03-17T10:00:00.0000000"
        let json = serde_json::json!({
            "value": [
                {
                    "id": "o-utc-1",
                    "subject": "UTC Test",
                    "start": { "dateTime": "2026-03-17T10:00:00.0000000" },
                    "end": { "dateTime": "2026-03-17T11:00:00.0000000" },
                    "isAllDay": false,
                    "showAs": "busy",
                    "lastModifiedDateTime": "2026-03-16T11:00:00Z"
                },
                {
                    "id": "o-utc-2",
                    "subject": "Already Has Z",
                    "start": { "dateTime": "2026-03-17T14:00:00Z" },
                    "end": { "dateTime": "2026-03-17T15:00:00Z" },
                    "isAllDay": false,
                    "showAs": "busy",
                    "lastModifiedDateTime": "2026-03-16T11:00:00Z"
                },
                {
                    "id": "o-utc-3",
                    "subject": "Negative Offset",
                    "start": { "dateTime": "2026-03-17T10:00:00-08:00" },
                    "end": { "dateTime": "2026-03-17T11:00:00-08:00" },
                    "isAllDay": false,
                    "showAs": "busy",
                    "lastModifiedDateTime": "2026-03-16T11:00:00Z"
                }
            ]
        });

        let events = parse_outlook_events(&json, "acct-2");
        assert_eq!(events.len(), 3);

        // No timezone info -> Z appended
        assert!(events[0].start_time.ends_with('Z'), "Expected Z suffix, got: {}", events[0].start_time);
        assert!(events[0].end_time.ends_with('Z'));

        // Already has Z -> unchanged
        assert_eq!(events[1].start_time, "2026-03-17T14:00:00Z");

        // Has negative offset (pos > 10) -> kept as-is
        assert_eq!(events[2].start_time, "2026-03-17T10:00:00-08:00");
    }

    #[test]
    fn test_disable_calendar_account() {
        let conn = setup_test_db();
        let account = make_test_account(&conn);

        // Account starts enabled
        let accounts = list_calendar_accounts(&conn).unwrap();
        assert!(accounts[0].enabled);

        // Disable it
        disable_calendar_account(&conn, &account.id).unwrap();

        // Verify disabled
        let accounts = list_calendar_accounts(&conn).unwrap();
        assert!(!accounts[0].enabled);
    }

    #[test]
    fn test_delete_events_by_ids() {
        let conn = setup_test_db();
        let account = make_test_account(&conn);

        let events = vec![
            CalendarEvent {
                id: "del-evt-1".to_string(),
                account_id: account.id.clone(),
                title: "To Delete".to_string(),
                description: "".to_string(),
                location: None,
                start_time: "2026-03-17T10:00:00Z".to_string(),
                end_time: "2026-03-17T11:00:00Z".to_string(),
                all_day: false,
                attendees: vec![],
                status: "confirmed".to_string(),
                updated_at: "2026-03-17T09:00:00Z".to_string(),
            },
            CalendarEvent {
                id: "del-evt-2".to_string(),
                account_id: account.id.clone(),
                title: "Keep This".to_string(),
                description: "".to_string(),
                location: None,
                start_time: "2026-03-17T14:00:00Z".to_string(),
                end_time: "2026-03-17T15:00:00Z".to_string(),
                all_day: false,
                attendees: vec![],
                status: "confirmed".to_string(),
                updated_at: "2026-03-17T09:00:00Z".to_string(),
            },
        ];
        save_events(&conn, &events).unwrap();

        // Delete only the first event
        let ids = vec!["del-evt-1".to_string()];
        let deleted = delete_events_by_ids(&conn, &ids, &account.id).unwrap();
        assert_eq!(deleted, 1);

        // Verify only the second event remains
        let remaining = list_events_for_range(&conn, "2026-03-17T00:00:00Z", "2026-03-18T00:00:00Z").unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].id, "del-evt-2");
    }
}
