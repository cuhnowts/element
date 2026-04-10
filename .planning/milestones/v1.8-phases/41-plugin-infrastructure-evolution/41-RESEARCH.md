# Phase 41: Plugin Infrastructure Evolution - Research

**Researched:** 2026-04-06
**Domain:** Rust plugin system extension (manifest schema, skill dispatch, directory management, MCP integration)
**Confidence:** HIGH

## Summary

Phase 41 extends Element's existing plugin system with three new capabilities: skill declarations, MCP tool declarations, and owned directory declarations. The existing codebase is well-structured for this extension -- `PluginManifest` already uses `#[serde(default)]` for optional fields, `PluginRegistry` is a simple HashMap wrapper, and the MCP server uses a file-based agent-queue bridge pattern for cross-process communication.

The core work is (1) extending the `PluginManifest` struct with new optional fields, (2) adding parallel registries for skills and MCP tools alongside the existing plugin registry, (3) implementing a `dispatch_plugin_skill` Tauri command that routes skill calls through the registry, (4) creating a directory manager with path sanitization to fix the `PathBuf::from("/")` security hole, and (5) writing plugin MCP tool registrations to SQLite so the MCP server can query them statelessly.

**Primary recommendation:** Extend existing structs with `#[serde(default)]` optional fields for backward compatibility, add `SkillRegistry` and `McpToolRegistry` as parallel HashMaps inside `PluginHost`, and use the established file-based agent-queue pattern for MCP tool dispatch.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Plugin skills live in a separate registry from built-in actions. Built-in actions stay in `actionRegistry.ts`. Plugin skills get their own dynamic registry populated from Rust via Tauri commands. Hub chat merges both when building tool definitions for the LLM.
- **D-02:** Plugin skills are loaded into the frontend registry on app startup (stored in Zustand). Re-fetched when a plugin is enabled/disabled.
- **D-03:** All plugin skills use prefix enforcement for namespacing: `plugin_name:skill_name` (e.g. `knowledge:ingest`). Collisions impossible by construction. Satisfies PLUG-05.
- **D-04:** Plugin skills support a manifest-declared `destructive` flag per skill. Hub chat shows confirmation dialog before dispatching destructive plugin skills, consistent with built-in action pattern.
- **D-05:** Plugin infrastructure supports both global and project-scoped directories. Each plugin declares its scope preference in the manifest (`scope: "global"` or `scope: "project"`). Global dirs go in app_data_dir, project dirs go in project root. The knowledge plugin will use global scope.
- **D-06:** Directory paths validated with allowlist + sanitize: must be relative, no `..` components, no symlink traversal, resolved against appropriate root. Reject anything that escapes. Fixes the `PathBuf::from("/")` security hole.
- **D-07:** Disabling a plugin preserves its directories. An optional purge command allows explicit deletion of plugin-owned directories, requiring user action (never automatic).
- **D-08:** Lifecycle hooks are manifest-declared as named actions: `{ "on_enable": ["create_dirs", "register_schema"], "on_disable": ["unregister"] }`. The host interprets known action types. Declarative, no executable code.
- **D-09:** Add `manifest_version: 2` field to new-style manifests. Old manifests without this field are treated as v1. Enables future schema evolution.
- **D-10:** Skill input/output defined as JSON Schema objects (same pattern as existing `step_types`). LLM uses input_schema for tool definitions.
- **D-11:** Plugin MCP tools registered via DB-backed registry. Plugin host writes enabled plugin MCP tools to SQLite. MCP server reads from DB on ListTools requests. MCP server stays stateless relative to plugins.
- **D-12:** Plugin MCP tools use the same namespace prefixing as skills: `plugin_name:tool_name` (e.g. `knowledge:query`). Consistent across both surfaces.
- **D-13:** Plugin MCP tool calls dispatched through the existing agent queue. MCP server writes a message to the queue, Tauri picks it up, routes through `dispatch_plugin_skill`, writes result back. Reuses existing MCP-to-Tauri bridge pattern.

### Claude's Discretion
None -- all areas discussed and decided by user.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLUG-01 | Plugin can declare MCP tools in its manifest that are callable by hub chat and external agents | Manifest extension with `mcp_tools` field, DB-backed registry for MCP server, agent-queue dispatch pattern (D-11, D-12, D-13) |
| PLUG-02 | Plugin can declare named skills (slash-command-like) that appear as hub chat commands | Manifest extension with `skills` field using JSON Schema input/output (D-01, D-10), Zustand plugin skill store (D-02) |
| PLUG-03 | Plugin can declare owned directories it creates and manages on the filesystem | Manifest `owned_directories` field with scope, path sanitization with allowlist, directory manager (D-05, D-06, D-07) |
| PLUG-04 | Plugin lifecycle hooks (on_enable/on_disable) execute setup/teardown logic when plugin state changes | Declarative hook actions in manifest (D-08), host interprets known action types on enable/disable |
| PLUG-05 | Plugin-contributed skills use plugin-prefixed namespacing to prevent collisions | Automatic `plugin_name:skill_name` prefixing at registration time (D-03), collision impossible by construction |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| serde / serde_json | 1.x | Manifest parsing with `#[serde(default)]` for backward compat | Already in use, zero new deps |
| rusqlite | 0.32 | Plugin MCP tool registry in SQLite | Already in use for all DB operations |
| tokio | 1.x | Async skill dispatch, directory operations | Already in use |
| tauri | ~2.10 | New Tauri commands for skill dispatch/listing | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| notify / notify-debouncer-mini | 8.x / 0.7 | Plugin hot-reload (already wired) | Already active, no changes needed |
| chrono | 0.4 | Timestamps for loaded_at | Already in use |

### Alternatives Considered
None -- D-state decision: zero new dependencies for v1.8.

**Installation:**
No new packages required. All work extends existing dependencies.

## Architecture Patterns

### Recommended Project Structure
```
src-tauri/src/plugins/
  manifest.rs       # Extended: SkillDefinition, McpToolDefinition, OwnedDirectory, LifecycleHook structs
  registry.rs       # Extended: SkillRegistry, McpToolRegistry alongside PluginRegistry
  mod.rs            # Extended: PluginHost gains skill dispatch, directory management, lifecycle hooks
  directory.rs      # NEW: DirectoryManager with path sanitization and scope resolution
  api.rs            # Existing (unchanged)
  core/             # Existing (unchanged)

src-tauri/src/commands/
  plugin_commands.rs  # Extended: dispatch_plugin_skill, list_plugin_skills, purge_plugin_directory

src-tauri/src/db/sql/
  013_plugin_mcp_tools.sql  # NEW: plugin_mcp_tools table

src/stores/
  pluginSlice.ts    # Extended: pluginSkills state, fetchPluginSkills action

src/lib/
  types.ts          # Extended: PluginSkillInfo interface
  tauri.ts          # Extended: dispatchPluginSkill, listPluginSkills bindings
```

### Pattern 1: Backward-Compatible Manifest Extension
**What:** Add new optional fields to `PluginManifest` with `#[serde(default)]` so existing v1 manifests parse unchanged.
**When to use:** Every new manifest field.
**Example:**
```rust
// Extends existing PluginManifest in manifest.rs
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct PluginManifest {
    // ... existing fields unchanged ...
    
    #[serde(default)]
    pub manifest_version: Option<u32>,  // None = v1, Some(2) = v2
    #[serde(default)]
    pub skills: Vec<SkillDefinition>,
    #[serde(default)]
    pub mcp_tools: Vec<McpToolDefinition>,
    #[serde(default)]
    pub owned_directories: Vec<OwnedDirectory>,
    #[serde(default)]
    pub on_enable: Vec<String>,   // Known action names: "create_dirs", "register_schema"
    #[serde(default)]
    pub on_disable: Vec<String>,  // Known action names: "unregister"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillDefinition {
    pub name: String,           // Local name (e.g. "ingest"), prefixed at registration
    pub description: String,
    #[serde(default)]
    pub input_schema: serde_json::Value,
    #[serde(default)]
    pub output_schema: serde_json::Value,
    #[serde(default)]
    pub destructive: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct McpToolDefinition {
    pub name: String,           // Local name, prefixed at registration
    pub description: String,
    #[serde(default)]
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OwnedDirectory {
    pub path: String,           // Relative path (e.g. ".knowledge")
    pub scope: DirectoryScope,  // "global" or "project"
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DirectoryScope {
    Global,
    Project,
}
```

### Pattern 2: Namespace-Prefixed Registry
**What:** Skills and MCP tools stored in HashMap keyed by `plugin_name:skill_name`. Prefix applied at registration, not in manifest.
**When to use:** All skill and MCP tool lookups.
**Example:**
```rust
// In registry.rs
pub struct SkillRegistry {
    // Key: "plugin_name:skill_name", Value: (plugin_name, skill_def)
    skills: HashMap<String, (String, SkillDefinition)>,
}

impl SkillRegistry {
    pub fn register_plugin_skills(&mut self, plugin_name: &str, skills: &[SkillDefinition]) -> Result<(), String> {
        for skill in skills {
            let prefixed = format!("{}:{}", plugin_name, skill.name);
            // Collision check (shouldn't happen with prefix, but belt-and-suspenders)
            if self.skills.contains_key(&prefixed) {
                return Err(format!("Skill collision: {} already registered", prefixed));
            }
            self.skills.insert(prefixed, (plugin_name.to_string(), skill.clone()));
        }
        Ok(())
    }
    
    pub fn unregister_plugin(&mut self, plugin_name: &str) {
        self.skills.retain(|_, (owner, _)| owner != plugin_name);
    }
    
    pub fn get(&self, prefixed_name: &str) -> Option<&SkillDefinition> {
        self.skills.get(prefixed_name).map(|(_, def)| def)
    }
    
    pub fn list(&self) -> Vec<(&str, &SkillDefinition)> {
        self.skills.iter().map(|(k, (_, v))| (k.as_str(), v)).collect()
    }
}
```

### Pattern 3: Path Sanitization for Owned Directories
**What:** Validate directory paths are relative, contain no `..` or symlink traversal, and resolve within scope root.
**When to use:** Every owned directory operation.
**Example:**
```rust
// In directory.rs (NEW file)
use std::path::{Path, PathBuf, Component};

pub struct DirectoryManager {
    app_data_dir: PathBuf,     // For global scope
    project_root: Option<PathBuf>,  // For project scope (if known)
}

impl DirectoryManager {
    pub fn validate_and_resolve(
        &self,
        dir: &OwnedDirectory,
    ) -> Result<PathBuf, String> {
        let path = Path::new(&dir.path);
        
        // Must be relative
        if path.is_absolute() {
            return Err(format!("Directory path must be relative: {}", dir.path));
        }
        
        // No parent directory traversal
        for component in path.components() {
            match component {
                Component::ParentDir => {
                    return Err(format!("Directory path must not contain '..': {}", dir.path));
                }
                Component::RootDir => {
                    return Err(format!("Directory path must not be absolute: {}", dir.path));
                }
                _ => {}
            }
        }
        
        // Resolve against scope root
        let root = match dir.scope {
            DirectoryScope::Global => &self.app_data_dir,
            DirectoryScope::Project => self.project_root.as_ref()
                .ok_or("No project root set for project-scoped directory")?,
        };
        
        let resolved = root.join(path);
        
        // Final canonicalization check (no symlink escape)
        // Note: directory may not exist yet, so canonicalize the parent
        let parent = resolved.parent().unwrap_or(&resolved);
        if parent.exists() {
            let canonical_parent = parent.canonicalize()
                .map_err(|e| format!("Failed to canonicalize: {}", e))?;
            let canonical_root = root.canonicalize()
                .map_err(|e| format!("Failed to canonicalize root: {}", e))?;
            if !canonical_parent.starts_with(&canonical_root) {
                return Err(format!("Resolved path escapes root: {}", resolved.display()));
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
}
```

### Pattern 4: DB-Backed MCP Tool Registry
**What:** Plugin host writes enabled plugin MCP tools to a `plugin_mcp_tools` SQLite table. MCP server reads from this table on ListTools requests.
**When to use:** Plugin enable/disable and MCP server ListTools.
**Example (SQL):**
```sql
-- 013_plugin_mcp_tools.sql
CREATE TABLE IF NOT EXISTS plugin_mcp_tools (
    prefixed_name TEXT PRIMARY KEY,   -- "knowledge:query"
    plugin_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    input_schema TEXT NOT NULL DEFAULT '{}',  -- JSON
    enabled INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_plugin_mcp_tools_plugin ON plugin_mcp_tools(plugin_name);
```

### Pattern 5: Agent Queue Dispatch for MCP Tool Calls
**What:** MCP server writes a skill request file to `agent-queue/skill-requests/`, Tauri watches and dispatches through `dispatch_plugin_skill`, writes result to `agent-queue/skill-results/`.
**When to use:** MCP tool calls that need to route through plugin skills.
**Example (MCP server side):**
```typescript
// In MCP server: write request, poll for result
function dispatchPluginSkill(dbPath: string, skillName: string, input: unknown): string {
    const requestDir = join(dirname(dbPath), "agent-queue", "skill-requests");
    mkdirSync(requestDir, { recursive: true });
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeFileSync(
        join(requestDir, `${requestId}.json`),
        JSON.stringify({ id: requestId, skill: skillName, input })
    );
    return requestId;
}
```

### Anti-Patterns to Avoid
- **Modifying ActionDefinition for plugin skills:** Built-in actions and plugin skills are separate registries (D-01). Do not pollute `ACTION_REGISTRY` with dynamic entries.
- **Making MCP server stateful:** MCP server must remain stateless relative to plugins. It reads from DB, not from memory. No plugin host reference in MCP server process.
- **Auto-deleting directories on disable:** Per D-07, directories are preserved. Only explicit purge deletes them.
- **Storing prefixed names in manifest:** Manifest declares local names (`ingest`). The prefix (`knowledge:ingest`) is applied at registration time by the host.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path traversal prevention | Custom string checking | `std::path::Component` enum matching + `canonicalize()` | OS-level path resolution catches symlinks and edge cases |
| JSON Schema validation | Schema validator | Store schemas as `serde_json::Value`, pass through to LLM | LLM interprets schemas directly; runtime validation unnecessary for v1 |
| File watching for plugin changes | Custom inotify/FSEvents | Existing `notify_debouncer_mini` setup | Already wired and tested |
| Cross-process communication | Custom IPC / sockets | File-based agent-queue (existing pattern) | Already battle-tested for MCP-to-Tauri bridge |

**Key insight:** This phase is purely extension of existing patterns. Every new capability maps directly to an established pattern in the codebase.

## Common Pitfalls

### Pitfall 1: Breaking Existing Plugin Manifests
**What goes wrong:** Adding required fields to `PluginManifest` causes existing v1 `plugin.json` files to fail parsing.
**Why it happens:** Serde requires all non-Option, non-default fields to be present.
**How to avoid:** Every new field MUST use `#[serde(default)]`. The test `test_unknown_extra_fields_accepted` already proves forward-compat. Add a reciprocal test: v1 manifests parse with new struct.
**Warning signs:** Existing `core::register_core_plugins()` constructors fail to compile (they must add the new fields).

### Pitfall 2: PathBuf Security Hole Reproduction
**What goes wrong:** The `FilesystemPlugin::new(vec![PathBuf::from("/")])` on line 200 of `plugin_commands.rs` allows unrestricted filesystem access. If the new directory manager has a similar pattern, it creates a new attack surface.
**Why it happens:** Convenience shortcut during initial implementation.
**How to avoid:** DirectoryManager resolves against known roots (app_data_dir or project_root) and rejects absolute paths, `..` components, and symlink escapes.
**Warning signs:** Any `PathBuf::from("/")` or `PathBuf::from(user_input)` without validation.

### Pitfall 3: Stale Skill Registry After Enable/Disable
**What goes wrong:** Frontend Zustand store shows stale skill list after plugin enable/disable because re-fetch wasn't triggered.
**Why it happens:** Enable/disable commands don't emit events that trigger skill list refresh.
**How to avoid:** The existing `plugin-updated` event (emitted by `enable_plugin`/`disable_plugin` commands) should also trigger `fetchPluginSkills()` in the frontend. Wire this in the Zustand slice.
**Warning signs:** Plugin shows as disabled but its skills still appear in hub chat tool list.

### Pitfall 4: MCP Server Reads Stale DB
**What goes wrong:** MCP server caches ListTools results and doesn't see newly enabled/disabled plugin tools.
**Why it happens:** MCP server doesn't watch for DB changes.
**How to avoid:** MCP server re-queries `plugin_mcp_tools` table on every `ListTools` request. SQLite reads are fast enough. Also emit a `data-changed` notification via the existing `emitDataChanged` pattern.
**Warning signs:** External agent sees stale tool list after plugin state change.

### Pitfall 5: Core Plugin Manifest Constructors
**What goes wrong:** The 4 core plugin manifests in `core/mod.rs` need to be updated with new fields, or compilation fails.
**Why it happens:** Rust struct construction requires all fields.
**How to avoid:** Use `..Default::default()` or add `#[serde(default)]` with sensible defaults so core plugins compile with empty new fields.
**Warning signs:** `cargo build` fails immediately after manifest struct changes.

## Code Examples

### Dispatch Plugin Skill (Tauri Command)
```rust
// In plugin_commands.rs
#[tauri::command]
pub async fn dispatch_plugin_skill(
    state: State<'_, std::sync::Mutex<PluginHost>>,
    skill_name: String,  // Prefixed: "knowledge:ingest"
    input: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    host.dispatch_skill(&skill_name, input)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_plugin_skills(
    state: State<'_, std::sync::Mutex<PluginHost>>,
) -> Result<Vec<PluginSkillInfo>, String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    Ok(host.list_skills())
}
```

### Frontend Plugin Skill Type
```typescript
// In types.ts
export interface PluginSkillInfo {
    prefixedName: string;     // "knowledge:ingest"
    pluginName: string;       // "knowledge"
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
    destructive: boolean;
}
```

### Zustand Plugin Skills Extension
```typescript
// In pluginSlice.ts (extension)
export interface PluginSlice {
    // ... existing fields ...
    pluginSkills: PluginSkillInfo[];
    fetchPluginSkills: () => Promise<void>;
}
```

### MCP Server Plugin Tool Query
```typescript
// In MCP server: read plugin tools from DB
function getPluginMcpTools(db: Database): ToolDefinition[] {
    const rows = db.prepare(
        "SELECT prefixed_name, description, input_schema FROM plugin_mcp_tools WHERE enabled = 1"
    ).all() as { prefixed_name: string; description: string; input_schema: string }[];
    
    return rows.map(row => ({
        name: row.prefixed_name,
        description: row.description,
        inputSchema: JSON.parse(row.input_schema),
    }));
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust: built-in `#[test]` / `#[tokio::test]`; TS: Vitest 4.1 + RTL |
| Config file | `src-tauri/Cargo.toml` (Rust), `vitest.config.ts` (TS) |
| Quick run command | `cargo test -p element --lib plugins -- --test-threads=1` |
| Full suite command | `cargo test -p element && npm run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLUG-01 | MCP tool declaration in manifest parses; DB registry populated | unit | `cargo test -p element plugins::manifest` | Extend existing |
| PLUG-02 | Skill declaration parses; dispatch routes correctly | unit | `cargo test -p element plugins::registry` | Extend existing |
| PLUG-03 | Owned directory created on enable; path validation rejects escapes | unit | `cargo test -p element plugins::directory` | Wave 0 |
| PLUG-04 | on_enable/on_disable hooks trigger correct host actions | unit | `cargo test -p element plugins::tests` | Extend existing |
| PLUG-05 | Duplicate prefixed skill name produces error at load time | unit | `cargo test -p element plugins::registry` | Extend existing |

### Sampling Rate
- **Per task commit:** `cargo test -p element --lib plugins`
- **Per wave merge:** `cargo test -p element && npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/plugins/directory.rs` tests -- covers PLUG-03 (path sanitization, directory creation, scope resolution)
- [ ] Manifest v2 backward compatibility test -- v1 manifests parse with extended struct
- [ ] Core plugin constructor update -- 4 core plugins must compile with new fields

## Sources

### Primary (HIGH confidence)
- Direct code inspection of all canonical references listed in CONTEXT.md
- Existing test suite: 297 Rust tests, 70+ plugin-specific tests
- Existing patterns: `#[serde(default)]`, file-based agent-queue, Zustand slice pattern

### Secondary (MEDIUM confidence)
- Serde backward compatibility: `#[serde(default)]` guarantees missing fields get default values (well-documented serde behavior)
- SQLite for MCP tool registry: follows existing pattern from `005_plugins_credentials_calendar.sql`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new deps, all extensions to existing code
- Architecture: HIGH -- every pattern maps to established codebase patterns
- Pitfalls: HIGH -- identified from direct code inspection of security hole, manifest construction, and event handling

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable; internal architecture, no external dependency drift)
