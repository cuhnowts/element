use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ErrorLogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack: Option<String>,
}

/// Maximum log file size before truncation (1 MB)
const MAX_LOG_BYTES: u64 = 1_048_576;

/// Truncate the log file if it exceeds MAX_LOG_BYTES.
/// Called before appending to prevent unbounded growth.
fn truncate_if_oversized(path: &PathBuf) -> Result<(), String> {
    if let Ok(meta) = std::fs::metadata(path) {
        if meta.len() > MAX_LOG_BYTES {
            std::fs::write(path, "")
                .map_err(|e| format!("Failed to truncate error log: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn log_errors(
    project_dir: String,
    entries: Vec<ErrorLogEntry>,
) -> Result<(), String> {
    if entries.is_empty() {
        return Ok(());
    }

    let log_path = PathBuf::from(&project_dir)
        .join(".element")
        .join("errors.log");

    // Ensure .element/ directory exists
    if let Some(parent) = log_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create .element dir: {}", e))?;
    }

    // Truncate if file exceeds 1MB
    truncate_if_oversized(&log_path)?;

    // Open in append mode, create if missing
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("Failed to open error log: {}", e))?;

    for entry in &entries {
        let line = serde_json::to_string(entry)
            .map_err(|e| format!("Failed to serialize log entry: {}", e))?;
        writeln!(file, "{}", line)
            .map_err(|e| format!("Failed to write log entry: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_log_errors_creates_element_dir_and_file() {
        let tmp = TempDir::new().unwrap();
        let project_dir = tmp.path().to_string_lossy().to_string();

        let entries = vec![ErrorLogEntry {
            timestamp: "2026-04-05T14:30:00.000Z".to_string(),
            level: "error".to_string(),
            message: "test error".to_string(),
            stack: None,
        }];

        log_errors(project_dir.clone(), entries).await.unwrap();

        let log_path = tmp.path().join(".element").join("errors.log");
        assert!(log_path.exists());
        let content = fs::read_to_string(&log_path).unwrap();
        assert!(content.contains("test error"));
        assert!(content.contains("\"level\":\"error\""));
    }

    #[tokio::test]
    async fn test_log_errors_appends_json_lines() {
        let tmp = TempDir::new().unwrap();
        let project_dir = tmp.path().to_string_lossy().to_string();

        let entry1 = vec![ErrorLogEntry {
            timestamp: "2026-04-05T14:30:00.000Z".to_string(),
            level: "error".to_string(),
            message: "first".to_string(),
            stack: None,
        }];
        let entry2 = vec![ErrorLogEntry {
            timestamp: "2026-04-05T14:31:00.000Z".to_string(),
            level: "error".to_string(),
            message: "second".to_string(),
            stack: Some("Error: second\n  at foo.ts:1".to_string()),
        }];

        log_errors(project_dir.clone(), entry1).await.unwrap();
        log_errors(project_dir.clone(), entry2).await.unwrap();

        let log_path = tmp.path().join(".element").join("errors.log");
        let content = fs::read_to_string(&log_path).unwrap();
        let lines: Vec<&str> = content.trim().lines().collect();
        assert_eq!(lines.len(), 2);
        assert!(lines[0].contains("first"));
        assert!(lines[1].contains("second"));
        assert!(lines[1].contains("foo.ts:1"));
    }

    #[tokio::test]
    async fn test_log_errors_truncates_oversized_file() {
        let tmp = TempDir::new().unwrap();
        let project_dir = tmp.path().to_string_lossy().to_string();
        let element_dir = tmp.path().join(".element");
        fs::create_dir_all(&element_dir).unwrap();
        let log_path = element_dir.join("errors.log");

        // Write a file larger than 1MB
        let big_content = "x".repeat(1_100_000);
        fs::write(&log_path, &big_content).unwrap();

        let entries = vec![ErrorLogEntry {
            timestamp: "2026-04-05T15:00:00.000Z".to_string(),
            level: "error".to_string(),
            message: "after truncation".to_string(),
            stack: None,
        }];

        log_errors(project_dir, entries).await.unwrap();

        let content = fs::read_to_string(&log_path).unwrap();
        // File was truncated then the new entry was appended
        assert!(content.len() < 1000);
        assert!(content.contains("after truncation"));
    }

    #[tokio::test]
    async fn test_log_errors_empty_entries_is_noop() {
        let tmp = TempDir::new().unwrap();
        let project_dir = tmp.path().to_string_lossy().to_string();

        log_errors(project_dir, vec![]).await.unwrap();

        // .element dir should NOT be created for empty batches
        assert!(!tmp.path().join(".element").exists());
    }
}
