pub mod api;
pub mod core;
pub mod directory;
pub mod manifest;
pub mod registry;

use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use manifest::{load_plugin_manifest, McpToolDefinition, PluginError, PluginManifest};
use registry::{LoadedPlugin, McpToolRegistry, PluginRegistry, PluginStatus, SkillRegistry};
use directory::DirectoryManager;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginLoadResult {
    pub name: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PluginSkillInfo {
    pub prefixed_name: String,
    pub plugin_name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    pub output_schema: serde_json::Value,
    pub destructive: bool,
}

pub struct PluginHost {
    plugins_dir: PathBuf,
    registry: Arc<RwLock<PluginRegistry>>,
    skill_registry: Arc<RwLock<SkillRegistry>>,
    mcp_tool_registry: Arc<RwLock<McpToolRegistry>>,
    directory_manager: Arc<RwLock<DirectoryManager>>,
    db_path: Option<PathBuf>,
    #[allow(dead_code)]
    watcher: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
}

impl PluginHost {
    pub fn new(plugins_dir: PathBuf, app_data_dir: PathBuf) -> Self {
        Self {
            plugins_dir,
            registry: Arc::new(RwLock::new(PluginRegistry::new())),
            skill_registry: Arc::new(RwLock::new(SkillRegistry::new())),
            mcp_tool_registry: Arc::new(RwLock::new(McpToolRegistry::new())),
            directory_manager: Arc::new(RwLock::new(DirectoryManager::new(app_data_dir, None))),
            db_path: None,
            watcher: None,
        }
    }

    pub fn set_db_path(&mut self, path: PathBuf) {
        self.db_path = Some(path);
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
                                    manifest_version: None,
                                    skills: vec![],
                                    mcp_tools: vec![],
                                    owned_directories: vec![],
                                    on_enable: vec![],
                                    on_disable: vec![],
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
                            if let Some(plugin_dir_name) = relative.components().next() {
                                changed_dirs.insert(plugins_dir.join(plugin_dir_name.as_os_str()));
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
                                    reg.set_status(&name, PluginStatus::Error, Some(e.to_string()));
                                }
                            }
                        }
                    }
                }
            },
        )?;

        debouncer
            .watcher()
            .watch(&self.plugins_dir, notify::RecursiveMode::Recursive)?;

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

        let plugin = reg.get(name).ok_or_else(|| PluginError::NotFound(name.to_string()))?;
        let manifest = plugin.manifest.clone();

        if enabled {
            // Execute on_enable lifecycle hooks
            self.execute_lifecycle_hooks(name, &manifest, true)?;

            // Register skills in SkillRegistry
            if !manifest.skills.is_empty() {
                let mut skill_reg = self.skill_registry.write()
                    .map_err(|e| PluginError::LoadError(e.to_string()))?;
                skill_reg.register_plugin_skills(name, &manifest.skills)
                    .map_err(PluginError::LoadError)?;
            }

            // Register MCP tools and sync to DB
            if !manifest.mcp_tools.is_empty() {
                let mut mcp_reg = self.mcp_tool_registry.write()
                    .map_err(|e| PluginError::LoadError(e.to_string()))?;
                mcp_reg.register_plugin_tools(name, &manifest.mcp_tools)
                    .map_err(PluginError::LoadError)?;
                self.sync_mcp_tools_to_db(name, &manifest.mcp_tools, true);
            }

            reg.set_status(name, PluginStatus::Active, None);
        } else {
            // Unregister skills
            {
                let mut skill_reg = self.skill_registry.write()
                    .map_err(|e| PluginError::LoadError(e.to_string()))?;
                skill_reg.unregister_plugin(name);
            }

            // Unregister MCP tools
            {
                let mut mcp_reg = self.mcp_tool_registry.write()
                    .map_err(|e| PluginError::LoadError(e.to_string()))?;
                mcp_reg.unregister_plugin(name);
            }
            self.sync_mcp_tools_to_db(name, &[], false);

            // Execute on_disable lifecycle hooks
            self.execute_lifecycle_hooks(name, &manifest, false)?;

            reg.set_status(name, PluginStatus::Disabled, None);
        }
        Ok(())
    }

    pub fn dispatch_skill(&self, prefixed_name: &str, input: serde_json::Value) -> Result<serde_json::Value, String> {
        let skill_reg = self.skill_registry.read().map_err(|e| e.to_string())?;
        let skill = skill_reg.get(prefixed_name)
            .ok_or_else(|| format!("Skill '{}' failed to execute. The plugin may need to be re-enabled.", prefixed_name))?;
        // Return dispatch confirmation — actual plugin execution in Phase 42+
        Ok(serde_json::json!({
            "skill": prefixed_name,
            "status": "dispatched",
            "input": input,
            "description": skill.description,
        }))
    }

    pub fn list_skills(&self) -> Vec<PluginSkillInfo> {
        let skill_reg = self.skill_registry.read().unwrap_or_else(|e| e.into_inner());
        skill_reg.list().iter().map(|(prefixed_name, skill)| {
            let plugin_name = prefixed_name.split(':').next().unwrap_or("").to_string();
            PluginSkillInfo {
                prefixed_name: prefixed_name.to_string(),
                plugin_name,
                description: skill.description.clone(),
                input_schema: skill.input_schema.clone(),
                output_schema: skill.output_schema.clone(),
                destructive: skill.destructive,
            }
        }).collect()
    }

    pub fn purge_directory(&self, plugin_name: &str, dir_path: &str) -> Result<(), String> {
        let reg = self.registry.read().map_err(|e| e.to_string())?;
        let plugin = reg.get(plugin_name)
            .ok_or_else(|| format!("Plugin not found: {}", plugin_name))?;
        let dir = plugin.manifest.owned_directories.iter()
            .find(|d| d.path == dir_path)
            .ok_or_else(|| format!("Directory '{}' not declared by plugin '{}'", dir_path, plugin_name))?;
        let dir_mgr = self.directory_manager.read().map_err(|e| e.to_string())?;
        dir_mgr.purge_directory(dir)
    }

    fn execute_lifecycle_hooks(&self, plugin_name: &str, manifest: &PluginManifest, enabling: bool) -> Result<(), PluginError> {
        let hooks = if enabling { &manifest.on_enable } else { &manifest.on_disable };
        for hook in hooks {
            match hook.as_str() {
                "create_dirs" => {
                    if enabling {
                        let dir_mgr = self.directory_manager.read()
                            .map_err(|e| PluginError::LoadError(e.to_string()))?;
                        for dir in &manifest.owned_directories {
                            dir_mgr.create_directory(dir)
                                .map_err(PluginError::LoadError)?;
                        }
                    }
                }
                "register_schema" => {
                    // Placeholder for future schema registration
                }
                "unregister" => {
                    // Skills/MCP tools already handled in set_enabled
                }
                unknown => {
                    eprintln!("Unknown lifecycle hook '{}' for plugin '{}'", unknown, plugin_name);
                }
            }
        }
        Ok(())
    }

    fn sync_mcp_tools_to_db(&self, plugin_name: &str, tools: &[McpToolDefinition], enabling: bool) {
        let Some(db_path) = &self.db_path else { return; };
        let Ok(conn) = rusqlite::Connection::open(db_path) else { return; };

        // Remove existing entries for this plugin
        let _ = conn.execute(
            "DELETE FROM plugin_mcp_tools WHERE plugin_name = ?1",
            rusqlite::params![plugin_name],
        );

        if enabling {
            for tool in tools {
                let prefixed = format!("{}:{}", plugin_name, tool.name);
                let schema_str = serde_json::to_string(&tool.input_schema)
                    .unwrap_or_else(|_| "{}".to_string());
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO plugin_mcp_tools (prefixed_name, plugin_name, description, input_schema, enabled) VALUES (?1, ?2, ?3, ?4, 1)",
                    rusqlite::params![prefixed, plugin_name, tool.description, schema_str],
                );
            }
        }
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
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        let results = host.scan_and_load();

        let valid: Vec<_> = results.iter().filter(|r| r.success).collect();
        assert_eq!(valid.len(), 1);
        assert_eq!(valid[0].name, "valid-plugin");
    }

    #[test]
    fn test_scan_and_load_records_errors() {
        let dir = create_test_plugins_dir();
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        let results = host.scan_and_load();

        let errors: Vec<_> = results.iter().filter(|r| !r.success).collect();
        assert!(!errors.is_empty());
    }

    #[test]
    fn test_get_plugin() {
        let dir = create_test_plugins_dir();
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        host.scan_and_load();

        assert!(host.get_plugin("valid-plugin").is_some());
        assert!(host.get_plugin("nonexistent").is_none());
    }

    #[test]
    fn test_set_enabled() {
        let dir = create_test_plugins_dir();
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
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
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        let result = host.set_enabled("nonexistent", true);
        assert!(result.is_err());
    }

    #[test]
    fn test_list_plugins() {
        let dir = create_test_plugins_dir();
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        host.scan_and_load();

        let all = host.list_plugins();
        // valid-plugin + invalid-plugin (loaded as error)
        assert!(all.len() >= 1);
    }

    // --- Phase 45 skill lifecycle, dispatch, and collision tests ---

    fn create_skill_plugin(dir: &std::path::Path, name: &str, skills_json: &str) {
        let plugin_dir = dir.join(name);
        fs::create_dir_all(&plugin_dir).unwrap();
        fs::write(
            plugin_dir.join("plugin.json"),
            format!(
                r#"{{
                    "name": "{}",
                    "version": "1.0.0",
                    "display_name": "Test",
                    "description": "Test plugin",
                    "manifest_version": 2,
                    "skills": {}
                }}"#,
                name, skills_json
            ),
        )
        .unwrap();
    }

    fn create_skill_plugin_with_hooks(
        dir: &std::path::Path,
        name: &str,
        skills_json: &str,
        on_enable: &str,
        owned_dirs: &str,
    ) {
        let plugin_dir = dir.join(name);
        fs::create_dir_all(&plugin_dir).unwrap();
        fs::write(
            plugin_dir.join("plugin.json"),
            format!(
                r#"{{
                    "name": "{}",
                    "version": "1.0.0",
                    "display_name": "Test",
                    "description": "Test plugin",
                    "manifest_version": 2,
                    "skills": {},
                    "on_enable": {},
                    "owned_directories": {}
                }}"#,
                name, skills_json, on_enable, owned_dirs
            ),
        )
        .unwrap();
    }

    #[test]
    fn test_enable_plugin_registers_skills() {
        let dir = tempfile::tempdir().unwrap();
        create_skill_plugin(
            dir.path(),
            "skill-plugin",
            r#"[
                {"name": "ingest", "description": "Ingest data", "destructive": true},
                {"name": "query", "description": "Query data"}
            ]"#,
        );
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        host.scan_and_load();

        host.set_enabled("skill-plugin", true).unwrap();

        let skills = host.list_skills();
        assert_eq!(skills.len(), 2);
        let names: Vec<&str> = skills.iter().map(|s| s.prefixed_name.as_str()).collect();
        assert!(names.contains(&"skill-plugin:ingest"));
        assert!(names.contains(&"skill-plugin:query"));
    }

    #[test]
    fn test_disable_plugin_unregisters_skills() {
        let dir = tempfile::tempdir().unwrap();
        create_skill_plugin(
            dir.path(),
            "skill-plugin",
            r#"[{"name": "ingest", "description": "Ingest data"}]"#,
        );
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        host.scan_and_load();

        host.set_enabled("skill-plugin", true).unwrap();
        assert_eq!(host.list_skills().len(), 1);

        host.set_enabled("skill-plugin", false).unwrap();
        assert_eq!(host.list_skills().len(), 0);
    }

    #[test]
    fn test_list_skills_returns_correct_fields() {
        let dir = tempfile::tempdir().unwrap();
        create_skill_plugin(
            dir.path(),
            "field-plugin",
            r#"[{
                "name": "do-thing",
                "description": "Test skill",
                "input_schema": {"type": "object"},
                "destructive": true
            }]"#,
        );
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        host.scan_and_load();
        host.set_enabled("field-plugin", true).unwrap();

        let skills = host.list_skills();
        assert_eq!(skills.len(), 1);
        let skill = &skills[0];
        assert_eq!(skill.prefixed_name, "field-plugin:do-thing");
        assert_eq!(skill.plugin_name, "field-plugin");
        assert_eq!(skill.description, "Test skill");
        assert!(skill.destructive);
        assert_eq!(skill.input_schema, serde_json::json!({"type": "object"}));
    }

    #[test]
    fn test_dispatch_skill_routes_to_registered() {
        let dir = tempfile::tempdir().unwrap();
        create_skill_plugin(
            dir.path(),
            "dispatch-plugin",
            r#"[{"name": "query", "description": "Query data"}]"#,
        );
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        host.scan_and_load();
        host.set_enabled("dispatch-plugin", true).unwrap();

        let result = host.dispatch_skill(
            "dispatch-plugin:query",
            serde_json::json!({"q": "test"}),
        );
        assert!(result.is_ok());
        let val = result.unwrap();
        assert_eq!(val["status"], "dispatched");
        assert_eq!(val["skill"], "dispatch-plugin:query");
    }

    #[test]
    fn test_dispatch_skill_errors_for_unregistered() {
        let dir = tempfile::tempdir().unwrap();
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());

        let result = host.dispatch_skill("nonexistent:skill", serde_json::json!({}));
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("failed to execute"), "Error was: {}", err);
    }

    #[test]
    fn test_namespace_collision_prevented() {
        let dir = tempfile::tempdir().unwrap();
        create_skill_plugin(
            dir.path(),
            "plugin-a",
            r#"[{"name": "ingest", "description": "A ingest"}]"#,
        );
        create_skill_plugin(
            dir.path(),
            "plugin-b",
            r#"[{"name": "ingest", "description": "B ingest"}]"#,
        );
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        host.scan_and_load();
        host.set_enabled("plugin-a", true).unwrap();
        host.set_enabled("plugin-b", true).unwrap();

        let skills = host.list_skills();
        assert_eq!(skills.len(), 2);
        let names: Vec<&str> = skills.iter().map(|s| s.prefixed_name.as_str()).collect();
        assert!(names.contains(&"plugin-a:ingest"));
        assert!(names.contains(&"plugin-b:ingest"));

        assert!(host.dispatch_skill("plugin-a:ingest", serde_json::json!({})).is_ok());
        assert!(host.dispatch_skill("plugin-b:ingest", serde_json::json!({})).is_ok());
    }

    #[test]
    fn test_enable_with_create_dirs_hook() {
        let dir = tempfile::tempdir().unwrap();
        let app_data_dir = tempfile::tempdir().unwrap();
        create_skill_plugin_with_hooks(
            dir.path(),
            "dir-plugin",
            r#"[]"#,
            r#"["create_dirs"]"#,
            r#"[{"path": ".test-data", "scope": "global", "description": "test"}]"#,
        );
        let host = PluginHost::new(dir.path().to_path_buf(), app_data_dir.path().to_path_buf());
        host.scan_and_load();
        host.set_enabled("dir-plugin", true).unwrap();

        assert!(app_data_dir.path().join(".test-data").exists());
    }

    #[test]
    fn test_enable_with_unknown_hook_does_not_error() {
        let dir = tempfile::tempdir().unwrap();
        create_skill_plugin_with_hooks(
            dir.path(),
            "unknown-hook-plugin",
            r#"[]"#,
            r#"["unknown_hook"]"#,
            r#"[]"#,
        );
        let host = PluginHost::new(dir.path().to_path_buf(), dir.path().to_path_buf());
        host.scan_and_load();
        let result = host.set_enabled("unknown-hook-plugin", true);
        assert!(result.is_ok());
    }
}
