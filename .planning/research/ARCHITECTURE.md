# Architecture Patterns

**Domain:** Knowledge Engine plugin + plugin skill/MCP registration for Tauri 2.x desktop app
**Researched:** 2026-04-06
**Confidence:** HIGH (based on thorough codebase analysis of all integration points)

## Current Architecture Snapshot

Before describing the integration, here is how the relevant systems work today.

### Hub Chat Data Flow (current)

```
User types message
  -> HubChat.tsx builds chatMessages + system prompt (with manifest)
  -> hubChatSend() Tauri command (hub_chat_commands.rs)
  -> AiGateway.chat_stream() with ToolDefinition[]
  -> Streaming chunks emitted via "hub-chat-stream-chunk" event
  -> HubChat.tsx intercepts ACTION:{} blocks in chunks
  -> tryParseToolUse() extracts tool name + input
  -> handleToolUse() checks destructive flag
  -> useActionDispatch.dispatch() looks up ACTION_REGISTRY
  -> invoke(action.tauriCommand, input) calls Rust backend
  -> Result sent back to LLM as follow-up message (max 2 rounds)
```

Key observations:
- **Tool definitions are TypeScript-side only** (`src/lib/actionRegistry.ts`). They are passed to `hub_chat_send` as parameters, not sourced from Rust.
- **ACTION_REGISTRY is a static array** of 16 actions. No dynamic registration mechanism.
- **MCP server is a separate sidecar process** (`mcp-server/`). It talks to external agents (Claude Code) via stdio, reads element.db directly with better-sqlite3. It does NOT talk to hub chat.
- **Hub chat and MCP server are completely separate channels.** Hub chat uses Tauri commands; MCP server uses direct DB access + file-based queue for orchestration tools.

### Plugin System (current)

```
PluginHost.scan_and_load()
  -> reads plugins/ directory
  -> register_core_plugins() adds 4 built-in plugins (shell, http, filesystem, calendar)
  -> Reads plugin.json manifests from filesystem plugins
  -> PluginRegistry stores LoadedPlugin (manifest + status + path)
```

Key observations:
- **Manifests declare capabilities** (network, fs:read, fs:write, credentials, shell) and step_types, but NOT MCP tools or hub chat skills.
- **PluginApi trait exists** (`src-tauri/src/plugins/api.rs`) but is `#[allow(dead_code)]` -- it is scaffolding, not wired.
- **No execution path** from plugin registry to hub chat or MCP server. Plugins define workflow step types, not interactive tools.
- **Hot-reload via notify watcher** already works for manifest changes.

### MCP Server (current)

```
mcp-server/src/index.ts
  -> Hardcoded tool list (23 tools) in ListToolsRequestSchema handler
  -> Hardcoded switch/case dispatch in CallToolRequestSchema handler
  -> Reads element.db directly (better-sqlite3, read-only for reads, write for mutations)
  -> File-based queue (.element/agent-queue/) for orchestration tools
  -> Separate process, stdio transport, launched as sidecar
```

### Action Registry (current)

```
src/lib/actionRegistry.ts
  -> Static ACTION_REGISTRY array (16 actions)
  -> Each action: name, description, inputSchema, destructive flag, tauriCommand
  -> getToolDefinitions() converts to LLM tool format
  -> useActionDispatch hook: looks up registry, calls invoke(tauriCommand, input)
```

## Recommended Architecture for v1.8

### Design Principle: Plugin-Registered Skills, Unified Registry

The core insight: **plugins should declare tools/skills in their manifest, and the existing action registry + MCP server should dynamically incorporate them.** This avoids creating a parallel execution path.

### Extended Plugin Manifest

```json
{
  "name": "knowledge-engine",
  "version": "1.0.0",
  "display_name": "Knowledge Engine",
  "description": "LLM-compiled wiki for persistent context management",
  "author": "Element",
  "capabilities": ["fs:read", "fs:write"],
  "credentials": [],
  "owned_directories": [".knowledge"],
  "skills": [
    {
      "name": "wiki_ingest",
      "description": "Ingest a source document into the knowledge wiki. Reads the source, extracts key information, integrates into existing wiki pages, updates cross-references, and logs the activity.",
      "input_schema": {
        "type": "object",
        "properties": {
          "source_path": { "type": "string", "description": "Path to source file to ingest (relative to .knowledge/raw/)" },
          "source_text": { "type": "string", "description": "Raw text to ingest (alternative to source_path)" }
        }
      },
      "destructive": false
    },
    {
      "name": "wiki_query",
      "description": "Search the knowledge wiki for information. Scans the index, reads relevant pages, and synthesizes an answer.",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Question or topic to search for" }
        },
        "required": ["query"]
      },
      "destructive": false
    },
    {
      "name": "wiki_lint",
      "description": "Audit the knowledge wiki for contradictions, stale claims, orphan pages, missing cross-references, and data gaps.",
      "input_schema": {
        "type": "object",
        "properties": {}
      },
      "destructive": false
    },
    {
      "name": "wiki_status",
      "description": "Get the current state of the knowledge wiki: article count, last ingest, categories, and health.",
      "input_schema": {
        "type": "object",
        "properties": {}
      },
      "destructive": false
    }
  ],
  "mcp_tools": [
    {
      "name": "wiki_query",
      "description": "Search the knowledge wiki for information relevant to a query.",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Question or topic to search for" }
        },
        "required": ["query"]
      }
    },
    {
      "name": "wiki_ingest",
      "description": "Ingest text into the knowledge wiki as a new source.",
      "input_schema": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "content": { "type": "string" },
          "category": { "type": "string" }
        },
        "required": ["title", "content"]
      }
    }
  ]
}
```

### Component Boundaries

| Component | Responsibility | Communicates With | Status |
|-----------|---------------|-------------------|--------|
| **PluginManifest** (Rust) | Parse skills, mcp_tools, owned_directories from plugin.json | PluginRegistry | MODIFY: add 3 new fields to struct |
| **PluginRegistry** (Rust) | Store loaded plugins with their tool/skill declarations | PluginHost, SkillRouter | EXISTING: no changes needed |
| **SkillRouter** (Rust, NEW) | Route skill invocations to the correct plugin handler | Hub chat commands, PluginRegistry | NEW: central dispatch for plugin skills |
| **KnowledgePlugin** (Rust, NEW) | Implement wiki_ingest, wiki_query, wiki_lint, wiki_status operations | SkillRouter, filesystem (.knowledge/), AiGateway | NEW: core plugin registered in core/mod.rs |
| **DirectoryManager** (Rust, NEW) | Ensure plugin-owned directories exist, resolve paths, prevent overlaps | PluginHost on load | NEW: small utility for owned_directories |
| **ActionRegistry** (TypeScript) | Provide tool definitions to hub chat LLM | HubChat, useActionDispatch | MODIFY: merge plugin skills dynamically |
| **useActionDispatch** (TypeScript) | Dispatch tool calls to Tauri commands | ActionRegistry, Tauri invoke | MODIFY: route plugin skills to skill_dispatch command |
| **MCP Server** (TypeScript sidecar) | Expose tools to external agents via MCP protocol | element.db, .knowledge/ filesystem | MODIFY: load plugin tool declarations dynamically |
| **Hub Chat Commands** (Rust) | Handle hub_chat_send with streaming | AiGateway, SkillRouter | MINIMAL: no changes (skills dispatched client-side) |

### New Components

#### 1. Extended PluginManifest (Rust - modify existing)

Add to `src-tauri/src/plugins/manifest.rs`:

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    #[serde(default)]
    pub destructive: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct McpToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

// Add to PluginManifest struct:
pub struct PluginManifest {
    // ... existing fields ...
    #[serde(default)]
    pub owned_directories: Vec<String>,
    #[serde(default)]
    pub skills: Vec<SkillDefinition>,
    #[serde(default)]
    pub mcp_tools: Vec<McpToolDefinition>,
}
```

Because all three new fields use `#[serde(default)]`, existing plugin.json files with no skills/mcp_tools/owned_directories will continue to parse correctly. Zero migration cost.

#### 2. SkillRouter (Rust - new)

New file: `src-tauri/src/plugins/skill_router.rs`

Central dispatcher that:
- Queries PluginRegistry for all active plugins with skills
- Maps skill name to plugin name
- Delegates execution to the correct plugin handler
- Returns structured results

```rust
/// Dispatch a skill invocation to the owning plugin's handler.
/// Returns JSON result string.
pub async fn dispatch_skill(
    plugin_host: &PluginHost,
    skill_name: &str,
    input: serde_json::Value,
    knowledge_dir: &Path,
) -> Result<serde_json::Value, PluginError>
```

Exposed as a single Tauri command:

```rust
#[tauri::command]
pub async fn dispatch_plugin_skill(
    skill_name: String,
    input: serde_json::Value,
    plugin_host: State<'_, Arc<PluginHost>>,
) -> Result<serde_json::Value, String>
```

This means ALL plugin skills route through one Tauri command, not one command per skill. This is critical -- it keeps the command surface flat and lets plugins register unlimited skills without Tauri command changes.

#### 3. KnowledgePlugin (Rust - new core plugin)

New file: `src-tauri/src/plugins/core/knowledge.rs`

Registered in `core/mod.rs` alongside shell, http, filesystem, calendar. Implements:

- **wiki_ingest**: Read source file/text -> call LLM to extract and integrate -> write wiki pages -> update index.md -> append to log.md
- **wiki_query**: Read index.md -> identify relevant pages -> read them -> call LLM to synthesize answer -> return answer
- **wiki_lint**: Read all wiki pages -> call LLM to find issues -> return lint report
- **wiki_status**: Read index.md + count files in wiki/ and raw/ -> return summary

Each operation follows the three-layer structure from SEED-001:
```
.knowledge/
  schema.md          # Rules
  index.md           # LLM-maintained catalog (~2K tokens)
  log.md             # Append-only activity record
  raw/               # Immutable sources
  wiki/              # LLM-compiled articles
```

#### 4. DirectoryManager (Rust - new, small)

New file: `src-tauri/src/plugins/directory_manager.rs`

On plugin load, reads `owned_directories` from manifest. Ensures directories exist. Provides path resolution (relative to app data dir). Prevents plugins from claiming overlapping directories.

```rust
pub fn ensure_plugin_directories(plugin: &LoadedPlugin, base_dir: &Path) -> Result<(), PluginError>
pub fn resolve_plugin_dir(plugin_name: &str, dir_name: &str, base_dir: &Path) -> PathBuf
```

#### 5. Dynamic Action Registry (TypeScript - modify existing)

Currently `ACTION_REGISTRY` is a static array. Add a Tauri command that returns all plugin-registered skills, and merge them into the tool list at runtime.

Add a `list_plugin_skills` Tauri command that returns skills from all active plugins. The frontend calls this on mount and when plugins change.

```typescript
// actionRegistry.ts additions
export async function loadDynamicTools(): Promise<ActionDefinition[]> {
  const pluginSkills = await invoke<PluginSkillDef[]>("list_plugin_skills");
  const dynamic = pluginSkills.map(s => ({
    name: s.name,
    description: s.description,
    inputSchema: s.input_schema,
    destructive: s.destructive,
    tauriCommand: "dispatch_plugin_skill", // All plugin skills use same command
  }));
  return [...ACTION_REGISTRY, ...dynamic];
}
```

#### 6. MCP Server Plugin Tool Loading (TypeScript sidecar - modify)

The MCP server needs to dynamically include plugin-declared MCP tools. Since the MCP server runs as a separate process, the cleanest approach:

**Read plugin manifests from the plugins directory at startup.** Parse `mcp_tools` from each active plugin's `plugin.json`. Add them to the `ListToolsRequestSchema` response.

For tool execution, the MCP server reads `.knowledge/` filesystem directly (it already has filesystem access for write-tools). MCP wiki_query returns raw page content -- external agents can reason over it themselves without LLM synthesis.

For MCP wiki_ingest (write operation), the MCP server writes to `.element/agent-queue/` (existing orchestration pattern) and the Rust backend processes the queue. This avoids concurrent writes to `.knowledge/` from two processes.

New file: `mcp-server/src/tools/plugin-tools.ts`

```typescript
export function loadPluginTools(pluginsDir: string): McpToolDefinition[]
export function handlePluginTool(
  toolName: string,
  args: unknown,
  knowledgeDir: string
): Promise<McpResult>
```

### Data Flow: Hub Chat -> Wiki Query

```
1. User: "What do we know about OAuth patterns?"
2. HubChat.tsx sends message with tool definitions (including wiki_query from dynamic registry)
3. LLM responds with ACTION:{"name":"wiki_query","input":{"query":"OAuth patterns"}}
4. tryParseToolUse() extracts the action
5. handleToolUse() -> useActionDispatch.dispatch("wiki_query", {query: "OAuth patterns"})
6. dispatch() finds action.tauriCommand = "dispatch_plugin_skill"
7. invoke("dispatch_plugin_skill", {skillName: "wiki_query", input: {query: "OAuth patterns"}})
8. Rust SkillRouter receives, looks up "wiki_query" -> "knowledge-engine" plugin
9. KnowledgePlugin.query():
   a. Read .knowledge/index.md
   b. Parse categories/page summaries
   c. Find relevant pages (string matching on index, no vectors)
   d. Read matched wiki/ files
   e. Call LLM to synthesize answer from page contents
   f. Return answer as JSON
10. Result flows back through invoke -> dispatch -> sendToolResult
11. LLM receives answer, presents to user naturally
```

### Data Flow: Hub Chat -> Wiki Ingest

```
1. User: "Remember that our API rate limit is 1000 req/min per tenant"
2. LLM responds with ACTION:{"name":"wiki_ingest","input":{"source_text":"API rate limit: 1000 req/min per tenant"}}
3. Same dispatch chain as above -> KnowledgePlugin.ingest():
   a. Read .knowledge/schema.md for structure rules
   b. Read .knowledge/index.md for existing pages
   c. Call LLM: "Given this source and existing wiki, integrate this information"
   d. LLM returns structured response with file operations
   e. Write new/updated wiki/ files
   f. Update index.md with new entries
   g. Append to log.md
   h. Return summary of changes
```

### Data Flow: MCP Server -> Wiki Query (External Agent)

```
1. Claude Code calls wiki_query tool via MCP stdio
2. mcp-server/src/index.ts dispatches to handlePluginTool
3. plugin-tools.ts:
   a. Read .knowledge/index.md directly from filesystem
   b. Find relevant pages (substring match on index entries)
   c. Read and concatenate page contents
   d. Return concatenated content (no LLM synthesis -- external agent reasons itself)
4. Result returned via MCP stdio to Claude Code
```

Note: MCP server wiki_query is simpler than hub chat wiki_query. MCP returns raw page content; hub chat uses LLM to synthesize. External agents can reason over raw content themselves.

### Data Flow: MCP Server -> Wiki Ingest (External Agent)

```
1. Claude Code calls wiki_ingest tool via MCP stdio
2. mcp-server writes to .element/agent-queue/wiki-ingest-{timestamp}.json
3. Rust backend queue watcher picks up the file
4. Routes to KnowledgePlugin.ingest() via SkillRouter
5. Wiki updated, result written to .element/agent-queue/wiki-ingest-{timestamp}-result.json
6. (MCP server polls for result or returns acknowledgment)
```

This is the existing orchestration pattern (request_approval, send_notification use the same queue). No new infrastructure needed.

## Patterns to Follow

### Pattern 1: Single Dispatch Command for All Plugin Skills

**What:** All plugin skills route through one `dispatch_plugin_skill` Tauri command. The skill name is a parameter, not a separate command.

**Why:** Avoids modifying Tauri command registration every time a plugin adds a skill. The plugin system should be open for extension without recompilation for external plugins. Even for core plugins, it keeps the API surface clean.

**Example:**
```rust
#[tauri::command]
pub async fn dispatch_plugin_skill(
    skill_name: String,
    input: serde_json::Value,
    plugin_host: State<'_, Arc<PluginHost>>,
    db: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
) -> Result<serde_json::Value, String> {
    let router = SkillRouter::new(&plugin_host);
    router.dispatch(&skill_name, input, &db, &gateway).await
        .map_err(|e| e.to_string())
}
```

### Pattern 2: Core Plugin for Knowledge Engine

**What:** Register the knowledge engine as a core plugin in `plugins/core/knowledge.rs`, same as shell, http, filesystem, calendar.

**Why:** Uses the existing plugin infrastructure. Gets hot-reload for free (manifest changes trigger re-scan). Shows that the skill system works for core features before opening it to external plugins.

### Pattern 3: LLM-as-Compiler for Wiki Operations

**What:** Wiki operations (ingest, query, lint) call the AiGateway internally. The knowledge plugin is an LLM consumer, not a dumb data store.

**Why:** This is the core insight from SEED-001. The LLM maintains the wiki -- cross-references, summaries, index updates. Without LLM compilation, it is just a file dump.

**Implication:** The SkillRouter needs access to AiGateway (via Tauri State). This means skill handlers are async and can call AI providers.

### Pattern 4: Index-as-Search for MVP

**What:** No vector database. `index.md` is a ~2K token file listing all wiki pages with summaries. The LLM scans it to find relevant pages.

**Why:** At MVP scale (under 100 articles), full-text scanning of a 2K token index is cheaper and simpler than embedding infrastructure. Vectorization deferred until the wiki exceeds ~500 articles.

### Pattern 5: Separate skills vs mcp_tools in Manifest

**What:** Plugin manifests declare `skills` (for hub chat) and `mcp_tools` (for external agents) separately, even when they overlap.

**Why:** Hub chat skills and MCP tools have different execution contexts. Hub chat skills run in the Rust backend process with full Tauri state access (AiGateway, Database). MCP tools run in the sidecar with direct filesystem/DB access. A hub chat wiki_query calls LLM for synthesis; an MCP wiki_query returns raw content. The manifest makes both explicit so each consumer loads what it needs.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate MCP Server for Plugins

**What:** Creating a new sidecar process for plugin MCP tools.
**Why bad:** Multiplies process management complexity. The existing MCP server already handles 23 tools. Adding plugin tools to the same server is straightforward.
**Instead:** Extend the existing MCP server to dynamically load plugin tool declarations from manifest files.

### Anti-Pattern 2: Plugin Skills as Individual Tauri Commands

**What:** Registering each plugin skill as its own `#[tauri::command]`.
**Why bad:** Tauri commands are compiled into the binary. External plugins cannot add new ones. Even for core plugins, it creates coupling between the plugin system and the command layer.
**Instead:** Single `dispatch_plugin_skill` command that routes to the correct handler.

### Anti-Pattern 3: Frontend-Owned Plugin State

**What:** Having the React frontend manage which plugins are loaded and what skills they provide.
**Why bad:** The Rust backend already has PluginHost with hot-reload watcher. Duplicating this in TypeScript creates synchronization issues.
**Instead:** Frontend queries backend for current plugin state. Backend is source of truth.

### Anti-Pattern 4: Wiki Writes Through Hub Chat System Prompt

**What:** Putting wiki content in the hub chat system prompt and hoping the LLM updates it naturally.
**Why bad:** System prompts are read-only context. Wiki operations need structured write paths with logging and index updates.
**Instead:** Explicit wiki_ingest skill that the LLM invokes via ACTION blocks.

### Anti-Pattern 5: Shared Wiki Access Without Coordination

**What:** Both MCP server and Rust backend writing to `.knowledge/` simultaneously without coordination.
**Why bad:** Concurrent writes to index.md or wiki pages could corrupt data.
**Instead:** MCP server has read-only access to `.knowledge/`. Write operations from MCP go through `.element/agent-queue/` (existing pattern) and the Rust backend processes the queue.

## Files Changed Summary

### New Files

| File | Purpose |
|------|---------|
| `src-tauri/src/plugins/skill_router.rs` | Central skill dispatch, maps skill names to plugin handlers |
| `src-tauri/src/plugins/core/knowledge.rs` | Knowledge engine implementation (ingest, query, lint, status) |
| `src-tauri/src/plugins/directory_manager.rs` | Plugin-owned directory creation and path resolution |
| `src-tauri/src/commands/skill_commands.rs` | `dispatch_plugin_skill` and `list_plugin_skills` Tauri commands |
| `mcp-server/src/tools/plugin-tools.ts` | Dynamic plugin tool loading and dispatch for MCP server |

### Modified Files

| File | Change |
|------|--------|
| `src-tauri/src/plugins/manifest.rs` | Add `owned_directories`, `skills`, `mcp_tools` to PluginManifest |
| `src-tauri/src/plugins/mod.rs` | Add `pub mod skill_router; pub mod directory_manager;`, call directory_manager on load |
| `src-tauri/src/plugins/core/mod.rs` | Add `pub mod knowledge;`, register knowledge plugin |
| `src-tauri/src/commands/mod.rs` | Add `pub mod skill_commands;` |
| `src-tauri/src/main.rs` | Register `dispatch_plugin_skill` and `list_plugin_skills` commands |
| `src/lib/actionRegistry.ts` | Add `loadDynamicTools()` that merges static actions + plugin skills |
| `src/hooks/useActionDispatch.ts` | Route plugin skills through `dispatch_plugin_skill` command |
| `src/components/hub/HubChat.tsx` | Call `loadDynamicTools()` on mount, use dynamic tool list |
| `mcp-server/src/index.ts` | Import and register plugin tools dynamically |

## Suggested Build Order

Dependencies flow downward. Each phase builds on the previous.

### Phase 1: Plugin Manifest Evolution

Extend PluginManifest with `skills`, `mcp_tools`, `owned_directories`. Add DirectoryManager. No runtime behavior change yet -- just the data model.

**Depends on:** Nothing
**Unblocks:** Everything else

### Phase 2: Skill Router + Dispatch Command

Build SkillRouter and the `dispatch_plugin_skill` / `list_plugin_skills` Tauri commands. Test with a dummy skill. This is the core plumbing.

**Depends on:** Phase 1 (manifest has skills)
**Unblocks:** Phase 3 (knowledge plugin), Phase 4 (hub chat integration)

### Phase 3: Knowledge Engine Core Plugin

Implement the knowledge plugin with all four operations (ingest, query, lint, status). Test via `dispatch_plugin_skill` directly. Creates `.knowledge/` directory structure.

**Depends on:** Phase 2 (skill router exists)
**Unblocks:** Phase 4 (hub chat uses it), Phase 5 (MCP uses it)

### Phase 4: Hub Chat Integration

Wire dynamic tool loading into HubChat. Plugin skills appear as available tools. useActionDispatch routes them through dispatch_plugin_skill.

**Depends on:** Phase 2 (dispatch command), Phase 3 (knowledge plugin works)
**Unblocks:** End-to-end hub chat wiki usage

### Phase 5: MCP Server Integration

Extend MCP server to load plugin manifests and expose their mcp_tools. Wiki query via MCP returns raw content. Write operations go through agent queue.

**Depends on:** Phase 3 (knowledge plugin works, .knowledge/ exists)
**Unblocks:** External agent wiki access

## Scalability Considerations

| Concern | At 10 articles | At 100 articles | At 500+ articles |
|---------|---------------|-----------------|-------------------|
| Index scanning | Trivial (~200 tokens) | Fast (~2K tokens, fits in any context) | Needs vector pre-filter before LLM scan |
| Ingest speed | Instant (one LLM call) | Fast (one LLM call with index context) | May need chunked ingests, batch index updates |
| Wiki query | Single LLM call | Single LLM call, 3-5 pages read | Vector search to narrow, then LLM synthesis |
| Storage | KB | Tens of KB | MB range, still fine for local filesystem |

## Sources

- Codebase analysis: `src-tauri/src/plugins/` (manifest.rs, registry.rs, mod.rs, api.rs, core/mod.rs)
- Codebase analysis: `src/lib/actionRegistry.ts` (static action registry, 16 actions)
- Codebase analysis: `src/components/hub/HubChat.tsx` (tool use parsing, ACTION block dispatch flow)
- Codebase analysis: `src/hooks/useActionDispatch.ts` (Tauri command invocation via registry lookup)
- Codebase analysis: `mcp-server/src/index.ts` (23 hardcoded tools, stdio transport, switch dispatch)
- Codebase analysis: `src-tauri/src/commands/hub_chat_commands.rs` (streaming, AiGateway integration)
- Codebase analysis: `src-tauri/src/ai/types.rs` (ToolDefinition, ChatRequest structures)
- SEED-001: Knowledge engine architecture (three-layer wiki, operations, consumers)
- PROJECT.md: v1.8 milestone scope and active requirements

---
*Architecture research for: Element v1.8 Knowledge Engine*
*Researched: 2026-04-06*
