# Phase 41: Plugin Infrastructure Evolution - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the plugin manifest and host so plugins can declare skills, MCP tools, and owned directories. Add lifecycle hooks (on_enable/on_disable), enforce namespace uniqueness, and fix the PathBuf security hole. This is backend infrastructure — no new UI views.

</domain>

<decisions>
## Implementation Decisions

### Skill Dispatch Model
- **D-01:** Plugin skills live in a **separate registry** from built-in actions. Built-in actions stay in `actionRegistry.ts`. Plugin skills get their own dynamic registry populated from Rust via Tauri commands. Hub chat merges both when building tool definitions for the LLM.
- **D-02:** Plugin skills are loaded into the frontend registry **on app startup** (stored in Zustand). Re-fetched when a plugin is enabled/disabled.
- **D-03:** All plugin skills use **prefix enforcement** for namespacing: `plugin_name:skill_name` (e.g. `knowledge:ingest`). Collisions impossible by construction. Satisfies PLUG-05.
- **D-04:** Plugin skills support a **manifest-declared `destructive` flag** per skill. Hub chat shows confirmation dialog before dispatching destructive plugin skills, consistent with built-in action pattern.

### Owned Directory Lifecycle
- **D-05:** Plugin infrastructure supports **both global and project-scoped directories**. Each plugin declares its scope preference in the manifest (`scope: "global"` or `scope: "project"`). Global dirs go in app_data_dir, project dirs go in project root. The knowledge plugin will use global scope.
- **D-06:** Directory paths validated with **allowlist + sanitize**: must be relative, no `..` components, no symlink traversal, resolved against appropriate root. Reject anything that escapes. Fixes the `PathBuf::from("/")` security hole.
- **D-07:** Disabling a plugin preserves its directories. An **optional purge command** allows explicit deletion of plugin-owned directories, requiring user action (never automatic).

### Manifest Schema Design
- **D-08:** Lifecycle hooks are **manifest-declared** as named actions: `{ "on_enable": ["create_dirs", "register_schema"], "on_disable": ["unregister"] }`. The host interprets known action types. Declarative, no executable code.
- **D-09:** Add **`manifest_version: 2`** field to new-style manifests. Old manifests without this field are treated as v1. Enables future schema evolution.
- **D-10:** Skill input/output defined as **JSON Schema** objects (same pattern as existing `step_types`). LLM uses input_schema for tool definitions.

### MCP Tool Registration
- **D-11:** Plugin MCP tools registered via **DB-backed registry**. Plugin host writes enabled plugin MCP tools to SQLite. MCP server reads from DB on ListTools requests. MCP server stays stateless relative to plugins.
- **D-12:** Plugin MCP tools use the **same namespace prefixing** as skills: `plugin_name:tool_name` (e.g. `knowledge:query`). Consistent across both surfaces.
- **D-13:** Plugin MCP tool calls dispatched through the **existing agent queue**. MCP server writes a message to the queue, Tauri picks it up, routes through `dispatch_plugin_skill`, writes result back. Reuses existing MCP-to-Tauri bridge pattern.

### Claude's Discretion
None — all areas discussed and decided by user.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plugin System (Existing)
- `src-tauri/src/plugins/manifest.rs` — Current manifest struct (PluginManifest, PluginCapability, StepTypeDefinition)
- `src-tauri/src/plugins/registry.rs` — PluginRegistry and LoadedPlugin structs
- `src-tauri/src/plugins/mod.rs` — PluginHost with scan_and_load, start_watching, enable/disable
- `src-tauri/src/commands/plugin_commands.rs` — Tauri plugin commands (contains PathBuf security hole to fix)

### Hub Chat / Action System
- `src/lib/actionRegistry.ts` — Built-in action registry (15 actions with ActionDefinition interface)
- `src/hooks/useActionDispatch.ts` — Action dispatch via Tauri invoke
- `src/components/hub/HubChat.tsx` — Hub chat tool definition assembly and LLM integration

### MCP Server
- `mcp-server/src/index.ts` — MCP server with centralized ListTools/CallTool handlers

### Frontend Plugin Integration
- `src/stores/pluginSlice.ts` — Zustand plugin store
- `src/lib/tauri.ts` — Tauri API bindings for plugins (lines 85-92)
- `src/lib/types.ts` — PluginInfo and StepTypeInfo interfaces (lines 95-112)

### Requirements
- `.planning/REQUIREMENTS.md` — PLUG-01 through PLUG-05 requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PluginManifest` struct: Extend with new optional fields (skills, mcp_tools, owned_directories, on_enable, on_disable, manifest_version)
- `PluginRegistry`: Add parallel skill and MCP tool registries alongside existing plugin HashMap
- `ActionDefinition` interface: Use as reference pattern for plugin skill definitions (name, description, inputSchema, destructive)
- Agent queue: Existing MCP-to-Tauri message bridge for dispatching plugin tool calls

### Established Patterns
- **Tauri invoke pattern**: All frontend-to-backend calls go through `invoke<T>("command_name", { args })` in `tauri.ts`
- **Zustand slice pattern**: Store slices with async fetch actions (see `pluginSlice.ts`)
- **JSON Schema for tool definitions**: Both `step_types` in manifests and `actionRegistry` use JSON Schema for input definitions
- **File watcher with debounce**: `notify_debouncer_mini` used for plugin hot-reload

### Integration Points
- `lib.rs` lines 54-68: Plugin host initialization — where skill/MCP tool registries would be created
- `HubChat.tsx`: Where plugin skills need to be merged with `getToolDefinitions()` output
- `mcp-server/src/index.ts`: Where ListTools handler needs to query DB for plugin tools

</code_context>

<specifics>
## Specific Ideas

- Knowledge plugin will use global scope for `.knowledge/` directory — other future plugins may choose project scope
- The scope choice (global vs project) is made at plugin creation time in the manifest, not at runtime

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 41-plugin-infrastructure-evolution*
*Context gathered: 2026-04-06*
