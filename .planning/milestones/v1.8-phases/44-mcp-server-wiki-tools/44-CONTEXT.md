# Phase 44: MCP Server Wiki Tools - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

External agents (Claude Code) can query the wiki for read-only knowledge retrieval and trigger ingest operations through the MCP server. Two new MCP tools: `wiki_query` and `wiki_ingest`. Tools are registered dynamically from the knowledge plugin's manifest, not hardcoded.

</domain>

<decisions>
## Implementation Decisions

### Dynamic Tool Registration
- **D-01:** Plugin-contributed MCP tools are loaded by reading plugin manifests at startup. MCP server restart required for changes.
- **D-02:** Existing hardcoded tools stay as-is. Only plugin-contributed tools (like wiki) come from manifests. No migration of existing tools.
- **D-03:** *(Revised 2026-04-10 after Phase 42 rework)* For core plugins (no plugin.json on disk), handlers live in `mcp-server/src/tools/` and are registered in a built-in CORE_HANDLERS map. For user plugins, handlers live in the plugin directory and are dynamically imported based on the manifest's handler path.

### Query Response Shape
- **D-04:** `wiki_query` scans `index.md` for relevant entries, then returns the full wiki articles for matches. Wiki articles ARE the summaries (compiled from raw sources) -- they are returned in full, not truncated or re-summarized.
- **D-05:** Each returned article includes its file path for reference.
- **D-06:** When no articles match, return a specific text message ("No wiki articles matched your query") rather than an empty array.

### Ingest Flow & Acknowledgment
- **D-07:** `wiki_ingest` is fire-and-forget. Tool accepts the request, queues it via the agent queue (Phase 42), and returns an immediate acknowledgment with operation ID + "accepted" status.
- **D-08:** Agent provides a file path to the raw source document (not inline content). Wiki engine reads the file from disk.
- **D-09:** File path is validated before queuing -- return synchronous error for bad/unreadable paths.

### Error Handling
- **D-10:** When wiki doesn't exist (no `.knowledge/` directory), return a clear MCP error: "Wiki not initialized. Enable the knowledge plugin first."
- **D-11:** `wiki_ingest` validates the file path exists and is readable BEFORE queuing. Returns synchronous error for bad paths so the agent knows immediately.

### Claude's Discretion
- MCP tool input schema design (parameter names, types, descriptions)
- Exact format of the acknowledgment response for `wiki_ingest`
- How to discover plugin manifest locations at startup (convention-based path vs config)
- Internal structure of the dynamic tool router alongside hardcoded tools

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### MCP Server
- `mcp-server/src/index.ts` -- Current MCP server entry point with hardcoded tool registration and dispatch
- `mcp-server/src/tools/` -- Existing tool handler modules (pattern reference for new wiki tools)
- `mcp-server/src/db.ts` -- Database connection used by existing tools

### Requirements
- `.planning/REQUIREMENTS.md` -- MCP-01 (read-only query), MCP-02 (queue-based ingest)

### Dependent Phases
- `.planning/ROADMAP.md` Phase 41 -- Plugin manifest extensions (skills, mcp_tools, owned_directories)
- `.planning/ROADMAP.md` Phase 42 -- Knowledge engine core (wiki operations, operation queue, .knowledge/ structure)

No external specs -- requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@modelcontextprotocol/sdk` -- Already installed and configured in mcp-server/
- `mcp-server/src/db.ts` -- SQLite database connection (may be needed for queue interaction)
- Existing tool handler pattern in `mcp-server/src/tools/*.ts` -- Each exports handler functions taking (db, args) or (db, dbPath, args)

### Established Patterns
- MCP tools are defined as objects with `name`, `description`, `inputSchema` in the ListTools handler
- Tool dispatch is a switch-case in CallTools handler calling imported handler functions
- All handlers return `{ content: [{ type: "text", text: JSON.stringify(...) }] }` format
- Error responses use `isError: true` flag

### Integration Points
- ListToolsRequestSchema handler in `index.ts` -- needs to merge plugin-contributed tools alongside hardcoded ones
- CallToolRequestSchema handler in `index.ts` -- needs dynamic dispatch for plugin tools (not just switch-case)
- Plugin manifest system (Phase 41) -- MCP server reads `mcp_tools` declarations from manifests
- Agent queue (Phase 42) -- `wiki_ingest` submits operations to the queue

</code_context>

<specifics>
## Specific Ideas

- Wiki articles are already summaries (compiled from raw sources) -- return them in full, not truncated or re-summarized
- File path input only for ingest -- keeps MCP payloads small and avoids encoding issues

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 44-mcp-server-wiki-tools*
*Context gathered: 2026-04-06*
