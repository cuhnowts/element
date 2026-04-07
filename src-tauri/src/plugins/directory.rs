use std::path::{Component, Path, PathBuf};

use super::manifest::{DirectoryScope, OwnedDirectory};

pub struct DirectoryManager {
    app_data_dir: PathBuf,
    project_root: Option<PathBuf>,
}

impl DirectoryManager {
    pub fn new(app_data_dir: PathBuf, project_root: Option<PathBuf>) -> Self {
        Self {
            app_data_dir,
            project_root,
        }
    }

    pub fn set_project_root(&mut self, root: Option<PathBuf>) {
        self.project_root = root;
    }

    pub fn validate_and_resolve(&self, dir: &OwnedDirectory) -> Result<PathBuf, String> {
        let path = Path::new(&dir.path);

        if path.is_absolute() {
            return Err(format!(
                "Directory path must be relative: {}",
                dir.path
            ));
        }

        for component in path.components() {
            match component {
                Component::ParentDir => {
                    return Err(format!(
                        "Directory path must not contain '..': {}",
                        dir.path
                    ));
                }
                Component::RootDir => {
                    return Err(format!(
                        "Directory path must not be absolute: {}",
                        dir.path
                    ));
                }
                _ => {}
            }
        }

        let root = match dir.scope {
            DirectoryScope::Global => &self.app_data_dir,
            DirectoryScope::Project => self.project_root.as_ref().ok_or_else(|| {
                "No project root set for project-scoped directory".to_string()
            })?,
        };

        let resolved = root.join(path);

        // Symlink escape check when parent exists
        let parent = resolved.parent().unwrap_or(&resolved);
        if parent.exists() {
            let canonical_parent = parent
                .canonicalize()
                .map_err(|e| format!("Failed to canonicalize: {}", e))?;
            let canonical_root = root
                .canonicalize()
                .map_err(|e| format!("Failed to canonicalize root: {}", e))?;
            if !canonical_parent.starts_with(&canonical_root) {
                return Err(format!(
                    "Resolved path escapes root: {}",
                    resolved.display()
                ));
            }
        }

        Ok(resolved)
    }

    pub fn create_directory(&self, dir: &OwnedDirectory) -> Result<PathBuf, String> {
        let resolved = self.validate_and_resolve(dir)?;
        std::fs::create_dir_all(&resolved)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
        Ok(resolved)
    }

    pub fn purge_directory(&self, dir: &OwnedDirectory) -> Result<(), String> {
        let resolved = self.validate_and_resolve(dir)?;
        if resolved.exists() {
            std::fs::remove_dir_all(&resolved)
                .map_err(|e| format!("Failed to remove directory: {}", e))?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugins::manifest::{DirectoryScope, OwnedDirectory};

    fn make_dir(path: &str, scope: DirectoryScope) -> OwnedDirectory {
        OwnedDirectory {
            path: path.to_string(),
            scope,
            description: "test".to_string(),
        }
    }

    #[test]
    fn test_rejects_absolute_path() {
        let mgr = DirectoryManager::new(PathBuf::from("/tmp/app"), None);
        let dir = make_dir("/etc/passwd", DirectoryScope::Global);
        let result = mgr.validate_and_resolve(&dir);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("must be relative"));
    }

    #[test]
    fn test_rejects_parent_traversal() {
        let mgr = DirectoryManager::new(PathBuf::from("/tmp/app"), None);
        let dir = make_dir("../escape", DirectoryScope::Global);
        let result = mgr.validate_and_resolve(&dir);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("must not contain '..'"));
    }

    #[test]
    fn test_global_scope_resolves_against_app_data_dir() {
        let mgr = DirectoryManager::new(PathBuf::from("/tmp/app"), None);
        let dir = make_dir("wiki", DirectoryScope::Global);
        let result = mgr.validate_and_resolve(&dir);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), PathBuf::from("/tmp/app/wiki"));
    }

    #[test]
    fn test_project_scope_resolves_against_project_root() {
        let mgr = DirectoryManager::new(
            PathBuf::from("/tmp/app"),
            Some(PathBuf::from("/tmp/project")),
        );
        let dir = make_dir(".cache", DirectoryScope::Project);
        let result = mgr.validate_and_resolve(&dir);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), PathBuf::from("/tmp/project/.cache"));
    }

    #[test]
    fn test_project_scope_without_root_returns_err() {
        let mgr = DirectoryManager::new(PathBuf::from("/tmp/app"), None);
        let dir = make_dir(".cache", DirectoryScope::Project);
        let result = mgr.validate_and_resolve(&dir);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("No project root"));
    }

    #[test]
    fn test_create_directory_creates_on_disk() {
        let tmp = tempfile::tempdir().unwrap();
        let mgr = DirectoryManager::new(tmp.path().to_path_buf(), None);
        let dir = make_dir("knowledge", DirectoryScope::Global);
        let result = mgr.create_directory(&dir);
        assert!(result.is_ok());
        assert!(tmp.path().join("knowledge").exists());
    }

    #[test]
    fn test_set_project_root() {
        let mut mgr = DirectoryManager::new(PathBuf::from("/tmp/app"), None);
        let dir = make_dir(".data", DirectoryScope::Project);

        assert!(mgr.validate_and_resolve(&dir).is_err());

        mgr.set_project_root(Some(PathBuf::from("/tmp/project")));
        let result = mgr.validate_and_resolve(&dir);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), PathBuf::from("/tmp/project/.data"));
    }

    #[test]
    fn test_nested_relative_path() {
        let mgr = DirectoryManager::new(PathBuf::from("/tmp/app"), None);
        let dir = make_dir("data/sub/deep", DirectoryScope::Global);
        let result = mgr.validate_and_resolve(&dir);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), PathBuf::from("/tmp/app/data/sub/deep"));
    }

    #[test]
    fn test_purge_directory() {
        let tmp = tempfile::tempdir().unwrap();
        let mgr = DirectoryManager::new(tmp.path().to_path_buf(), None);
        let dir = make_dir("to_remove", DirectoryScope::Global);

        // Create it first
        mgr.create_directory(&dir).unwrap();
        assert!(tmp.path().join("to_remove").exists());

        // Purge it
        mgr.purge_directory(&dir).unwrap();
        assert!(!tmp.path().join("to_remove").exists());
    }

    #[test]
    fn test_purge_nonexistent_is_ok() {
        let tmp = tempfile::tempdir().unwrap();
        let mgr = DirectoryManager::new(tmp.path().to_path_buf(), None);
        let dir = make_dir("nonexistent", DirectoryScope::Global);
        assert!(mgr.purge_directory(&dir).is_ok());
    }
}
