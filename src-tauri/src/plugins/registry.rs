use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use super::manifest::PluginManifest;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PluginStatus {
    Active,
    Error,
    Disabled,
    Loading,
}

#[derive(Debug, Clone)]
pub struct LoadedPlugin {
    pub manifest: PluginManifest,
    pub status: PluginStatus,
    pub error_message: Option<String>,
    pub loaded_at: String,
    pub plugin_path: PathBuf,
}

pub struct PluginRegistry {
    plugins: HashMap<String, LoadedPlugin>,
}

impl PluginRegistry {
    pub fn new() -> Self {
        Self {
            plugins: HashMap::new(),
        }
    }

    pub fn register(&mut self, plugin: LoadedPlugin) {
        self.plugins.insert(plugin.manifest.name.clone(), plugin);
    }

    pub fn get(&self, name: &str) -> Option<&LoadedPlugin> {
        self.plugins.get(name)
    }

    pub fn list(&self) -> Vec<&LoadedPlugin> {
        self.plugins.values().collect()
    }

    pub fn set_status(
        &mut self,
        name: &str,
        status: PluginStatus,
        error: Option<String>,
    ) -> bool {
        if let Some(plugin) = self.plugins.get_mut(name) {
            plugin.status = status;
            plugin.error_message = error;
            true
        } else {
            false
        }
    }

    pub fn remove(&mut self, name: &str) -> Option<LoadedPlugin> {
        self.plugins.remove(name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugins::manifest::PluginManifest;

    fn make_plugin(name: &str) -> LoadedPlugin {
        LoadedPlugin {
            manifest: PluginManifest {
                name: name.to_string(),
                version: "1.0.0".to_string(),
                display_name: format!("{} Plugin", name),
                description: "Test".to_string(),
                author: None,
                capabilities: vec![],
                credentials: vec![],
                entry: None,
                step_types: vec![],
            },
            status: PluginStatus::Active,
            error_message: None,
            loaded_at: "2026-01-01T00:00:00Z".to_string(),
            plugin_path: PathBuf::from(format!("/plugins/{}", name)),
        }
    }

    #[test]
    fn test_register_and_get() {
        let mut reg = PluginRegistry::new();
        reg.register(make_plugin("test"));
        assert!(reg.get("test").is_some());
        assert_eq!(reg.get("test").unwrap().manifest.name, "test");
    }

    #[test]
    fn test_list_all() {
        let mut reg = PluginRegistry::new();
        reg.register(make_plugin("a"));
        reg.register(make_plugin("b"));
        assert_eq!(reg.list().len(), 2);
    }

    #[test]
    fn test_update_status() {
        let mut reg = PluginRegistry::new();
        reg.register(make_plugin("test"));

        let updated = reg.set_status(
            "test",
            PluginStatus::Error,
            Some("Something broke".to_string()),
        );
        assert!(updated);

        let plugin = reg.get("test").unwrap();
        assert_eq!(plugin.status, PluginStatus::Error);
        assert_eq!(plugin.error_message, Some("Something broke".to_string()));
    }

    #[test]
    fn test_remove() {
        let mut reg = PluginRegistry::new();
        reg.register(make_plugin("test"));
        let removed = reg.remove("test");
        assert!(removed.is_some());
        assert!(reg.get("test").is_none());
    }

    #[test]
    fn test_update_nonexistent_returns_false() {
        let mut reg = PluginRegistry::new();
        let updated = reg.set_status("nonexistent", PluginStatus::Active, None);
        assert!(!updated);
    }
}
