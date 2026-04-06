# Stack Research

**Domain:** Knowledge engine plugin + plugin skill/MCP registration for Tauri desktop app
**Researched:** 2026-04-06
**Confidence:** HIGH

## Scope

This research covers ONLY the stack additions needed for v1.8 Knowledge Engine. The existing stack (Tauri 2.x, React 19, SQLite, Zustand, MCP SDK, Biome, Vitest, etc.) is validated and not re-evaluated.

## Key Finding: Zero New Dependencies

The existing stack handles everything v1.8 needs. No new Cargo crates, no new npm packages, no new infrastructure. The work is extending existing systems (plugin manifest, action registry, MCP server tool list) with new fields and handlers.

## Recommended Stack Additions

### Rust Backend (src-tauri) -- No New Crates

| Existing Dependency | Version | v1.8 Purpose | Why Sufficient |
|---------------------|---------|-------------|----------------|
| `tokio` | 1.x | Async file I/O for .knowledge/ operations (ingest, query, lint, index) | Already full-featured; `tokio::fs` handles read/write/walk |
| `serde` + `serde_json` | 1.x | Plugin manifest extensions (mcp_tools, skills, directories fields) | Already used for manifest parsing; extend `PluginManifest` struct with `#[serde(default)]` for backward compat |
| `notify` + `notify-debouncer-mini` | 8.x / 0.7 | Watch .knowledge/ for external changes (optional, future) | Already used for plugin hot-reload; same pattern |
| `reqwest` | 0.12 | LLM API calls for ingest/compile/lint operations | Already used by AI gateway; no changes needed |
| `regex` | 1.x | Parsing index.md, cross-reference detection in wiki articles | Already in Cargo.toml |
| `chrono` | 0.4 | Timestamps for log.md entries | Already in Cargo.toml |

### TypeScript Frontend (src/) -- No New Packages

| Existing Dependency | Version | v1.8 Purpose | Why Sufficient |
|---------------------|---------|-------------|----------------|
| `react-markdown` + `remark-gfm` + `rehype-highlight` | 10.x / 4.x / 7.x | Render wiki articles in hub chat responses | Already renders markdown in HubChat |
| `zustand` | 5.x | No new store needed; knowledge state lives on filesystem | Wiki is file-based, not state-based |
| `@tauri-apps/api` | 2.x | New Tauri commands for knowledge operations | Already wired for `invoke()` calls |

### MCP Server (mcp-server/) -- No New Packages

| Existing Dependency | Version | v1.8 Purpose | Why Sufficient |
|---------------------|---------|-------------|----------------|
| `@modelcontextprotocol/sdk` | ^1.28.0 | Register plugin-contributed MCP tools dynamically | SDK's `ListToolsRequestSchema` handler already returns a dynamic array; just merge plugin tools into it |
| `better-sqlite3` | ^11.0.0 | No new DB reads needed; plugin tools are filesystem-defined | MCP server reads plugin.json files from plugins directory |
| `zod` | ^3.23.0 | Validate plugin-contributed tool input schemas at registration time | Already available |

## Architecture: How New Features Integrate

### 1. Plugin Manifest Extension (Rust -- manifest.rs)

Extend `PluginManifest` with three new optional fields. Backward-compatible via `#[serde(default)]` (existing test `test_unknown_extra_fields_accepted` validates this pattern):

```rust
// Add to PluginManifest struct in manifest.rs
#[serde(default)]
pub mcp_tools: Vec<McpToolDefinition>,

#[serde(default)]
pub skills: Vec<SkillDefinition>,

#[serde(default)]
pub directories: Vec<DirectoryDeclaration>,
```

New types (pure Rust structs, no new crates):

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct McpToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    #[serde(default)]
    pub destructive: bool,
    pub tauri_command: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DirectoryDeclaration {
    pub name: String,
    pub path: String,              // relative to app home dir
    pub description: String,
    #[serde(default)]
    pub create_on_activate: bool,
}
```

### 2. Plugin Capability Extension (Rust -- manifest.rs)

Add three new variants to `PluginCapability`:

```rust
#[serde(rename = "mcp")]
Mcp,           // Can register MCP tools
#[serde(rename = "skills")]
Skills,        // Can register hub chat skills
#[serde(rename = "directories")]
Directories,   // Can declare owned directories
```

### 3. Action Registry Extension (TypeScript -- actionRegistry.ts)

The current `ACTION_REGISTRY` is a static `const` array. Extend to merge plugin-contributed skills at runtime:

```typescript
let pluginSkills: ActionDefinition[] = [];

export function registerPluginSkills(skills: ActionDefinition[]) {
  pluginSkills = skills;
}

export function getAllActions(): ActionDefinition[] {
  return [...ACTION_REGISTRY, ...pluginSkills];
}

// Update getToolDefinitions() and getAction() to use getAllActions()
```

The `useActionDispatch` hook already dispatches via `getAction(name).tauriCommand` -- plugin skills work automatically once registered.

### 4. MCP Server Dynamic Tool Registration (TypeScript -- mcp-server/src/index.ts)

The `ListToolsRequestSchema` handler currently returns a static array. Change to:
1. Read plugin directories at startup
2. Parse `plugin.json` files for `mcp_tools` arrays
3. Merge into the tool list
4. Route plugin tool calls through a generic Tauri-command-via-agent-queue dispatch

No new dependencies -- the MCP server already reads files with `node:fs`.

### 5. Knowledge Engine Operations (Rust -- new module)

All .knowledge/ operations are plain filesystem + LLM API calls:

| Operation | Implementation Path | Existing Infrastructure Used |
|-----------|---------------------|------------------------------|
| **Ingest** | Read source file -> LLM prompt -> Write wiki/ pages -> Update index.md | AI gateway (`src-tauri/src/ai/`) + `tokio::fs` |
| **Query** | Read index.md -> LLM identifies relevant pages -> Read pages -> LLM synthesize | AI gateway + `tokio::fs` |
| **Lint** | Read all wiki/ pages -> LLM analyze for contradictions/gaps -> Report | AI gateway + `tokio::fs` |
| **Index** | Read wiki/ directory listing -> LLM generates index.md | AI gateway + `tokio::fs` |

### 6. Knowledge Engine as Core Plugin (Rust -- core/mod.rs)

Register alongside existing core-shell, core-http, core-filesystem, core-calendar:

```json
{
  "name": "core-knowledge",
  "version": "0.1.0",
  "display_name": "Knowledge Engine",
  "description": "LLM-compiled wiki for persistent context management",
  "capabilities": ["fs:read", "fs:write", "mcp", "skills", "directories"],
  "mcp_tools": [
    { "name": "knowledge_query", "description": "Query the knowledge wiki" },
    { "name": "knowledge_ingest", "description": "Ingest a source into the wiki" },
    { "name": "knowledge_lint", "description": "Lint the wiki for issues" },
    { "name": "knowledge_index", "description": "Rebuild the wiki index" }
  ],
  "skills": [
    { "name": "wiki", "description": "Query or manage the knowledge wiki", "tauri_command": "knowledge_dispatch", "destructive": false }
  ],
  "directories": [
    { "name": ".knowledge", "path": ".knowledge", "create_on_activate": true }
  ]
}
```

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|---------------------|
| Vector database (Qdrant, Chroma, pgvector) | MVP uses LLM-maintained index.md (~2K tokens for 50-100 articles); vectorization deferred until 500+ articles per SEED-001 | LLM scans index.md to find relevant pages |
| Markdown AST parser (remark/unified in Rust) | Wiki articles are simple markdown; frontmatter parsing is string split on `---` | `str::split`, regex for cross-refs |
| Separate plugin runtime (WASM, Deno, V8) | Plugins execute via Tauri commands, not arbitrary code; knowledge engine is a core plugin in Rust | Tauri command dispatch through manifest declarations |
| New UI framework or components | Hub chat already renders markdown; no separate wiki view at MVP | Wiki content served through existing hub chat |
| Full-text search library (tantivy, MeiliSearch) | LLM index.md IS the search engine; full-text search is a future optimization when 500+ articles | index.md with LLM-assisted lookup |
| GraphQL or REST API layer | Tauri IPC (`invoke`) and MCP (stdio) are the communication channels | Existing Tauri commands + MCP tool handlers |
| New Zustand store for knowledge state | Knowledge lives on filesystem (.knowledge/), not in reactive state; hub chat queries are request/response | Tauri commands return results directly; no persistent frontend state |
| SQLite tables for knowledge metadata | .knowledge/ is file-based by design (SEED-001); SQLite is for app entities (tasks, projects) | index.md and log.md are the metadata stores |
| WebSocket/SSE for knowledge updates | Tauri events (`emit`/`listen`) already handle frontend push notifications | `tauri::Manager::emit` for progress during long ingest operations |

## Alternatives Considered

| Approach | Alternative | Why Not |
|----------|-------------|---------|
| Extend `PluginManifest` struct | Separate manifest files per capability (skills.json, mcp.json) | Over-engineered; one plugin.json with optional `#[serde(default)]` fields is simpler; hot-reload already watches single file |
| Static core-knowledge plugin in Rust | External plugin loaded from plugins/ directory | Knowledge engine is too coupled to AI gateway internals; core plugin matches calendar/shell/etc. pattern |
| Skills as Tauri commands | Skills as WASM modules or JS scripts | WASM runtime adds massive complexity for zero benefit; Tauri commands are already the execution model for all bot actions |
| Merge plugin skills into ACTION_REGISTRY | Separate PluginSkillRegistry with parallel dispatch | One registry means hub chat sees all actions uniformly; `useActionDispatch` already dispatches via `getAction(name).tauriCommand` |
| MCP server reads plugin manifests from filesystem | MCP server queries Rust backend via agent-queue for tool list | Direct filesystem read is simpler; MCP server already has `node:fs`; avoids circular dependency |
| Frontmatter via `gray-matter` npm package | String split on `---` | gray-matter is 50KB for what `str.split('---')` does; wiki articles have trivial frontmatter |

## Version Compatibility

No compatibility concerns. All changes are additive:

| Change | Compatibility Impact |
|--------|---------------------|
| New `PluginManifest` fields | `#[serde(default)]` -- existing plugins with no mcp_tools/skills/directories fields parse fine |
| New `PluginCapability` variants | Existing `#[serde(rename_all = "snake_case")]` handles new string variants; unknown variants in old manifests produce parse warnings, not errors |
| New Tauri commands | Additive -- existing commands unchanged |
| New MCP tools | Additive -- MCP server's tool list grows; existing tools unchanged |
| New action registry entries | `getAllActions()` is a superset of `ACTION_REGISTRY` |

Forward compatibility was already validated by existing test: `test_unknown_extra_fields_accepted` in manifest.rs.

## New Tauri Commands Needed

| Command | Module | Purpose |
|---------|--------|---------|
| `knowledge_dispatch` | `commands/knowledge_commands.rs` (new) | Hub chat skill entry point -- routes to ingest/query/lint/index |
| `knowledge_query` | same | Direct query (also MCP-callable) |
| `knowledge_ingest` | same | Ingest raw source into wiki |
| `knowledge_lint` | same | Run lint analysis |
| `knowledge_index` | same | Rebuild index.md |
| `list_plugin_skills` | `commands/plugin_commands.rs` (extend) | Return all registered skills for hub chat system prompt |
| `list_plugin_mcp_tools` | same | Return all registered MCP tools for MCP server sync |
| `ensure_plugin_directories` | same | Create declared directories on plugin activation |

## New Files Needed

| File | Purpose |
|------|---------|
| `src-tauri/src/knowledge/mod.rs` | Knowledge engine module (ingest, query, lint, index) |
| `src-tauri/src/knowledge/ingest.rs` | Ingest pipeline: read source -> LLM compile -> write wiki pages |
| `src-tauri/src/knowledge/query.rs` | Query pipeline: read index -> find pages -> LLM synthesize |
| `src-tauri/src/knowledge/lint.rs` | Lint pipeline: scan wiki -> LLM analyze -> report |
| `src-tauri/src/knowledge/index.rs` | Index rebuild: scan wiki dir -> LLM generate index.md |
| `src-tauri/src/commands/knowledge_commands.rs` | Tauri command handlers for knowledge operations |
| `mcp-server/src/tools/knowledge-tools.ts` | MCP tool handlers for knowledge operations (call Tauri via agent-queue or direct file ops) |

## Sources

- Existing codebase analysis (HIGH confidence): `src-tauri/src/plugins/manifest.rs` -- PluginManifest struct, StepTypeDefinition pattern, serde(default) usage
- Existing codebase analysis (HIGH confidence): `src-tauri/src/plugins/registry.rs` -- PluginRegistry, LoadedPlugin, status management
- Existing codebase analysis (HIGH confidence): `src-tauri/src/plugins/core/mod.rs` -- Core plugin registration pattern (4 plugins)
- Existing codebase analysis (HIGH confidence): `mcp-server/src/index.ts` -- MCP server tool registration, switch dispatch
- Existing codebase analysis (HIGH confidence): `src/lib/actionRegistry.ts` -- ACTION_REGISTRY array, ActionDefinition interface, getToolDefinitions()
- Existing codebase analysis (HIGH confidence): `src/hooks/useActionDispatch.ts` -- dispatch via getAction().tauriCommand
- Existing codebase analysis (HIGH confidence): `src-tauri/Cargo.toml` -- all current Rust dependencies
- Existing codebase analysis (HIGH confidence): `package.json` + `mcp-server/package.json` -- all current JS/TS dependencies
- SEED-001-knowledge-engine.md (HIGH confidence): Three-layer architecture, operations, MVP scope, no-vectorization decision

---
*Stack research for: v1.8 Knowledge Engine + Plugin Skill/MCP Registration*
*Researched: 2026-04-06*
