---
plan: 41-01
phase: 41-plugin-infrastructure-evolution
status: complete
started: 2026-04-06
completed: 2026-04-06
---

## Summary

Extended the plugin manifest schema with v2 fields and created three new infrastructure components for the plugin system.

## What Was Built

### Manifest v2 Types (manifest.rs)
- `SkillDefinition` — plugin-declared skills with name, description, schemas, destructive flag
- `McpToolDefinition` — plugin-declared MCP tools with name, description, input schema
- `OwnedDirectory` + `DirectoryScope` — plugin directory declarations with global/project scope
- Extended `PluginManifest` with: `manifest_version`, `skills`, `mcp_tools`, `owned_directories`, `on_enable`, `on_disable` — all backward-compatible via `#[serde(default)]`

### Registries (registry.rs)
- `SkillRegistry` — namespace-prefixed skill registration (`plugin:skill`), collision detection, per-plugin unregister
- `McpToolRegistry` — same pattern for MCP tools (`plugin:tool`)

### DirectoryManager (directory.rs)
- Path validation: rejects absolute paths, `..` traversal, symlink escapes
- Scope resolution: global → app_data_dir, project → project_root
- Operations: `create_directory`, `purge_directory`, `set_project_root`

### Core Plugin Updates (core/mod.rs)
- All 4 core plugins (shell, http, filesystem, calendar) updated with v2 field defaults

## Key Decisions
- Used `Option<u32>` for `manifest_version` — `None` means v1, `Some(2)` means v2
- Namespace keys use `plugin_name:skill_name` format for global uniqueness
- DirectoryManager validates at resolution time, not registration time

## Self-Check: PASSED

## key-files
### created
- src-tauri/src/plugins/directory.rs

### modified
- src-tauri/src/plugins/manifest.rs
- src-tauri/src/plugins/registry.rs
- src-tauri/src/plugins/mod.rs
- src-tauri/src/plugins/core/mod.rs
- src-tauri/src/commands/plugin_commands.rs

## Tests
- 26 new tests added (8 manifest, 8 registry, 10 directory)
- All 89 plugin module tests pass
- Zero regressions in existing tests
