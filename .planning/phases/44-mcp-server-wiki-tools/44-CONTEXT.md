# Phase 44: MCP Server Wiki Tools - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

External agents (Claude Code) can query the wiki for compiled knowledge retrieval and trigger ingest operations through the MCP server. Three tools: `wiki_query`, `wiki_index`, `wiki_ingest`. Wiki tools are registered dynamically from the knowledge plugin's manifest, not hardcoded.

</domain>

<decisions>
## Implementation Decisions

### Query Tool Design
- **D-01:** `wiki_query` accepts a natural language query string. MCP server reads index.md, identifies relevant compiled wiki articles, returns their content. Returns compiled/compacted articles (not raw source documents) — the wiki layer already does LLM summarization from raw sources (Karpathy-style compaction).
- **D-02:** `wiki_query` returns only matching article content — focused and token-efficient. No index bundled in response.
- **D-03:** Separate `wiki_index` tool returns index.md contents so agents can browse the full knowledge map before querying specific topics.

### Ingest Tool Design
- **D-04:** `wiki_ingest` accepts raw text content as a string parameter (not file paths). The wiki engine compiles it into articles.
- **D-05:** Ingest is async — returns immediately with "operation accepted" status. Actual compilation runs through the agent queue (Phase 42 WIKI-05 serialization). Agent doesn't wait for LLM processing.
- **D-06:** `wiki_ingest` requires a `title` parameter — human-readable label for the source (e.g., "React 19 migration notes"). Used for tracking in raw source metadata.

### Dynamic Registration
- **D-07:** MCP server reads plugin manifests at startup to discover `mcp_tools` declarations. Loads tool schemas from manifest, routes calls to appropriate handlers. Existing hardcoded tools stay as-is.
- **D-08:** Only wiki tools use the dynamic registration path in this phase. Migration of existing hardcoded tools to the manifest system is a future concern.
- **D-09:** Dynamic tools execute via direct filesystem access — MCP server reads `.knowledge/` directory directly (already has SQLite access). For ingest, writes to an agent queue table that the Tauri backend picks up.

### Error & Access Model
- **D-10:** Empty wiki or no matches returns success with a clear message (e.g., "No wiki articles found" or "Wiki is empty — ingest documents first"). Not an MCP error.
- **D-11:** No access restrictions on wiki tools — same model as existing MCP tools. If an agent can connect, it can use all tools including wiki.

### Claude's Discretion
- Implementation details of manifest-to-tool-schema parsing
- Internal structure of the dynamic tool router alongside hardcoded tools
- Agent queue table schema for async ingest (coordinate with Phase 42 design)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### MCP Server
- `mcp-server/src/index.ts` — Current tool registration pattern (hardcoded), server setup, stdio transport
- `mcp-server/src/tools/` — Existing tool handler patterns (project, phase, task, calendar, orchestration, write)
- `mcp-server/package.json` — Dependencies including @modelcontextprotocol/sdk ^1.28.0

### Plugin System
- `src-tauri/src/plugins/manifest.rs` — Current plugin manifest struct (Phase 41 will add mcp_tools field)
- `src-tauri/src/plugins/registry.rs` — Plugin registry for runtime state
- `src-tauri/src/commands/plugin_commands.rs` — Plugin Tauri commands

### Requirements
- `.planning/REQUIREMENTS.md` — MCP-01 (read-only query), MCP-02 (queue-based ingest)
- `.planning/ROADMAP.md` — Phase 44 success criteria (3 criteria)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mcp-server/src/db.ts` — SQLite database connection (better-sqlite3), reuse for agent queue table access
- `mcp-server/src/tools/*.ts` — Established handler pattern: export functions that take parsed params and return MCP tool results
- `@modelcontextprotocol/sdk` — Already set up with Server, StdioServerTransport, CallToolRequestSchema

### Established Patterns
- Tool registration: `ListToolsRequestSchema` handler returns tool schemas, `CallToolRequestSchema` handler routes by tool name
- All tool handlers follow `handle{Action}(params)` naming convention
- Tests use vitest with mock DB setup (`__tests__/`)

### Integration Points
- `mcp-server/src/index.ts` — Tool router switch statement needs extension point for dynamic tools
- `.knowledge/` directory — Wiki articles and index.md read by query tools
- Agent queue table in SQLite — Ingest writes here, Tauri backend processes
- Plugin manifest files — Read at startup for mcp_tools declarations

</code_context>

<specifics>
## Specific Ideas

- Wiki compilation follows Karpathy-style approach: raw sources are compacted/summarized by LLM before entering the wiki. Query returns this compiled knowledge, not raw dumps.
- Three-tool surface area: `wiki_index` (browse), `wiki_query` (search), `wiki_ingest` (add) — clean separation of concerns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 44-mcp-server-wiki-tools*
*Context gathered: 2026-04-06*
