use std::path::PathBuf;
use std::sync::Arc;
use std::sync::Mutex as StdMutex;

use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::planning_sync::{
    compute_content_hash, parse_roadmap, sync_roadmap_to_db, SyncResult,
};

/// Managed state for the .planning/ directory watcher.
/// Separate from PlanWatcherState (onboarding) per D-07.
pub struct PlanningWatcherState {
    pub watcher: StdMutex<Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>,
    pub last_hash: StdMutex<Option<String>>,
}

/// Sync a project's .planning/ROADMAP.md into the database.
///
/// Reads the file, computes SHA-256 hash, skips if unchanged,
/// parses phases/tasks, and does full-replace sync with source='sync'.
/// Emits `planning-sync-complete` or `planning-sync-error` Tauri events.
#[tauri::command]
pub async fn sync_planning_roadmap(
    app: AppHandle,
    db_state: State<'_, Arc<StdMutex<Database>>>,
    watcher_state: State<'_, PlanningWatcherState>,
    project_id: String,
    directory_path: String,
) -> Result<SyncResult, String> {
    let roadmap_path = PathBuf::from(&directory_path)
        .join(".planning")
        .join("ROADMAP.md");

    let content = std::fs::read_to_string(&roadmap_path).map_err(|e| {
        let msg = format!("Failed to read ROADMAP.md: {}", e);
        let _ = app.emit("planning-sync-error", &msg);
        msg
    })?;

    // Compute hash and check if content has changed
    let new_hash = compute_content_hash(&content);

    {
        let last_hash = watcher_state.last_hash.lock().map_err(|e| e.to_string())?;
        if let Some(ref existing_hash) = *last_hash {
            if *existing_hash == new_hash {
                // Content unchanged, skip sync silently (D-08)
                return Ok(SyncResult {
                    phase_count: 0,
                    task_count: 0,
                });
            }
        }
    }

    // Parse ROADMAP.md
    let parsed = match parse_roadmap(&content) {
        Ok(result) => result,
        Err(e) => {
            let msg = format!("Failed to parse ROADMAP.md: {}", e);
            let _ = app.emit("planning-sync-error", &msg);
            return Err(msg);
        }
    };

    // Lock DB and sync
    let db = db_state.lock().map_err(|e| e.to_string())?;
    let sync_result = sync_roadmap_to_db(&db, &project_id, &parsed)?;

    // Update last hash after successful sync
    {
        let mut last_hash = watcher_state.last_hash.lock().map_err(|e| e.to_string())?;
        *last_hash = Some(new_hash);
    }

    // Emit success event (D-12)
    let _ = app.emit("planning-sync-complete", &sync_result);

    Ok(sync_result)
}

/// Start watching the .planning/ directory for ROADMAP.md changes.
///
/// Creates a debounced file watcher with 500ms interval. When ROADMAP.md
/// changes are detected, emits a `planning-file-changed` event with the
/// project_id so the frontend can trigger sync_planning_roadmap.
///
/// Uses NonRecursive mode per D-06 (watch .planning/ dir, not subdirs).
#[tauri::command]
pub async fn start_planning_watcher(
    app: AppHandle,
    watcher_state: State<'_, PlanningWatcherState>,
    project_id: String,
    directory_path: String,
) -> Result<(), String> {
    use notify_debouncer_mini::new_debouncer;
    use std::time::Duration;

    let planning_dir = PathBuf::from(&directory_path).join(".planning");

    // If .planning/ directory does not exist, return silently
    if !planning_dir.exists() {
        return Ok(());
    }

    let app_handle = app.clone();
    let pid = project_id.clone();

    // Read current ROADMAP.md hash so watcher can compare
    let roadmap_path = planning_dir.join("ROADMAP.md");
    if roadmap_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&roadmap_path) {
            let hash = compute_content_hash(&content);
            let mut last_hash = watcher_state.last_hash.lock().map_err(|e| e.to_string())?;
            *last_hash = Some(hash);
        }
    }

    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        move |events: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
            if let Ok(events) = events {
                let roadmap_changed = events
                    .iter()
                    .any(|e| e.path.file_name() == Some(std::ffi::OsStr::new("ROADMAP.md")));
                if roadmap_changed {
                    // Emit event for frontend to trigger sync (Pitfall 4: don't block notify thread)
                    let _ = app_handle.emit("planning-file-changed", &pid);
                }
            }
        },
    )
    .map_err(|e| e.to_string())?;

    debouncer
        .watcher()
        .watch(&planning_dir, notify::RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    let mut state = watcher_state.watcher.lock().map_err(|e| e.to_string())?;
    *state = Some(debouncer);

    Ok(())
}

/// Stop watching the .planning/ directory.
///
/// Drops the debouncer (stops watching) and clears the last hash
/// so the next project gets a fresh start.
#[tauri::command]
pub async fn stop_planning_watcher(
    watcher_state: State<'_, PlanningWatcherState>,
) -> Result<(), String> {
    {
        let mut state = watcher_state.watcher.lock().map_err(|e| e.to_string())?;
        *state = None; // Drop the debouncer, stops watching
    }
    {
        let mut last_hash = watcher_state.last_hash.lock().map_err(|e| e.to_string())?;
        *last_hash = None; // Clear hash for fresh start on next project
    }
    Ok(())
}
