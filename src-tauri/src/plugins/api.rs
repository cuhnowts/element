use serde::{Deserialize, Serialize};
use std::path::Path;

use super::manifest::PluginError;

/// Defines the capability surface that plugins can access.
/// Each method maps to a declared capability in the plugin manifest.
#[allow(dead_code)] // plugin API trait for future plugin system
pub trait PluginApi: Send + Sync {
    /// Access a named credential (requires "credentials" capability)
    fn get_credential(&self, name: &str) -> Result<String, PluginError>;

    /// Execute an HTTP request (requires "network" capability)
    fn execute_http(&self, request: HttpRequest) -> Result<HttpResponse, PluginError>;

    /// Read a file (requires "fs:read" capability)
    fn read_file(&self, path: &Path) -> Result<String, PluginError>;

    /// Write a file (requires "fs:write" capability)
    fn write_file(&self, path: &Path, content: &str) -> Result<(), PluginError>;

    /// Execute a shell command (requires "shell" capability)
    fn execute_shell(&self, command: &str, cwd: Option<&Path>) -> Result<ShellOutput, PluginError>;
}

#[allow(dead_code)] // plugin API types for future plugin system
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: std::collections::HashMap<String, String>,
    pub body: Option<String>,
    pub timeout_ms: Option<u64>,
}

#[allow(dead_code)] // plugin API types for future plugin system
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: std::collections::HashMap<String, String>,
    pub body: String,
}

#[allow(dead_code)] // plugin API types for future plugin system
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShellOutput {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}
