pub mod api;
pub mod core;
pub mod manifest;
pub mod registry;

use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use manifest::{load_plugin_manifest, PluginError};
use registry::{LoadedPlugin, PluginRegistry, PluginStatus};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginLoadResult {
    pub name: String,
    pub success: bool,
    pub error: Option<String>,
}

pub struct PluginHost {
    plugins_dir: PathBuf,
    registry: Arc<RwLock<PluginRegistry>>,
    #[allow(dead_code)]
    watcher: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
}

impl PluginHost {
    pub fn new(plugins_dir: PathBuf) -> Self {
        Self {
            plugins_dir,
            registry: Arc::new(RwLock::new(PluginRegistry::new())),
            watcher: None,
        }
    }

    pub fn scan_and_load(&self) -> Vec<PluginLoadResult> {
        let mut results = Vec::new();

        // Register core plugins first (built-in)
        if let Ok(mut reg) = self.registry.write() {
            core::register_core_plugins(&mut reg);
        }

        let entries = match std::fs::read_dir(&self.plugins_dir) {
            Ok(entries) => entries,
            Err(e) => {
                eprintln!(
                    "Failed to read plugins directory {}: {}",
                    self.plugins_dir.display(),
                    e
                );
                return results;
            }
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            match load_plugin_manifest(&path) {
                Ok(manifest) => {
                    let name = manifest.name.clone();
                    let plugin = LoadedPlugin {
                        manifest,
                        status: PluginStatus::Active,
                        error_message: None,
                        loaded_at: chrono::Utc::now().to_rfc3339(),
                        plugin_path: path,
                    };
                    if let Ok(mut reg) = self.registry.write() {
                        reg.register(plugin);
                    }
                    results.push(PluginLoadResult {
                        name,
                        success: true,
                        error: None,
                    });
                }
                Err(e) => {
                    let name = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| "unknown".to_string());
                    let error_msg = e.to_string();

                    // Register as error plugin if manifest was found but invalid
                    if !matches!(e, PluginError::ManifestNotFound(_)) {
                        if let Ok(mut reg) = self.registry.write() {
                            reg.register(LoadedPlugin {
                                manifest: manifest::PluginManifest {
                                    name: name.clone(),
                                    version: "0.0.0".to_string(),
                                    display_name: name.clone(),
                                    description: String::new(),
                                    author: None,
                                    capabilities: vec![],
                                    credentials: vec![],
                                    entry: None,
                                    step_types: vec![],
                                },
                                status: PluginStatus::Error,
                                error_message: Some(error_msg.clone()),
                                loaded_at: chrono::Utc::now().to_rfc3339(),
                                plugin_path: path,
                            });
                        }
                    }

                    results.push(PluginLoadResult {
                        name,
                        success: false,
                        error: Some(error_msg),
                    });
                }
            }
        }

        results
    }

    pub fn start_watching(&mut self) -> Result<(), notify::Error> {
        use notify::Watcher;
        use notify_debouncer_mini::new_debouncer;
        use std::time::Duration;

        let registry = self.registry.clone();
        let plugins_dir = self.plugins_dir.clone();

        let mut debouncer = new_debouncer(
            Duration::from_millis(500),
            move |events: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
                if let Ok(events) = events {
                    // Collect unique plugin directories that changed
                    let mut changed_dirs = std::collections::HashSet::new();
                    for event in &events {
                        // Find the plugin directory (first-level subdirectory)
                        if let Ok(relative) = event.path.strip_prefix(&plugins_dir) {
                            if let Some(plugin_dir_name) =
                                relative.components().next()
                            {
                                changed_dirs.insert(
                                    plugins_dir.join(plugin_dir_name.as_os_str()),
                                );
                            }
                        }
                    }

                    // Reload changed plugins
                    for dir in changed_dirs {
                        if !dir.is_dir() {
                            // Directory was deleted -- remove plugin
                            let name = dir
                                .file_name()
                                .map(|n| n.to_string_lossy().to_string())
                                .unwrap_or_default();
                            if let Ok(mut reg) = registry.write() {
                                reg.remove(&name);
                            }
                            continue;
                        }

                        match load_plugin_manifest(&dir) {
                            Ok(manifest) => {
                                let plugin = LoadedPlugin {
                                    manifest,
                                    status: PluginStatus::Active,
                                    error_message: None,
                                    loaded_at: chrono::Utc::now().to_rfc3339(),
                                    plugin_path: dir,
                                };
                                if let Ok(mut reg) = registry.write() {
                                    reg.register(plugin);
                                }
                            }
                            Err(e) => {
                                let name = dir
                                    .file_name()
                                    .map(|n| n.to_string_lossy().to_string())
                                    .unwrap_or_default();
                                if let Ok(mut reg) = registry.write() {
                                    reg.set_status(
                                        &name,
                                        PluginStatus::Error,
                                        Some(e.to_string()),
                                    );
                                }
                            }
                        }
                    }
                }
            },
        )?;

        debouncer
            .watcher()
            .watch(
                &self.plugins_dir,
                notify::RecursiveMode::Recursive,
            )?;

        self.watcher = Some(debouncer);
        Ok(())
    }

    pub fn get_plugin(&self, name: &str) -> Option<LoadedPlugin> {
        self.registry
            .read()
            .ok()
            .and_then(|reg| reg.get(name).cloned())
    }

    pub fn set_enabled(&self, name: &str, enabled: bool) -> Result<(), PluginError> {
        let mut reg = self
            .registry
            .write()
            .map_err(|e| PluginError::LoadError(e.to_string()))?;

        if reg.get(name).is_none() {
            return Err(PluginError::NotFound(name.to_string()));
        }

        let status = if enabled {
            PluginStatus::Active
        } else {
            PluginStatus::Disabled
        };

        reg.set_status(name, status, None);
        Ok(())
    }

    pub fn list_plugins(&self) -> Vec<LoadedPlugin> {
        self.registry
            .read()
            .map(|reg| reg.list().into_iter().cloned().collect())
            .unwrap_or_default()
    }

    pub fn plugins_dir(&self) -> &Path {
        &self.plugins_dir
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn create_test_plugins_dir() -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();

        // Create a valid plugin
        let plugin_dir = dir.path().join("valid-plugin");
        fs::create_dir(&plugin_dir).unwrap();
        fs::write(
            plugin_dir.join("plugin.json"),
            r#"{
                "name": "valid-plugin",
                "version": "1.0.0",
                "display_name": "Valid Plugin",
                "description": "A valid test plugin"
            }"#,
        )
        .unwrap();

        // Create a plugin with invalid manifest
        let invalid_dir = dir.path().join("invalid-plugin");
        fs::create_dir(&invalid_dir).unwrap();
        fs::write(invalid_dir.join("plugin.json"), "{ broken json").unwrap();

        // Create a directory without manifest (should be skipped)
        let empty_dir = dir.path().join("no-manifest");
        fs::create_dir(&empty_dir).unwrap();

        dir
    }

    #[test]
    fn test_scan_and_load_finds_valid_plugins() {
        let dir = create_test_plugins_dir();
        let host = PluginHost::new(dir.path().to_path_buf());
        let results = host.scan_and_load();

        let valid: Vec<_> = results.iter().filter(|r| r.success).collect();
        assert_eq!(valid.len(), 1);
        assert_eq!(valid[0].name, "valid-plugin");
    }

    #[test]
    fn test_scan_and_load_records_errors() {
        let dir = create_test_plugins_dir();
        let host = PluginHost::new(dir.path().to_path_buf());
        let results = host.scan_and_load();

        let errors: Vec<_> = results.iter().filter(|r| !r.success).collect();
        assert!(!errors.is_empty());
    }

    #[test]
    fn test_get_plugin() {
        let dir = create_test_plugins_dir();
        let host = PluginHost::new(dir.path().to_path_buf());
        host.scan_and_load();

        assert!(host.get_plugin("valid-plugin").is_some());
        assert!(host.get_plugin("nonexistent").is_none());
    }

    #[test]
    fn test_set_enabled() {
        let dir = create_test_plugins_dir();
        let host = PluginHost::new(dir.path().to_path_buf());
        host.scan_and_load();

        host.set_enabled("valid-plugin", false).unwrap();
        let plugin = host.get_plugin("valid-plugin").unwrap();
        assert_eq!(plugin.status, PluginStatus::Disabled);

        host.set_enabled("valid-plugin", true).unwrap();
        let plugin = host.get_plugin("valid-plugin").unwrap();
        assert_eq!(plugin.status, PluginStatus::Active);
    }

    #[test]
    fn test_set_enabled_nonexistent_returns_error() {
        let dir = tempfile::tempdir().unwrap();
        let host = PluginHost::new(dir.path().to_path_buf());
        let result = host.set_enabled("nonexistent", true);
        assert!(result.is_err());
    }

    #[test]
    fn test_list_plugins() {
        let dir = create_test_plugins_dir();
        let host = PluginHost::new(dir.path().to_path_buf());
        host.scan_and_load();

        let all = host.list_plugins();
        // valid-plugin + invalid-plugin (loaded as error)
        assert!(all.len() >= 1);
    }
}
