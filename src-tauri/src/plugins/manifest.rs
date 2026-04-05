use serde::{Deserialize, Serialize};
use std::fmt;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub display_name: String,
    pub description: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub capabilities: Vec<PluginCapability>,
    #[serde(default)]
    pub credentials: Vec<String>,
    #[serde(default)]
    pub entry: Option<String>,
    #[serde(default)]
    pub step_types: Vec<StepTypeDefinition>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum PluginCapability {
    #[serde(rename = "network")]
    Network,
    #[serde(rename = "fs:read")]
    FsRead,
    #[serde(rename = "fs:write")]
    FsWrite,
    #[serde(rename = "credentials")]
    Credentials,
    #[serde(rename = "shell")]
    Shell,
}

impl fmt::Display for PluginCapability {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PluginCapability::Network => write!(f, "network"),
            PluginCapability::FsRead => write!(f, "fs:read"),
            PluginCapability::FsWrite => write!(f, "fs:write"),
            PluginCapability::Credentials => write!(f, "credentials"),
            PluginCapability::Shell => write!(f, "shell"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StepTypeDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub input_schema: serde_json::Value,
    #[serde(default)]
    pub output_schema: serde_json::Value,
}

#[derive(Debug)]
pub enum PluginError {
    ManifestNotFound(PathBuf),
    InvalidManifest(String),
    LoadError(String),
    NotFound(String),
}

impl fmt::Display for PluginError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PluginError::ManifestNotFound(path) => {
                write!(f, "Plugin manifest not found at: {}", path.display())
            }
            PluginError::InvalidManifest(msg) => write!(f, "Invalid plugin manifest: {}", msg),
            PluginError::LoadError(msg) => write!(f, "Plugin load error: {}", msg),
            PluginError::NotFound(name) => write!(f, "Plugin not found: {}", name),
        }
    }
}

impl std::error::Error for PluginError {}

pub fn load_plugin_manifest(plugin_dir: &Path) -> Result<PluginManifest, PluginError> {
    let manifest_path = plugin_dir.join("plugin.json");
    if !manifest_path.exists() {
        return Err(PluginError::ManifestNotFound(plugin_dir.to_path_buf()));
    }
    let content = std::fs::read_to_string(&manifest_path)
        .map_err(|e| PluginError::LoadError(e.to_string()))?;
    let manifest: PluginManifest =
        serde_json::from_str(&content).map_err(|e| PluginError::InvalidManifest(e.to_string()))?;

    // Validate required fields
    if manifest.name.is_empty() {
        return Err(PluginError::InvalidManifest(
            "Plugin name is required".to_string(),
        ));
    }
    if manifest.version.is_empty() {
        return Err(PluginError::InvalidManifest(
            "Plugin version is required".to_string(),
        ));
    }
    if manifest.display_name.is_empty() {
        return Err(PluginError::InvalidManifest(
            "Plugin display_name is required".to_string(),
        ));
    }

    Ok(manifest)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn create_temp_plugin(json: &str) -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("plugin.json"), json).unwrap();
        dir
    }

    #[test]
    fn test_valid_manifest_parses() {
        let json = r#"{
            "name": "test-plugin",
            "version": "1.0.0",
            "display_name": "Test Plugin",
            "description": "A test plugin",
            "author": "Test Author",
            "capabilities": ["network", "credentials"],
            "credentials": ["my-api-key"],
            "entry": "plugin.js",
            "step_types": [
                {
                    "id": "test-step",
                    "name": "Test Step",
                    "description": "Does something",
                    "input_schema": {},
                    "output_schema": {}
                }
            ]
        }"#;
        let dir = create_temp_plugin(json);
        let manifest = load_plugin_manifest(dir.path()).unwrap();

        assert_eq!(manifest.name, "test-plugin");
        assert_eq!(manifest.version, "1.0.0");
        assert_eq!(manifest.display_name, "Test Plugin");
        assert_eq!(manifest.description, "A test plugin");
        assert_eq!(manifest.author, Some("Test Author".to_string()));
        assert_eq!(manifest.capabilities.len(), 2);
        assert_eq!(manifest.credentials, vec!["my-api-key"]);
        assert_eq!(manifest.entry, Some("plugin.js".to_string()));
        assert_eq!(manifest.step_types.len(), 1);
        assert_eq!(manifest.step_types[0].id, "test-step");
    }

    #[test]
    fn test_missing_name_returns_invalid_manifest() {
        let json = r#"{
            "version": "1.0.0",
            "display_name": "Test",
            "description": "No name"
        }"#;
        let dir = create_temp_plugin(json);
        let result = load_plugin_manifest(dir.path());
        assert!(result.is_err());
        match result.unwrap_err() {
            PluginError::InvalidManifest(msg) => {
                assert!(msg.contains("name"), "Error should mention 'name': {}", msg);
            }
            other => panic!("Expected InvalidManifest, got: {:?}", other),
        }
    }

    #[test]
    fn test_unknown_extra_fields_accepted() {
        let json = r#"{
            "name": "forward-compat",
            "version": "1.0.0",
            "display_name": "Forward Compatible",
            "description": "Has extra fields",
            "future_field": "should be ignored",
            "another_unknown": 42
        }"#;
        let dir = create_temp_plugin(json);
        let manifest = load_plugin_manifest(dir.path());
        assert!(manifest.is_ok());
        assert_eq!(manifest.unwrap().name, "forward-compat");
    }

    #[test]
    fn test_capability_deserialization() {
        let json = r#"{
            "name": "cap-test",
            "version": "1.0.0",
            "display_name": "Cap Test",
            "description": "Tests capabilities",
            "capabilities": ["network", "fs:read", "fs:write", "credentials", "shell"]
        }"#;
        let dir = create_temp_plugin(json);
        let manifest = load_plugin_manifest(dir.path()).unwrap();

        assert_eq!(manifest.capabilities.len(), 5);
        assert_eq!(manifest.capabilities[0], PluginCapability::Network);
        assert_eq!(manifest.capabilities[1], PluginCapability::FsRead);
        assert_eq!(manifest.capabilities[2], PluginCapability::FsWrite);
        assert_eq!(manifest.capabilities[3], PluginCapability::Credentials);
        assert_eq!(manifest.capabilities[4], PluginCapability::Shell);
    }

    #[test]
    fn test_manifest_not_found() {
        let dir = tempfile::tempdir().unwrap();
        let result = load_plugin_manifest(dir.path());
        assert!(matches!(result, Err(PluginError::ManifestNotFound(_))));
    }

    #[test]
    fn test_malformed_json_returns_error() {
        let dir = create_temp_plugin("{ not valid json }");
        let result = load_plugin_manifest(dir.path());
        assert!(matches!(result, Err(PluginError::InvalidManifest(_))));
    }
}
