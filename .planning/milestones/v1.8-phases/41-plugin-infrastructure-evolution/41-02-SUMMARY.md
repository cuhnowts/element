---
plan: 41-02
phase: 41-plugin-infrastructure-evolution
status: complete
started: 2026-04-06
completed: 2026-04-06
---

## Summary

Wired PluginHost to use the new registries and DirectoryManager during enable/disable lifecycle, added skill dispatch and MCP tool persistence.

## What Was Built

### PluginHost Extensions (mod.rs)
- Added `skill_registry`, `mcp_tool_registry`, `directory_manager`, `db_path` fields
- Updated `new()` to accept `app_data_dir` parameter
- `set_enabled` now registers/unregisters skills and MCP tools on lifecycle transitions
- `dispatch_skill` — routes prefixed skill names to registered handlers (stub for Phase 42+)
- `list_skills` — returns all registered skills with metadata
- `purge_directory` — removes plugin-declared directories with validation
- `execute_lifecycle_hooks` — processes `create_dirs`, `register_schema`, `unregister` hooks
- `sync_mcp_tools_to_db` — persists MCP tools to SQLite on enable, removes on disable

### Tauri Commands (plugin_commands.rs)
- `dispatch_plugin_skill` — frontend skill invocation endpoint
- `list_plugin_skills` — list all registered skills with schemas
- `purge_plugin_directory` — directory cleanup command

### DB Migration (013_plugin_mcp_tools.sql)
- `plugin_mcp_tools` table with `prefixed_name` PK, `plugin_name`, `description`, `input_schema`, `enabled`
- Index on `plugin_name` for efficient per-plugin queries

### lib.rs Updates
- `PluginHost::new` now receives `app_data_dir`
- `set_db_path` called before `scan_and_load`
- Three new commands registered in `invoke_handler`

## Self-Check: PASSED

## key-files
### created
- src-tauri/src/db/sql/013_plugin_mcp_tools.sql

### modified
- src-tauri/src/plugins/mod.rs
- src-tauri/src/commands/plugin_commands.rs
- src-tauri/src/db/migrations.rs
- src-tauri/src/lib.rs

## Tests
- All 89 plugin tests pass
- Full cargo build succeeds
- Zero regressions
