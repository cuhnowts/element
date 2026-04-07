---
phase: 44-mcp-server-wiki-tools
plan: 02
subsystem: mcp-server
tags: [mcp, plugin-integration, dynamic-import, esbuild]

requires:
  - phase: 44-mcp-server-wiki-tools
    provides: plugin-loader.ts and wiki-tools.ts modules from plan 01

provides:
  - Plugin tools merged into MCP ListTools alongside 23 hardcoded tools
  - Dynamic import() dispatch in CallTools for plugin tool routing
  - Namespace collision prevention verified by tests

affects: [mcp-server-runtime, plugin-system]

tech-stack:
  added: []
  patterns: [dynamic import for plugin dispatch, variable-path import for esbuild safety]

key-files:
  created: []
  modified:
    - mcp-server/src/index.ts
    - mcp-server/src/__tests__/tool-registry.test.ts

key-decisions:
  - "Plugin tools appended to ListTools array via spread, not interleaved with hardcoded tools"
  - "Dynamic import uses variable path (pluginTool.handlerModule) so esbuild leaves it as runtime import"
  - "Plugin handlers receive (dbPath, args) not (db, dbPath, args) since wiki handlers are filesystem-only"

patterns-established:
  - "Plugin dispatch pattern: find in pluginTools array, dynamic import module, call exported function"
  - "Namespace safety: hardcoded tools never contain colons, plugin tools always do"
---

# Summary: Wire Plugin Tools into MCP Server

Integrated plugin loader and wiki tool handlers into the MCP server entry point, completing the end-to-end flow for MCP-01 (wiki_query) and MCP-02 (wiki_ingest).

## What Was Built

- **index.ts modifications**: Added `loadPluginTools()` call at startup to scan plugins directory adjacent to database. Plugin tools merged into ListTools response via spread operator. Default case in CallTools switch statement now tries plugin dispatch before returning "unknown tool" error. Dynamic `import()` with variable path ensures esbuild preserves it in the bundle.

- **tool-registry.test.ts**: Added 2 namespace safety tests confirming no hardcoded tool name contains a colon and plugin tools would use colon-separated names. Existing 23-tool count assertion unchanged.

- **Build verification**: `node build.ts` succeeds, `dist/index.js` contains exactly 1 dynamic `import()` call (preserved, not bundled away).

## Decisions Made

- Used spread operator to append plugin tools at the end of the tools array rather than creating a separate list merge, keeping the change minimal.
- Plugin handlers receive `(dbPath, args)` not `(db, dbPath, args)` because wiki handlers only need filesystem access.

## Deviations from Plan

None -- followed plan as specified.

## Issues Encountered

None.

---
*Phase: 44-mcp-server-wiki-tools*
*Plan: 02*
*Completed: 2026-04-06*
