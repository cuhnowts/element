use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use crate::plugins::manifest::PluginError;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "operation", rename_all = "snake_case")]
pub enum FsStepInput {
    Read { path: String },
    Write { path: String, content: String },
    List { path: String },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(untagged)]
pub enum FsStepOutput {
    Content { content: String },
    Written { path: String, bytes_written: usize },
    Listing { entries: Vec<FsEntry> },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FsEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

pub struct FilesystemPlugin {
    pub allowed_paths: Vec<PathBuf>,
}

impl FilesystemPlugin {
    pub fn new(allowed_paths: Vec<PathBuf>) -> Self {
        Self { allowed_paths }
    }

    fn validate_path(&self, path: &Path) -> Result<PathBuf, PluginError> {
        let canonical = std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());

        for allowed in &self.allowed_paths {
            let allowed_canonical =
                std::fs::canonicalize(allowed).unwrap_or_else(|_| allowed.clone());
            if canonical.starts_with(&allowed_canonical) {
                return Ok(canonical);
            }
        }

        Err(PluginError::LoadError(format!(
            "Path '{}' is outside allowed paths",
            path.display()
        )))
    }

    pub async fn execute(&self, input: FsStepInput) -> Result<FsStepOutput, PluginError> {
        match input {
            FsStepInput::Read { path } => {
                let validated = self.validate_path(Path::new(&path))?;
                let content = tokio::fs::read_to_string(&validated)
                    .await
                    .map_err(|e| PluginError::LoadError(format!("Failed to read file: {}", e)))?;
                Ok(FsStepOutput::Content { content })
            }
            FsStepInput::Write { path, content } => {
                let target = Path::new(&path);
                // For write, validate parent directory exists within scope
                let parent = target
                    .parent()
                    .ok_or_else(|| PluginError::LoadError("Invalid path".to_string()))?;
                let _ = self.validate_path(parent)?;
                tokio::fs::write(target, &content)
                    .await
                    .map_err(|e| PluginError::LoadError(format!("Failed to write file: {}", e)))?;
                let bytes_written = content.len();
                Ok(FsStepOutput::Written {
                    path: path.clone(),
                    bytes_written,
                })
            }
            FsStepInput::List { path } => {
                let validated = self.validate_path(Path::new(&path))?;
                let mut entries = Vec::new();
                let mut read_dir = tokio::fs::read_dir(&validated)
                    .await
                    .map_err(|e| PluginError::LoadError(format!("Failed to list dir: {}", e)))?;

                while let Ok(Some(entry)) = read_dir.next_entry().await {
                    let metadata = entry.metadata().await.unwrap_or_else(|_| {
                        std::fs::metadata(entry.path()).unwrap_or_else(|_| {
                            // Fallback: shouldn't happen but handle gracefully
                            std::fs::metadata(if cfg!(target_os = "windows") { "NUL" } else { "/dev/null" }).unwrap()
                        })
                    });
                    entries.push(FsEntry {
                        name: entry.file_name().to_string_lossy().to_string(),
                        path: entry.path().to_string_lossy().to_string(),
                        is_dir: metadata.is_dir(),
                        size: metadata.len(),
                    });
                }

                Ok(FsStepOutput::Listing { entries })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[tokio::test]
    async fn test_fs_read_file() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        fs::write(&file_path, "hello world").unwrap();

        let plugin = FilesystemPlugin::new(vec![dir.path().to_path_buf()]);
        let result = plugin
            .execute(FsStepInput::Read {
                path: file_path.to_string_lossy().to_string(),
            })
            .await
            .unwrap();

        match result {
            FsStepOutput::Content { content } => assert_eq!(content, "hello world"),
            _ => panic!("Expected Content output"),
        }
    }

    #[tokio::test]
    async fn test_fs_write_file() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("output.txt");

        let plugin = FilesystemPlugin::new(vec![dir.path().to_path_buf()]);
        let result = plugin
            .execute(FsStepInput::Write {
                path: file_path.to_string_lossy().to_string(),
                content: "written content".to_string(),
            })
            .await
            .unwrap();

        match result {
            FsStepOutput::Written { bytes_written, .. } => assert_eq!(bytes_written, 15),
            _ => panic!("Expected Written output"),
        }

        let read_back = fs::read_to_string(&file_path).unwrap();
        assert_eq!(read_back, "written content");
    }

    #[tokio::test]
    async fn test_fs_list_directory() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.txt"), "a").unwrap();
        fs::write(dir.path().join("b.txt"), "b").unwrap();
        fs::create_dir(dir.path().join("subdir")).unwrap();

        let plugin = FilesystemPlugin::new(vec![dir.path().to_path_buf()]);
        let result = plugin
            .execute(FsStepInput::List {
                path: dir.path().to_string_lossy().to_string(),
            })
            .await
            .unwrap();

        match result {
            FsStepOutput::Listing { entries } => {
                assert_eq!(entries.len(), 3);
                let names: Vec<&str> = entries.iter().map(|e| e.name.as_str()).collect();
                assert!(names.contains(&"a.txt"));
                assert!(names.contains(&"b.txt"));
                assert!(names.contains(&"subdir"));
                let subdir = entries.iter().find(|e| e.name == "subdir").unwrap();
                assert!(subdir.is_dir);
            }
            _ => panic!("Expected Listing output"),
        }
    }

    #[tokio::test]
    async fn test_fs_rejects_path_outside_scope() {
        let dir = tempfile::tempdir().unwrap();
        let plugin = FilesystemPlugin::new(vec![dir.path().to_path_buf()]);

        let result = plugin
            .execute(FsStepInput::Read {
                path: "/etc/passwd".to_string(),
            })
            .await;

        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("outside allowed paths"));
    }
}
