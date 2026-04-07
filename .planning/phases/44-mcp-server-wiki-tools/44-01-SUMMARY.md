---
phase: 44-mcp-server-wiki-tools
plan: 01
subsystem: mcp-server
tags: [mcp, plugin-loader, wiki, knowledge]

requires:
  - phase: 42-knowledge-engine-core
    provides: .knowledge/ directory structure and index.md format

provides:
  - Plugin loader that reads plugin.json manifests and extracts namespace-prefixed MCP tool definitions
  - wiki_query handler for read-only knowledge retrieval from .knowledge/
  - wiki_ingest handler for queueing ingest operations via agent-queue/operations/

affects: [44-02-mcp-server-wiki-tools, mcp-server-index]

tech-stack:
  added: []
  patterns: [namespace-prefixed plugin tools with colon separator, filesystem-only MCP handlers]

key-files:
  created:
    - mcp-server/src/plugin-loader.ts
    - mcp-server/src/tools/wiki-tools.ts
    - mcp-server/src/__tests__/plugin-loader.test.ts
    - mcp-server/src/__tests__/wiki-tools.test.ts
  modified: []

key-decisions:
  - "Wiki tool handlers take (dbPath, args) not (db, dbPath, args) -- they only use filesystem, not SQLite"
  - "Plugin tool names use colon separator (pluginName:toolName) to prevent collision with hardcoded tools"
  - "Handler string format is 'file.js#functionName' split on # to resolve module and export name"

patterns-established:
  - "Plugin manifest format: plugin.json with mcp_tools array containing name, description, input_schema, handler"
  - "Filesystem-only handlers: derive paths from dirname(dbPath) instead of requiring db instance"
---

# Summary: Plugin Loader and Wiki Tool Handlers

Plugin loader reads plugin.json manifests from a plugins directory, extracts MCP tool definitions with namespace-prefixed names (e.g., "knowledge:wiki_query"), and resolves handler module paths. Wiki tool handlers provide read-only knowledge retrieval (wiki_query) and ingest queueing (wiki_ingest) using only filesystem operations.

## What Was Built

- **plugin-loader.ts**: `loadPluginTools(pluginsDir)` scans plugin directories for `plugin.json` manifests, extracts `mcp_tools` entries, prefixes tool names with `${manifest.name}:`, splits handler strings on `#` into module path and function name. Returns `PluginMcpTool[]` with all metadata needed for dynamic dispatch.

- **wiki-tools.ts**: Two handler functions:
  - `handleWikiQuery(dbPath, { query })` -- reads `.knowledge/index.md`, matches entries case-insensitively, returns full article content with file paths. Returns specific error when `.knowledge/` missing, no-match message when no results.
  - `handleWikiIngest(dbPath, { filePath })` -- validates file existence and readability synchronously, writes operation JSON to `agent-queue/operations/` with `wiki-ingest-` prefixed ID. Returns acknowledgment with operation ID.

- **19 tests total** (9 plugin-loader + 10 wiki-tools) covering all edge cases, error paths, and happy paths.

## Decisions Made

- Wiki handlers use `(dbPath, args)` signature instead of `(db, dbPath, args)` because they interact only with the filesystem, not SQLite. This is a deliberate deviation from most existing handlers.
- Plugin tool names contain a colon separator to guarantee no collision with hardcoded MCP tool names (which never contain colons).

## Deviations from Plan

None -- followed plan as specified.

## Issues Encountered

None.

## Next Phase Readiness

Plan 44-02 can now wire these modules into `mcp-server/src/index.ts` for end-to-end ListTools/CallTools integration.

---
*Phase: 44-mcp-server-wiki-tools*
*Plan: 01*
*Completed: 2026-04-06*
