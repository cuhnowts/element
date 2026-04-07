# Phase 44: MCP Server Wiki Tools - Research

**Researched:** 2026-04-06
**Domain:** MCP server dynamic tool registration + wiki tool handlers
**Confidence:** HIGH

## Summary

Phase 44 adds two MCP tools (`wiki_query` and `wiki_ingest`) to the existing MCP server and introduces a dynamic tool registration mechanism that reads plugin-contributed tools from manifests rather than hardcoding them. The MCP server is a standalone Node.js process (TypeScript, ESM, esbuild-bundled) using `@modelcontextprotocol/sdk` v1.28.0 over stdio transport, with 23 existing hardcoded tools following a consistent handler pattern.

The critical architectural challenge is that the build system uses esbuild to bundle everything into a single `dist/index.js` file with `better-sqlite3` as the only external. Dynamic imports of plugin handler code from arbitrary filesystem paths at runtime must work correctly with this bundled output -- esbuild's `import()` calls on non-literal paths will be left as-is (not bundled), which is actually the desired behavior here since plugin handlers live outside the bundle.

The Phase 41 CONTEXT.md establishes that plugin MCP tools are registered via a DB-backed registry (D-11) and dispatched through the agent queue (D-13). Phase 44's CONTEXT.md refines this: handler code lives in the plugin directory, MCP server dynamically imports it based on the manifest's declared path (D-03). These two decisions need reconciliation -- the DB registry approach from Phase 41 and the manifest-based approach from Phase 44. The Phase 44 decisions (being more specific to this phase) should take precedence: read manifests at startup for tool definitions, use dynamic import for handler dispatch.

**Primary recommendation:** Implement a plugin tool loader that reads plugin manifests from a convention-based path at startup, merges their `mcp_tools` declarations into the ListTools response alongside hardcoded tools, and dispatches calls to plugin tools via dynamic import of the handler module declared in the manifest. Keep existing hardcoded tools completely untouched.

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
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MCP-01 | External agents can query the wiki through MCP server tools (read-only) | `wiki_query` tool handler reads `.knowledge/index.md` + wiki article files, returns full article content with file paths. Uses existing MCP response pattern `{ content: [{ type: "text", text: ... }] }` |
| MCP-02 | External agents can trigger wiki ingest through MCP server via the agent queue | `wiki_ingest` tool handler validates file path, writes operation JSON to agent queue directory (same pattern as `orchestration-tools.ts`), returns acknowledgment with operation ID |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.28.0 | MCP protocol server | Already installed and configured |
| better-sqlite3 | ^11.0.0 | SQLite database access | Already installed, used by existing tools |
| vitest | ^3.0.0 | Test framework | Already configured in mcp-server/ |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs | built-in | File system access for wiki articles and queue | Reading index.md, articles, writing queue items |
| node:path | built-in | Path manipulation and validation | Resolving plugin paths, validating ingest file paths |

### Alternatives Considered
None -- zero new dependencies per v1.8 decision. All functionality uses Node.js built-ins and already-installed packages.

## Architecture Patterns

### Recommended Project Structure
```
mcp-server/src/
  index.ts             # Entry point -- merge plugin tools into ListTools/CallTools
  db.ts                # Database connection (unchanged)
  plugin-loader.ts     # NEW: reads plugin manifests, returns tool definitions + handler paths
  tools/               # Existing hardcoded tool handlers (unchanged)
    project-tools.ts
    phase-tools.ts
    task-tools.ts
    orchestration-tools.ts
    write-tools.ts
    calendar-tools.ts
  __tests__/
    plugin-loader.test.ts  # NEW: tests for manifest loading + dynamic dispatch
    wiki-tools.test.ts     # NEW: tests for wiki_query and wiki_ingest handlers
```

Plugin handler code (outside mcp-server):
```
plugins/knowledge/
  mcp-handlers.ts      # NEW: wiki_query + wiki_ingest handler implementations
```

### Pattern 1: Dynamic Tool Registration at Startup

**What:** A plugin loader module that scans for plugin manifests at startup and extracts MCP tool definitions.

**When to use:** Always -- runs once at server initialization.

**Example:**
```typescript
// plugin-loader.ts
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

interface PluginMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handlerModule: string;  // Absolute path to handler module
  handlerFunction: string; // Export name in that module
}

interface PluginManifest {
  name: string;
  mcp_tools?: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
    handler: string;  // e.g., "mcp-handlers.ts#handleWikiQuery"
  }>;
}

export function loadPluginTools(pluginsDir: string): PluginMcpTool[] {
  const tools: PluginMcpTool[] = [];
  if (!existsSync(pluginsDir)) return tools;

  // Read each plugin directory for plugin.json
  for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(pluginsDir, entry.name, "plugin.json");
    if (!existsSync(manifestPath)) continue;

    const manifest: PluginManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    for (const tool of manifest.mcp_tools ?? []) {
      const [file, fn] = tool.handler.split("#");
      tools.push({
        name: `${manifest.name}:${tool.name}`,  // Namespace prefixed per D-12
        description: tool.description,
        inputSchema: tool.input_schema,
        handlerModule: resolve(pluginsDir, entry.name, file),
        handlerFunction: fn,
      });
    }
  }
  return tools;
}
```

### Pattern 2: Hybrid Static/Dynamic Tool Dispatch

**What:** The CallTool handler checks the switch-case for hardcoded tools first, then falls through to dynamic dispatch for plugin tools.

**When to use:** In the CallTool request handler in index.ts.

**Example:**
```typescript
// In CallToolRequestSchema handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Try hardcoded tools first (existing switch-case, unchanged)
  const hardcodedResult = dispatchHardcodedTool(name, args);
  if (hardcodedResult !== null) return hardcodedResult;

  // Try plugin tools
  const pluginTool = pluginTools.find(t => t.name === name);
  if (pluginTool) {
    const mod = await import(pluginTool.handlerModule);
    const handler = mod[pluginTool.handlerFunction];
    return handler(db, dbPath, args);
  }

  return {
    content: [{ type: "text" as const, text: `Error: Unknown tool "${name}"` }],
    isError: true,
  };
});
```

### Pattern 3: Agent Queue File-Based Communication

**What:** MCP server writes JSON operation files to the agent queue directory. The Tauri app watches/polls this directory.

**When to use:** For `wiki_ingest` -- same pattern already used by `handleRequestApproval` and `handleSendNotification`.

**Example:**
```typescript
// wiki_ingest handler writes to agent-queue/operations/
const operationId = generateId("wiki-ingest");
const payload = {
  id: operationId,
  type: "wiki_ingest",
  filePath: args.filePath,
  status: "accepted",
  createdAt: new Date().toISOString(),
};
writeFileSync(
  join(queueDir, "operations", `${operationId}.json`),
  JSON.stringify(payload, null, 2)
);
return {
  content: [{ type: "text" as const, text: JSON.stringify({ operationId, status: "accepted" }) }],
};
```

### Pattern 4: Wiki Query via Index Scan

**What:** Read `.knowledge/index.md`, find matching entries by keyword/topic, then read and return the full articles.

**When to use:** For `wiki_query` handler.

**Example:**
```typescript
// wiki_query handler reads index.md then returns matching articles
const knowledgeDir = resolveKnowledgeDir();  // e.g., app_data_dir/.knowledge
const indexPath = join(knowledgeDir, "index.md");

if (!existsSync(knowledgeDir)) {
  return {
    content: [{ type: "text" as const, text: "Wiki not initialized. Enable the knowledge plugin first." }],
    isError: true,
  };
}

const indexContent = readFileSync(indexPath, "utf-8");
const matchingPaths = findMatchingArticles(indexContent, args.query);

if (matchingPaths.length === 0) {
  return {
    content: [{ type: "text" as const, text: "No wiki articles matched your query" }],
  };
}

const articles = matchingPaths.map(p => ({
  path: p,
  content: readFileSync(join(knowledgeDir, "wiki", p), "utf-8"),
}));

return {
  content: [{ type: "text" as const, text: JSON.stringify(articles, null, 2) }],
};
```

### Anti-Patterns to Avoid
- **Modifying existing hardcoded tools or their registration:** Decision D-02 explicitly says no migration. The switch-case stays as-is.
- **Bundling plugin handler code into the MCP server build:** Plugin handlers must be dynamically imported at runtime from plugin directories, not bundled by esbuild. This is essential for the plugin architecture.
- **LLM-synthesizing query results:** Decision D-04 says return raw article content. The external agent (Claude Code) does its own reasoning over the content.
- **Inline content for ingest:** Decision D-08 says file path only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol handling | Custom stdio protocol parser | @modelcontextprotocol/sdk Server class | Already working, handles all protocol details |
| File-based IPC queue | Custom socket/IPC mechanism | File-based agent-queue pattern (already used by approvals, notifications) | Proven pattern in this codebase, matches Phase 42 operation queue |
| JSON Schema validation | Manual input validation | Zod (already installed) or trust MCP SDK validation | MCP SDK validates against inputSchema before calling handler |
| UUID/ID generation | uuid library | Existing `generateId()` in orchestration-tools.ts | Already used for approval IDs, notifications |

**Key insight:** The MCP server already has all the infrastructure patterns needed. This phase is about adding a plugin loader layer and two handler functions, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: esbuild Bundling Breaks Dynamic Imports
**What goes wrong:** esbuild may try to resolve or bundle dynamic `import()` calls, failing because plugin handler paths don't exist at build time.
**Why it happens:** esbuild normally resolves all imports. Dynamic imports with string literals get bundled; dynamic imports with variables are left as-is.
**How to avoid:** Use a variable (not a string literal) for the import path: `const mod = await import(pluginTool.handlerModule)`. esbuild leaves variable-path dynamic imports as runtime imports. Verify the built output contains the dynamic import intact.
**Warning signs:** Build errors about missing modules, or runtime "module not found" after bundling.

### Pitfall 2: Plugin Handler Module Not Compiled
**What goes wrong:** Plugin handler is written in TypeScript (`.ts`) but Node.js can't import `.ts` files directly at runtime.
**Why it happens:** The MCP server runs the bundled JS output (`dist/index.js`), not through tsx. Dynamic imports at runtime go through Node's native module loader, not tsx.
**How to avoid:** Either (a) compile plugin handlers to JS as part of their plugin's build step, or (b) use tsx as the runtime for the MCP server in production (it currently uses tsx for dev only). The simplest approach: plugin handler files should be `.js` (or compiled to `.js`), or the build step should also compile plugin handlers.
**Warning signs:** "Unknown file extension .ts" errors at runtime.

### Pitfall 3: Knowledge Directory Location Unknown at MCP Server Level
**What goes wrong:** MCP server doesn't know where `.knowledge/` lives because it's determined by the plugin system (global scope = app_data_dir, per Phase 41 D-05).
**Why it happens:** MCP server only receives `dbPath` (the SQLite database path). The `.knowledge/` directory could be anywhere.
**How to avoid:** Use a convention: `.knowledge/` lives adjacent to the database file (same parent directory as `element.db`), or the plugin manifest declares the knowledge directory path, or a config/env var provides it. The simplest convention: `join(dirname(dbPath), ".knowledge")`.
**Warning signs:** "No such file or directory" errors when trying to read wiki content.

### Pitfall 4: Namespace Collision Between Hardcoded and Plugin Tools
**What goes wrong:** A plugin declares a tool name that collides with an existing hardcoded tool name.
**Why it happens:** Plugin tools use `plugin_name:tool_name` prefix (D-12), but if someone creates a plugin with a colon-less name matching a hardcoded tool, dispatch breaks.
**How to avoid:** Enforce that all plugin-contributed tool names contain a colon (the namespace separator). Hardcoded tools never have colons, so collision is structurally impossible.
**Warning signs:** Wrong handler called for a tool name.

### Pitfall 5: Index.md Matching is Fragile
**What goes wrong:** Simple keyword matching against `index.md` returns too many or too few results.
**Why it happens:** The matching algorithm is a design choice with no single right answer. Too aggressive = noise; too conservative = misses.
**How to avoid:** Start with simple case-insensitive substring matching against index entry titles/descriptions. Return all matches -- external agents can handle multiple results. This is Phase 44's "Claude's discretion" area; keep it simple and iterate.
**Warning signs:** Agents complaining about irrelevant results or missing expected articles.

## Code Examples

### Existing Handler Response Pattern (from project-tools.ts)
```typescript
// Success response
return {
  content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
};

// Error response
return {
  content: [
    { type: "text" as const, text: `Error: Project not found with id "${args.projectId}"` },
  ],
  isError: true,
};
```

### Existing Queue Write Pattern (from orchestration-tools.ts)
```typescript
function getQueueDir(dbPath: string): string {
  return join(dirname(dbPath), "agent-queue");
}

function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${timestamp}-${random}`;
}

// Write to queue
const queueDir = getQueueDir(dbPath);
const operationsDir = join(queueDir, "operations");
ensureDir(operationsDir);
const id = generateId("wiki-ingest");
writeFileSync(
  join(operationsDir, `${id}.json`),
  JSON.stringify(payload, null, 2)
);
```

### Existing Test Pattern (from calendar-tools.test.ts)
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";

let db: InstanceType<typeof Database>;

beforeEach(() => {
  db = new Database(":memory:");
  // Create tables, seed data
});

afterEach(() => {
  db.close();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded tool arrays | Hardcoded + dynamic merge | This phase | New tools can come from plugin manifests |
| Switch-case dispatch only | Switch-case + dynamic import fallback | This phase | Plugin tools dispatched without modifying index.ts switch |

**Note:** MCP SDK 1.28.0 is current (verified from installed package). No breaking changes expected.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.0.0 |
| Config file | `mcp-server/vitest.config.ts` |
| Quick run command | `cd mcp-server && npx vitest run --reporter=verbose` |
| Full suite command | `cd mcp-server && npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCP-01 | wiki_query returns matching wiki articles with file paths | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | Wave 0 |
| MCP-01 | wiki_query returns "No wiki articles matched" for no matches | unit | same file | Wave 0 |
| MCP-01 | wiki_query returns error when .knowledge/ missing | unit | same file | Wave 0 |
| MCP-02 | wiki_ingest validates file path and queues operation | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | Wave 0 |
| MCP-02 | wiki_ingest returns error for bad file path | unit | same file | Wave 0 |
| MCP-02 | wiki_ingest returns acknowledgment with operation ID | unit | same file | Wave 0 |
| SC-3 | Plugin tools loaded from manifest at startup | unit | `cd mcp-server && npx vitest run src/__tests__/plugin-loader.test.ts -x` | Wave 0 |
| SC-3 | Plugin tools appear in ListTools alongside hardcoded tools | unit | same file | Wave 0 |
| SC-3 | Plugin tool dispatch routes to correct handler | unit | same file | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd mcp-server && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd mcp-server && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `mcp-server/src/__tests__/wiki-tools.test.ts` -- covers MCP-01, MCP-02
- [ ] `mcp-server/src/__tests__/plugin-loader.test.ts` -- covers SC-3 (dynamic registration)
- [ ] Update `tool-registry.test.ts` -- currently expects exactly 23 tools; needs update for dynamic tools

## Open Questions

1. **Plugin handler compilation strategy**
   - What we know: MCP server runs bundled JS via esbuild. Plugin handlers written in TS need compilation.
   - What's unclear: Will Phase 41/42 establish a plugin build step, or should the MCP server handle raw TS?
   - Recommendation: Assume plugin handlers are `.js` files (pre-compiled) or use dynamic import with a `.js` extension. If Phase 42 establishes a TypeScript plugin convention, adjust. The esbuild build step could be extended to also compile plugin handlers to a known output location.

2. **Knowledge directory location convention**
   - What we know: Phase 41 says global scope goes in `app_data_dir`. MCP server gets `dbPath` on startup.
   - What's unclear: Whether `.knowledge/` will be co-located with the DB or in a separate app data location.
   - Recommendation: Default to `join(dirname(dbPath), ".knowledge")`. This is the simplest convention and matches how the agent-queue directory is already resolved relative to dbPath. If Phase 42 uses a different location, the path can be made configurable.

3. **Plugin manifest `mcp_tools` schema**
   - What we know: Current manifest has `step_types` with `id`, `name`, `description`, `input_schema`, `output_schema`. Phase 41 will add `mcp_tools`.
   - What's unclear: Exact schema for `mcp_tools` entries -- will Phase 41 define this before Phase 44 executes?
   - Recommendation: Define a minimal schema in Phase 44 if Phase 41 hasn't landed yet: `{ name, description, input_schema, handler }` where handler is `"filename#functionName"`. Align with Phase 41's pattern when it ships.

## Sources

### Primary (HIGH confidence)
- `mcp-server/src/index.ts` -- Full MCP server source with 23 hardcoded tools, ListTools/CallTools handlers
- `mcp-server/src/tools/orchestration-tools.ts` -- Agent queue file-write pattern (approvals, notifications)
- `mcp-server/package.json` -- @modelcontextprotocol/sdk v1.28.0, better-sqlite3, vitest
- `mcp-server/build.ts` -- esbuild bundling config (single entry, esm, external: better-sqlite3)
- `src-tauri/src/plugins/manifest.rs` -- Current plugin manifest structure (PluginManifest, StepTypeDefinition)
- `.planning/phases/41-plugin-infrastructure-evolution/41-CONTEXT.md` -- D-11 (DB-backed registry), D-12 (namespace prefixing), D-13 (agent queue dispatch)
- `.planning/phases/44-mcp-server-wiki-tools/44-CONTEXT.md` -- All 11 locked decisions for this phase

### Secondary (MEDIUM confidence)
- esbuild dynamic import behavior -- variable-path dynamic imports are preserved at runtime (verified from esbuild docs knowledge)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and in use
- Architecture: HIGH - extends proven patterns (agent queue, handler modules, tool registration)
- Pitfalls: HIGH - esbuild bundling and TS compilation are verified concerns based on build.ts analysis

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- no external dependency changes expected)
