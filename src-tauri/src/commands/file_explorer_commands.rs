use serde::Serialize;
use std::collections::HashSet;
use std::path::Path;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// A file/directory entry returned by list_directory.
#[derive(Debug, Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_hidden: bool,
}

/// Managed state for the file system watcher.
pub struct FileWatcherState {
    pub watcher:
        std::sync::Mutex<Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>,
}

const HARDCODED_EXCLUDES: &[&str] = &["node_modules", ".git", "target", "__pycache__", ".DS_Store"];

/// Core listing logic extracted for testability. Synchronous -- callers must
/// wrap in `spawn_blocking` when called from async context.
pub fn list_directory_impl(dir_path: &str, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(dir_path);
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", dir_path));
    }

    let mut entries = if show_hidden {
        // Return ALL entries, marking hidden ones with is_hidden = true.
        // Build gitignore matcher from the directory and its parents.
        let mut gi_builder = ignore::gitignore::GitignoreBuilder::new(dir_path);
        // Walk up to find .gitignore files
        let mut current = Some(path.to_path_buf());
        while let Some(ref p) = current {
            let gi_file = p.join(".gitignore");
            if gi_file.exists() {
                let _ = gi_builder.add(&gi_file);
            }
            current = p.parent().map(|pp| pp.to_path_buf());
            // Stop if we hit a directory without .git (we've left the repo)
            if current
                .as_ref()
                .map_or(true, |c| !c.join(".git").exists() && c.parent().is_none())
            {
                // keep going -- gitignore can be nested
            }
        }
        let gitignore = gi_builder.build().unwrap_or_else(|_| {
            ignore::gitignore::GitignoreBuilder::new(dir_path)
                .build()
                .unwrap()
        });

        let read_dir =
            std::fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

        let mut result = Vec::new();
        for entry_result in read_dir {
            let entry = match entry_result {
                Ok(e) => e,
                Err(_) => continue,
            };
            let name = entry.file_name().to_string_lossy().to_string();
            let entry_path = entry.path();
            let is_dir = entry_path.is_dir();

            let in_hardcoded = HARDCODED_EXCLUDES.contains(&name.as_str());
            let gi_match = gitignore
                .matched_path_or_any_parents(&entry_path, is_dir)
                .is_ignore();
            let is_hidden = in_hardcoded || gi_match;

            result.push(FileEntry {
                name,
                path: entry_path.to_string_lossy().to_string(),
                is_dir,
                is_hidden,
            });
        }
        result
    } else {
        // Use ignore crate WalkBuilder for gitignore-aware filtering.
        let walker = ignore::WalkBuilder::new(dir_path)
            .max_depth(Some(1))
            .hidden(false)
            .git_ignore(true)
            .git_global(true)
            .git_exclude(true)
            .build();

        let root = path.to_path_buf();
        let mut result = Vec::new();
        for entry_result in walker {
            let entry = match entry_result {
                Ok(e) => e,
                Err(_) => continue,
            };
            // Skip the root entry itself
            if entry.path() == root {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            // Skip hardcoded excludes
            if HARDCODED_EXCLUDES.contains(&name.as_str()) {
                continue;
            }
            let entry_path = entry.path().to_path_buf();
            let is_dir = entry_path.is_dir();

            result.push(FileEntry {
                name,
                path: entry_path.to_string_lossy().to_string(),
                is_dir,
                is_hidden: false,
            });
        }
        result
    };

    // Sort: folders first, then case-insensitive alphabetical
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

/// List a single directory level, respecting .gitignore and hardcoded excludes.
#[tauri::command]
pub async fn list_directory(dir_path: String, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    tokio::task::spawn_blocking(move || list_directory_impl(&dir_path, show_hidden))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

/// Open a file in the OS default editor/application.
#[tauri::command]
pub async fn open_file_in_editor(file_path: String) -> Result<(), String> {
    open::that_detached(&file_path).map_err(|e| format!("Failed to open file: {}", e))
}

/// Reveal a file or directory in the native file manager (Finder/Explorer).
#[tauri::command]
pub async fn reveal_in_file_manager(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to reveal in Finder: {}", e))?;
        Ok(())
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| format!("Failed to reveal in Explorer: {}", e))?;
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        let p = Path::new(&path);
        let parent = p
            .parent()
            .map(|pp| pp.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());
        open::that_detached(&parent)
            .map_err(|e| format!("Failed to reveal in file manager: {}", e))?;
        Ok(())
    }
}

/// Start a recursive file watcher with debouncing. Emits "file-system-changed"
/// events to the frontend with a list of changed parent directories.
#[tauri::command]
pub async fn start_file_watcher(
    app: AppHandle,
    state: tauri::State<'_, FileWatcherState>,
    dir_path: String,
) -> Result<(), String> {
    let mut guard = state
        .watcher
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    // Stop any existing watcher
    *guard = None;

    let app_clone = app.clone();
    let debouncer = notify_debouncer_mini::new_debouncer(
        Duration::from_millis(500),
        move |res: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
            if let Ok(events) = res {
                let changed_dirs: HashSet<String> = events
                    .iter()
                    .filter_map(|event| {
                        event.path.parent().map(|p| p.to_string_lossy().to_string())
                    })
                    .collect();
                let changed_dirs_vec: Vec<String> = changed_dirs.into_iter().collect();
                let _ = app_clone.emit("file-system-changed", changed_dirs_vec);
            }
        },
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    // We need mutable access to the debouncer to call watcher().watch(),
    // so we store it first then access via the guard.
    *guard = Some(debouncer);

    if let Some(ref mut debouncer) = *guard {
        debouncer
            .watcher()
            .watch(Path::new(&dir_path), notify::RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch directory: {}", e))?;
    }

    Ok(())
}

/// Stop the file watcher, releasing all resources.
#[tauri::command]
pub async fn stop_file_watcher(state: tauri::State<'_, FileWatcherState>) -> Result<(), String> {
    let mut guard = state
        .watcher
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    // Dropping the debouncer stops the watcher
    *guard = None;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn setup_test_dir() -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        // Create .gitignore
        fs::write(dir.path().join(".gitignore"), "*.log\nsecret/\n").unwrap();
        // Create files
        fs::write(dir.path().join("README.md"), "# readme").unwrap();
        fs::write(dir.path().join("app.rs"), "fn main() {}").unwrap();
        fs::write(dir.path().join("debug.log"), "log data").unwrap();
        fs::write(dir.path().join(".DS_Store"), "").unwrap();
        // Create directories
        fs::create_dir(dir.path().join("src")).unwrap();
        fs::create_dir(dir.path().join("node_modules")).unwrap();
        fs::create_dir(dir.path().join("secret")).unwrap();
        fs::create_dir(dir.path().join(".git")).unwrap();
        dir
    }

    #[test]
    fn test_list_directory_hides_gitignored_and_excludes() {
        let dir = setup_test_dir();
        let dir_path = dir.path().to_string_lossy().to_string();

        let result = list_directory_impl(&dir_path, false).unwrap();
        let names: Vec<&str> = result.iter().map(|e| e.name.as_str()).collect();

        // Should NOT contain gitignored or hardcoded excludes
        assert!(
            !names.contains(&"debug.log"),
            "debug.log should be filtered by gitignore"
        );
        assert!(
            !names.contains(&"node_modules"),
            "node_modules should be filtered by hardcoded excludes"
        );
        assert!(
            !names.contains(&".git"),
            ".git should be filtered by hardcoded excludes"
        );
        assert!(
            !names.contains(&".DS_Store"),
            ".DS_Store should be filtered by hardcoded excludes"
        );
        assert!(
            !names.contains(&"secret"),
            "secret/ should be filtered by gitignore"
        );

        // Should contain non-ignored entries
        assert!(names.contains(&"README.md"), "README.md should be present");
        assert!(names.contains(&"app.rs"), "app.rs should be present");
        assert!(names.contains(&"src"), "src/ should be present");
    }

    #[test]
    fn test_list_directory_show_hidden_includes_all() {
        let dir = setup_test_dir();
        let dir_path = dir.path().to_string_lossy().to_string();

        let result = list_directory_impl(&dir_path, true).unwrap();
        let names: Vec<&str> = result.iter().map(|e| e.name.as_str()).collect();

        // Should contain ALL entries
        assert!(names.contains(&"node_modules"));
        assert!(names.contains(&".git"));
        assert!(names.contains(&"debug.log"));
        assert!(names.contains(&"secret"));
        assert!(names.contains(&"README.md"));

        // Check is_hidden flags
        let find = |name: &str| result.iter().find(|e| e.name == name).unwrap();
        assert!(
            find("node_modules").is_hidden,
            "node_modules should be marked hidden"
        );
        assert!(find(".git").is_hidden, ".git should be marked hidden");
        assert!(
            find(".DS_Store").is_hidden,
            ".DS_Store should be marked hidden"
        );
        assert!(
            find("debug.log").is_hidden,
            "debug.log should be marked hidden (gitignored)"
        );
        assert!(
            !find("README.md").is_hidden,
            "README.md should NOT be marked hidden"
        );
    }

    #[test]
    fn test_list_directory_sorts_folders_first() {
        let dir = setup_test_dir();
        let dir_path = dir.path().to_string_lossy().to_string();

        let result = list_directory_impl(&dir_path, false).unwrap();

        // Find the index where directories end and files begin
        let first_file_idx = result.iter().position(|e| !e.is_dir);
        let last_dir_idx = result.iter().rposition(|e| e.is_dir);

        if let (Some(first_file), Some(last_dir)) = (first_file_idx, last_dir_idx) {
            assert!(
                last_dir < first_file,
                "All directories should come before all files"
            );
        }

        // Check alphabetical within groups
        let dirs: Vec<&str> = result
            .iter()
            .filter(|e| e.is_dir)
            .map(|e| e.name.as_str())
            .collect();
        let files: Vec<&str> = result
            .iter()
            .filter(|e| !e.is_dir)
            .map(|e| e.name.as_str())
            .collect();

        for pair in dirs.windows(2) {
            assert!(
                pair[0].to_lowercase() <= pair[1].to_lowercase(),
                "Directories should be sorted alphabetically: {} vs {}",
                pair[0],
                pair[1]
            );
        }
        for pair in files.windows(2) {
            assert!(
                pair[0].to_lowercase() <= pair[1].to_lowercase(),
                "Files should be sorted alphabetically: {} vs {}",
                pair[0],
                pair[1]
            );
        }
    }

    #[test]
    fn test_list_directory_invalid_path_returns_error() {
        let result = list_directory_impl("/nonexistent/path/that/does/not/exist", false);
        assert!(result.is_err(), "Should return error for invalid path");
        let err = result.unwrap_err();
        assert!(
            err.contains("Not a directory"),
            "Error should mention 'Not a directory': {}",
            err
        );
    }
}
