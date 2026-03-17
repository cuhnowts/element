/// Valid plugin manifest with all fields populated
pub const VALID_MANIFEST: &str = r#"{
    "name": "test-plugin",
    "version": "1.0.0",
    "display_name": "Test Plugin",
    "description": "A test plugin for unit tests",
    "author": "Test Author",
    "capabilities": ["network", "credentials"],
    "credentials": ["test-api-key"],
    "entry": "plugin.js",
    "step_types": [
        {
            "id": "test-step",
            "name": "Test Step",
            "description": "A test step type",
            "input_schema": {},
            "output_schema": {}
        }
    ]
}"#;

/// Valid minimal manifest (only required fields)
pub const VALID_MINIMAL_MANIFEST: &str = r#"{
    "name": "minimal-plugin",
    "version": "0.1.0",
    "display_name": "Minimal Plugin",
    "description": "Minimal fields only"
}"#;

/// Invalid manifest: missing required "name" field
pub const INVALID_MISSING_NAME: &str = r#"{
    "version": "1.0.0",
    "display_name": "Bad Plugin",
    "description": "Missing name"
}"#;

/// Invalid manifest: malformed JSON
pub const INVALID_JSON: &str = r#"{ not valid json }"#;

/// Valid manifest with unknown extra fields (forward compat)
pub const VALID_WITH_EXTRAS: &str = r#"{
    "name": "extra-fields-plugin",
    "version": "1.0.0",
    "display_name": "Extra Fields Plugin",
    "description": "Has unknown fields",
    "unknown_field": "should be ignored",
    "future_feature": true
}"#;

/// Manifest with all capability types
pub const VALID_ALL_CAPABILITIES: &str = r#"{
    "name": "full-caps-plugin",
    "version": "1.0.0",
    "display_name": "Full Capabilities",
    "description": "Tests all capability types",
    "capabilities": ["network", "fs:read", "fs:write", "credentials", "shell"]
}"#;
