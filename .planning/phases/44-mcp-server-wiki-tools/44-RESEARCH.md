# Phase 44: MCP Plugin Tool Bridge (REWORK) - Research

**Researched:** 2026-04-10
**Domain:** MCP server DB-based dynamic tool discovery + dual dispatch for core/user plugins
**Confidence:** HIGH

## Summary

Phase 44 bridges the MCP server (Node.js/TypeScript, separate process) to the Rust plugin system so plugin-contributed MCP tools appear in ListTools/CallTools without MCP server code changes. The original research assumed plugins lived on disk as `plugin.json` files -- Phase 42 rework changed this. Core plugins (like knowledge) are defined in Rust code and have NO `plugin.json` on disk. Their tool definitions are synced to the `plugin_mcp_tools` SQLite table by `PluginHost::sync_mcp_tools_to_db()`.

The existing `plugin-loader.ts` reads `plugins/*/plugin.json` from the filesystem. This works for user plugins but NOT for core plugins. The DB table `plugin_mcp_tools` is the single source of truth for ALL plugin tools (core AND user), because `PluginHost::set_enabled()` writes to it for every plugin type. The MCP server should read this table instead of (or in addition to) scanning the filesystem.

The dual dispatch challenge: when the MCP server receives a CallTools request for a plugin tool, it needs to run handler code. For user plugins, handler JS files exist on disk (dynamic import). For core plugins like knowledge, there is no JS file in a plugin directory -- the handlers are in `mcp-server/src/tools/wiki-tools.ts`, already written and tested. The MCP server needs a built-in handler registry mapping core plugin tool names to their TypeScript handlers, with dynamic import as the fallback for user plugins.

**Primary recommendation:** Replace the filesystem-based `plugin-loader.ts` with a DB-based `plugin-tools.ts` that reads `plugin_mcp_tools` table at startup. Add a built-in handler map for core plugin tools (maps `core-knowledge:wiki_query` to `handleWikiQuery`, etc.). Fall back to dynamic import for user plugin tools. Keep existing hardcoded tools completely untouched.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Plugin-contributed MCP tools are loaded by reading plugin manifests at startup. MCP server restart required for changes.
- **D-02:** Existing hardcoded tools stay as-is. Only plugin-contributed tools (like wiki) come from manifests. No migration of existing tools.
- **D-03:** Handler code for plugin-contributed MCP tools lives in the plugin directory (e.g., `plugins/knowledge/mcp-handlers.ts`). MCP server dynamically imports the handler based on the path declared in the manifest.
- **D-04:** `wiki_query` scans `index.md` for relevant entries, then returns the full wiki articles for matches. Wiki articles ARE the summaries (compiled from raw sources) -- they are returned in full, not truncated or re-summarized.
- **D-05:** Each returned article includes its file path for reference.
- **D-06:** When no articles match, return a specific text message ("No wiki articles matched your query") rather than an empty array.
- **D-07:** `wiki_ingest` is fire-and-forget. Tool accepts the request, queues it via the agent queue (Phase 42), and returns an immediate acknowledgment with operation ID + "accepted" status.
- **D-08:** Agent provides a file path to the raw source document (not inline content). Wiki engine reads the file from disk.
- **D-09:** File path is validated before queuing -- return synchronous error for bad/unreadable paths.
- **D-10:** When wiki doesn't exist (no `.knowledge/` directory), return a clear MCP error: "Wiki not initialized. Enable the knowledge plugin first."
- **D-11:** `wiki_ingest` validates the file path exists and is readable BEFORE queuing. Returns synchronous error for bad paths so the agent knows immediately.

### Claude's Discretion
- MCP tool input schema design (parameter names, types, descriptions)
- Exact format of the acknowledgment response for `wiki_ingest`
- How to discover plugin manifest locations at startup (convention-based path vs config)
- Internal structure of the dynamic tool router alongside hardcoded tools

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

### REWORK Context (CRITICAL)
D-01 and D-03 were written BEFORE Phase 42 rework. They assumed core plugins would have `plugin.json` on disk. They do not. The INTENT of D-01 (load tools from plugin declarations) and D-03 (handler code mapped from manifest declarations) is preserved, but the MECHANISM must change:
- D-01 becomes: read `plugin_mcp_tools` DB table (which IS the runtime representation of plugin manifests)
- D-03 becomes: built-in handler map for core plugins (handlers in `mcp-server/src/tools/`), dynamic import for user plugins (handlers in plugin directories)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MCP-01 | External agents can query the wiki through MCP server tools (read-only) | `wiki_query` tool discovered via `plugin_mcp_tools` DB table, dispatched to existing `handleWikiQuery` in `wiki-tools.ts`. Handler already tested (5 tests in wiki-tools.test.ts). |
| MCP-02 | External agents can trigger wiki ingest through MCP server via the agent queue | `wiki_ingest` tool discovered via DB, dispatched to existing `handleWikiIngest` in `wiki-tools.ts`. Handler validates path, writes to agent-queue/operations/. Already tested (4 tests). |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | ^1.28.0 (latest 1.29.0) | MCP server framework | Already in use, provides ListTools/CallTools handlers |
| better-sqlite3 | ^11.0.0 (latest 12.8.0) | SQLite access from Node.js | Already in use for all existing DB reads, synchronous API |
| vitest | ^3.0.0 (latest 4.1.4) | Test runner | Already configured in mcp-server, all existing tests use it |

### Supporting
No new libraries needed. Zero new dependencies per project constraint.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DB-based discovery | Filesystem manifest scanning (current plugin-loader.ts) | Filesystem only works for user plugins with plugin.json -- core plugins have no disk manifest |
| Built-in handler map | IPC to Rust backend | Massive complexity increase, core plugin handlers do filesystem ops that work fine from Node.js |

## Architecture Patterns

### Discovery + Dispatch Architecture

The key architectural insight: **discovery** and **dispatch** are separate concerns with different solutions.

**Discovery (ListTools):** Read `plugin_mcp_tools` SQLite table. This table is populated by `PluginHost::sync_mcp_tools_to_db()` on the Rust side whenever a plugin is enabled/disabled. It contains: `prefixed_name` (PK, format `plugin_name:tool_name`), `plugin_name`, `description`, `input_schema` (JSON string), `enabled` (INTEGER).

**Dispatch (CallTools):** Two paths based on plugin type:
1. **Core plugins:** Built-in handler map in TypeScript. Map tool prefixed names to imported handler functions. Example: `"core-knowledge:wiki_query" -> handleWikiQuery`.
2. **User plugins:** Dynamic import from `{pluginsDir}/{pluginName}/mcp-handlers.js#{functionName}`. The handler file and function can be derived from convention or stored alongside DB records.

### Recommended File Changes

```
mcp-server/src/
  plugin-loader.ts     -> REWRITE as plugin-tools.ts (DB-based discovery + dual dispatch)
  tools/wiki-tools.ts  -> NO CHANGES (handlers already correct and tested)
  index.ts             -> UPDATE imports + dispatch to use new plugin-tools.ts
  db.ts                -> NO CHANGES
```

### Pattern 1: DB-Based Tool Discovery

**What:** Read `plugin_mcp_tools` table at startup to get tool definitions.
**When to use:** Always -- this is the ONLY discovery path needed.

```typescript
// plugin-tools.ts

import { type Database as DatabaseType } from "better-sqlite3";

export interface PluginToolDef {
  prefixedName: string;    // "core-knowledge:wiki_query"
  pluginName: string;      // "core-knowledge"
  toolName: string;        // "wiki_query" (derived from prefixedName)
  description: string;
  inputSchema: Record<string, unknown>;
}

export function loadPluginToolsFromDb(db: DatabaseType): PluginToolDef[] {
  const rows = db.prepare(
    "SELECT prefixed_name, plugin_name, description, input_schema FROM plugin_mcp_tools WHERE enabled = 1"
  ).all() as Array<{
    prefixed_name: string;
    plugin_name: string;
    description: string;
    input_schema: string;
  }>;

  return rows.map((row) => ({
    prefixedName: row.prefixed_name,
    pluginName: row.plugin_name,
    toolName: row.prefixed_name.split(":").slice(1).join(":"),
    description: row.description,
    inputSchema: JSON.parse(row.input_schema),
  }));
}
```

### Pattern 2: Dual Dispatch (Core + User Plugin Handlers)

**What:** Built-in handler map for core plugins, dynamic import fallback for user plugins.
**When to use:** In the CallTools handler for any tool not in the hardcoded switch-case.

```typescript
import { handleWikiQuery, handleWikiIngest } from "./tools/wiki-tools.js";

type PluginHandler = (dbPath: string, args: Record<string, unknown>) => McpResult;

// Built-in handlers for core plugin tools
const CORE_HANDLERS: Record<string, PluginHandler> = {
  "core-knowledge:wiki_query": (dbPath, args) =>
    handleWikiQuery(dbPath, args as { query: string }),
  "core-knowledge:wiki_ingest": (dbPath, args) =>
    handleWikiIngest(dbPath, args as { filePath: string }),
};

export async function dispatchPluginTool(
  toolName: string,
  pluginName: string,
  dbPath: string,
  pluginsDir: string,
  args: Record<string, unknown>,
): Promise<McpResult> {
  // Try core handler first
  const coreHandler = CORE_HANDLERS[`${pluginName}:${toolName}`]
    ?? CORE_HANDLERS[`${pluginName.replace(/^core-/, "")}:${toolName}`];
  if (coreHandler) {
    return coreHandler(dbPath, args);
  }

  // Fall back to dynamic import for user plugins
  const handlerPath = join(pluginsDir, pluginName, "mcp-handlers.js");
  const mod = await import(handlerPath);
  const handler = mod[`handle_${toolName}`] ?? mod[toolName];
  if (typeof handler !== "function") {
    throw new Error(`Handler for "${toolName}" not found in ${handlerPath}`);
  }
  return handler(dbPath, args);
}
```

### Pattern 3: Prefixed Name Format

The DB uses `plugin_name:tool_name` format. Phase 42 plan registers knowledge as `"core-knowledge"`, so:
- `prefixed_name` = `"core-knowledge:wiki_query"`
- `prefixed_name` = `"core-knowledge:wiki_ingest"`

The `:` separator is already the established convention (see `tool-registry.test.ts` line 440-447, `plugin-loader.ts` line 73).

### Anti-Patterns to Avoid
- **Parsing plugin.json for core plugins:** Core plugins have NO plugin.json on disk. The DB is the source of truth.
- **Separate discovery paths for core vs user:** Use one path (DB table) for discovery. Only dispatch differs.
- **Hardcoding wiki tools in index.ts switch-case:** They must go through the plugin dispatch path so future plugins work the same way.
- **Removing plugin-loader.ts without keeping user plugin support:** User plugins with plugin.json still need the dynamic import path for dispatch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite access | Custom file-based DB reader | better-sqlite3 (already used) | Synchronous, fast, handles WAL mode, already configured |
| Tool schema validation | Runtime schema validator | Trust DB contents | Rust side validates on write; MCP SDK validates on call |
| Wiki file operations | New filesystem handlers | Existing wiki-tools.ts | Already written, tested with 9 passing tests |

## Common Pitfalls

### Pitfall 1: prefixed_name Lookup Mismatch
**What goes wrong:** The MCP tool name in ListTools doesn't match what CallTools receives, causing dispatch failures.
**Why it happens:** ListTools might expose `"core-knowledge:wiki_query"` but the core handler map uses `"knowledge:wiki_query"` (without the `core-` prefix).
**How to avoid:** Use the exact `prefixed_name` from the DB as the MCP tool name. The CORE_HANDLERS map must use the exact same key.
**Warning signs:** "Unknown tool" errors when calling a tool that appears in ListTools.

### Pitfall 2: Empty plugin_mcp_tools Table
**What goes wrong:** MCP server starts before Phase 42 has enabled the knowledge plugin, so the table is empty. Or after app reinstall/DB reset.
**Why it happens:** The DB table is populated at runtime when `PluginHost::set_enabled("core-knowledge", true)` is called. If the app hasn't been started yet, or the plugin isn't enabled, no tools appear.
**How to avoid:** This is expected behavior -- plugin tools only appear when their plugin is enabled. Document this clearly. Don't treat empty results as an error.
**Warning signs:** `loadPluginToolsFromDb()` returns empty array. Not a bug.

### Pitfall 3: better-sqlite3 Concurrent Access
**What goes wrong:** WAL mode contention between Tauri (rusqlite) and MCP server (better-sqlite3) writing/reading the same DB.
**Why it happens:** Two processes share one SQLite file.
**How to avoid:** MCP server only READS `plugin_mcp_tools` (at startup). Writes happen from Rust side only. WAL mode + busy_timeout (already configured in db.ts) handles this fine for read-only access.
**Warning signs:** SQLITE_BUSY errors.

### Pitfall 4: Stale Tool List After Plugin Enable/Disable
**What goes wrong:** User enables a plugin in the app, but MCP server still shows the old tool list.
**Why it happens:** D-01 says "MCP server restart required for changes." Tools are loaded once at startup.
**How to avoid:** This is by design per D-01. Accept it. Future enhancement could add a `refresh_tools` MCP tool or file-watcher, but that's out of scope.
**Warning signs:** New plugin tools not appearing -- expected until MCP server restart.

### Pitfall 5: esbuild Dynamic Import Resolution
**What goes wrong:** Dynamic `import()` of user plugin handler files fails in the bundled output.
**Why it happens:** esbuild bundles code into a single file; `import()` with non-literal paths is left as-is (which is correct), but the resolved path may be wrong relative to the bundle output location.
**How to avoid:** Use absolute paths for dynamic imports (already done in the existing plugin-loader.ts pattern). The `pluginsDir` is resolved to an absolute path from `dbPath`.
**Warning signs:** "Cannot find module" errors for user plugin handlers.

## Code Examples

### Reading plugin_mcp_tools Table
```typescript
// Source: Verified from migration 013_plugin_mcp_tools.sql and PluginHost::sync_mcp_tools_to_db()
const stmt = db.prepare(
  "SELECT prefixed_name, plugin_name, description, input_schema FROM plugin_mcp_tools WHERE enabled = 1"
);
const rows = stmt.all();
// rows: [{ prefixed_name: "core-knowledge:wiki_query", plugin_name: "core-knowledge", description: "...", input_schema: '{"type":"object",...}' }]
```

### Merging Plugin Tools into ListTools Response
```typescript
// Source: Existing pattern in index.ts lines 395-401
const pluginToolDefs = loadPluginToolsFromDb(db);

// In ListToolsRequestSchema handler:
...pluginToolDefs.map((t) => ({
  name: t.prefixedName,
  description: t.description,
  inputSchema: t.inputSchema,
})),
```

### Dispatch in CallTools Default Case
```typescript
// Source: Existing pattern in index.ts lines 579-617
default: {
  const pluginTool = pluginToolDefs.find((t) => t.prefixedName === name);
  if (pluginTool) {
    try {
      return await dispatchPluginTool(
        pluginTool.toolName,
        pluginTool.pluginName,
        dbPath,
        pluginsDir,
        args as Record<string, unknown>,
      );
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
  return { content: [{ type: "text" as const, text: `Error: Unknown tool "${name}"` }], isError: true };
}
```

### Existing wiki-tools.ts Handler Signatures (NO CHANGES NEEDED)
```typescript
// Source: mcp-server/src/tools/wiki-tools.ts (already written and tested)
export function handleWikiQuery(dbPath: string, args: { query: string }): McpResult
export function handleWikiIngest(dbPath: string, args: { filePath: string }): McpResult
```

## State of the Art

| Old Approach (pre-rework) | Current Approach (post-Phase 42 rework) | When Changed | Impact |
|---------------------------|----------------------------------------|--------------|--------|
| Read `plugins/*/plugin.json` from filesystem | Read `plugin_mcp_tools` SQLite table | Phase 42 rework (2026-04-10) | Core plugins have no disk manifest; DB is single source of truth |
| All plugins have JS handler files on disk | Core plugins have built-in TS handlers; user plugins have JS on disk | Phase 42 rework | Need dual dispatch path |
| Single `loadPluginTools()` function | `loadPluginToolsFromDb()` + `dispatchPluginTool()` | This phase | Separates discovery from dispatch |

**Deprecated/outdated:**
- `plugin-loader.ts` (filesystem-based manifest scanning): Still correct for user plugin dispatch path, but no longer the discovery mechanism. Should be rewritten or replaced.
- The old `PluginMcpTool.handlerModule` / `PluginMcpTool.handlerFunction` interface: Still needed for user plugin dispatch but not for core plugins.

## Existing Code Inventory

### Files That Need Changes

| File | Change Type | What Changes |
|------|-------------|-------------|
| `mcp-server/src/plugin-loader.ts` | REWRITE -> `plugin-tools.ts` | DB-based discovery + dual dispatch (core handler map + dynamic import fallback) |
| `mcp-server/src/index.ts` | UPDATE | Import from new `plugin-tools.ts`, update dispatch in default case |
| `mcp-server/src/__tests__/plugin-loader.test.ts` | REWRITE -> `plugin-tools.test.ts` | Test DB-based discovery + both dispatch paths |
| `mcp-server/src/__tests__/tool-registry.test.ts` | UPDATE | Add expectations for plugin tools appearing when DB has entries |

### Files That Need NO Changes

| File | Why Unchanged |
|------|--------------|
| `mcp-server/src/tools/wiki-tools.ts` | Handlers already correct, tested with 9 tests |
| `mcp-server/src/__tests__/wiki-tools.test.ts` | Tests already passing, handler behavior unchanged |
| `mcp-server/src/db.ts` | DB connection works as-is |
| `mcp-server/package.json` | No new dependencies |
| All `src-tauri/` Rust code | Phase 42 handles Rust-side registration; this phase is MCP-server-only |

### Existing Test Coverage (wiki-tools.test.ts -- 9 tests, all passing)
- `handleWikiQuery`: 6 tests (no .knowledge/ dir, no index.md, no match, single match, case-insensitive, multiple matches)
- `handleWikiIngest`: 3 tests (no .knowledge/ dir, file not found, successful queue + acknowledgment) + 1 additional (operation ID format)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (^3.0.0 in devDependencies, 4.1.4 available) |
| Config file | Uses package.json `"test": "vitest run"` |
| Quick run command | `cd mcp-server && npx vitest run --reporter=verbose` |
| Full suite command | `cd mcp-server && npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCP-01 | wiki_query tool appears in ListTools when knowledge plugin enabled in DB | unit | `cd mcp-server && npx vitest run src/__tests__/plugin-tools.test.ts -x` | Wave 0 (rewrite from plugin-loader.test.ts) |
| MCP-01 | wiki_query handler returns correct results | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | EXISTING (9 tests) |
| MCP-02 | wiki_ingest tool appears in ListTools when knowledge plugin enabled in DB | unit | `cd mcp-server && npx vitest run src/__tests__/plugin-tools.test.ts -x` | Wave 0 |
| MCP-02 | wiki_ingest handler queues operation and returns ack | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | EXISTING |
| MCP-01/02 | Dispatch routes core-knowledge tools to built-in handlers | unit | `cd mcp-server && npx vitest run src/__tests__/plugin-tools.test.ts -x` | Wave 0 |
| MCP-01/02 | No plugin tools appear when DB table is empty | unit | `cd mcp-server && npx vitest run src/__tests__/plugin-tools.test.ts -x` | Wave 0 |
| TEST-04 | MCP server tests cover wiki_query and wiki_ingest tool handlers with expected contracts | unit | `cd mcp-server && npx vitest run` | EXISTING (wiki-tools.test.ts covers this) |

### Sampling Rate
- **Per task commit:** `cd mcp-server && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd mcp-server && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `mcp-server/src/__tests__/plugin-tools.test.ts` -- covers DB-based discovery + dispatch routing (replaces plugin-loader.test.ts)
- [ ] Update `mcp-server/src/__tests__/tool-registry.test.ts` -- verify plugin tools merge into tool list

## Open Questions

1. **User plugin handler convention for dispatch**
   - What we know: User plugins have `plugin.json` with `handler: "file.js#functionName"` field. The DB table does NOT store handler paths -- only `prefixed_name`, `plugin_name`, `description`, `input_schema`, `enabled`.
   - What's unclear: How does the MCP server know which JS file/function to call for a user plugin tool? The DB doesn't store this.
   - Recommendation: For user plugins, fall back to reading `plugin.json` from `{pluginsDir}/{pluginName}/plugin.json` to get the `handler` field. This is a hybrid approach: DB for discovery, filesystem for user plugin dispatch metadata. Core plugins bypass this entirely via the built-in handler map.

2. **Exact `prefixed_name` format for knowledge**
   - What we know: Phase 42 plan registers knowledge as `name: "core-knowledge"`. The `sync_mcp_tools_to_db` function does `format!("{}:{}", plugin_name, tool.name)`.
   - Conclusion: prefixed names will be `"core-knowledge:wiki_query"` and `"core-knowledge:wiki_ingest"`. The CORE_HANDLERS map must use these exact strings.
   - Status: RESOLVED -- verified from Rust source code.

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/db/sql/013_plugin_mcp_tools.sql` -- DB schema verified directly
- `src-tauri/src/plugins/mod.rs` lines 355-376 -- `sync_mcp_tools_to_db()` implementation verified
- `src-tauri/src/plugins/manifest.rs` -- `McpToolDefinition` struct verified
- `mcp-server/src/index.ts` -- Current MCP server entry point, all 23 hardcoded tools + plugin dispatch
- `mcp-server/src/plugin-loader.ts` -- Existing filesystem-based loader (to be replaced)
- `mcp-server/src/tools/wiki-tools.ts` -- Existing handlers (verified correct, 9 passing tests)
- `mcp-server/src/db.ts` -- DB connection pattern
- `.planning/phases/42-knowledge-engine-core/42-01-PLAN.md` -- Knowledge plugin manifest definition

### Secondary (MEDIUM confidence)
- `mcp-server/src/__tests__/plugin-loader.test.ts` -- Test patterns for plugin loading
- `mcp-server/src/tools/write-tools.test.ts` -- Test patterns for handler testing with in-memory DB

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies already installed and in use, verified versions
- Architecture: HIGH - DB table schema verified, sync function code read, handler code read and tested
- Pitfalls: HIGH - based on direct code analysis of both processes sharing SQLite
- Discovery mechanism: HIGH - DB table and Rust write path fully verified
- Dispatch mechanism: MEDIUM - dual dispatch pattern is sound but user plugin fallback path has the open question about handler metadata not being in the DB

**Research date:** 2026-04-10
**Valid until:** 2026-04-20 (stable -- no external dependencies, all code local)
