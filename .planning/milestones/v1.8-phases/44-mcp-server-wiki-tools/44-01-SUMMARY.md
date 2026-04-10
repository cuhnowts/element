---
phase: 44-mcp-server-wiki-tools
plan: 01
subsystem: mcp
tags: [better-sqlite3, mcp, plugin-tools, wiki, dynamic-dispatch]

requires:
  - phase: 42-knowledge-engine-core
    provides: plugin_mcp_tools SQLite table, wiki-tools handlers
provides:
  - DB-based plugin tool discovery (loadPluginToolsFromDb)
  - Dual dispatch for core and user plugin tools (dispatchPluginTool)
  - CORE_HANDLERS map routing core-knowledge tools to wiki-tools.ts
affects: [hub-chat-wiki-integration, knowledge-plugin, mcp-server]

tech-stack:
  added: []
  patterns: [DB-based tool discovery, dual dispatch (core handler map + dynamic import)]

key-files:
  created:
    - mcp-server/src/plugin-tools.ts
    - mcp-server/src/__tests__/plugin-tools.test.ts
  modified:
    - mcp-server/src/index.ts
    - mcp-server/src/__tests__/tool-registry.test.ts

key-decisions:
  - "Core plugins use CORE_HANDLERS map for direct dispatch; user plugins use plugin.json + dynamic import"
  - "Replaced filesystem-based plugin-loader with DB-based plugin-tools reading plugin_mcp_tools table"

patterns-established:
  - "CORE_HANDLERS pattern: static map of prefixedName -> handler for built-in plugin tools"
  - "DB tool discovery: SELECT from plugin_mcp_tools WHERE enabled = 1 at startup"

requirements-completed: [MCP-01, MCP-02]

duration: 3min
completed: 2026-04-10
---

# Phase 44 Plan 01: MCP Server Wiki Tools Summary

**DB-based plugin tool discovery from plugin_mcp_tools table with dual dispatch routing core-knowledge wiki tools to built-in handlers**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-10T18:47:47Z
- **Completed:** 2026-04-10T18:50:53Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified, 2 deleted)

## Accomplishments
- Created plugin-tools.ts with loadPluginToolsFromDb (DB discovery) and dispatchPluginTool (dual dispatch)
- CORE_HANDLERS map routes core-knowledge:wiki_query and core-knowledge:wiki_ingest to wiki-tools.ts handlers
- Wired DB-based plugin loading into index.ts replacing old filesystem plugin-loader
- 11 new tests for plugin-tools, 69 total tests passing across 6 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create plugin-tools.ts with DB discovery + dual dispatch, and plugin-tools.test.ts** - `b4cfbbf` (feat)
2. **Task 2: Wire plugin-tools into index.ts, update tool-registry tests, delete old plugin-loader** - `5c22bad` (feat)

## Files Created/Modified
- `mcp-server/src/plugin-tools.ts` - DB-based tool discovery + dual dispatch (core handler map + dynamic import)
- `mcp-server/src/__tests__/plugin-tools.test.ts` - 11 tests for discovery and dispatch
- `mcp-server/src/index.ts` - Imports plugin-tools, uses DB loading, dispatches via dispatchPluginTool
- `mcp-server/src/__tests__/tool-registry.test.ts` - Updated descriptions, core-knowledge:wiki_query namespace
- `mcp-server/src/plugin-loader.ts` - DELETED (replaced by plugin-tools.ts)
- `mcp-server/src/__tests__/plugin-loader.test.ts` - DELETED (replaced by plugin-tools.test.ts)

## Decisions Made
- Core plugins use CORE_HANDLERS map for direct dispatch (no dynamic import overhead)
- User plugins fall back to plugin.json manifest reading + dynamic import for extensibility
- Replaced filesystem plugin-loader entirely with DB-based plugin-tools

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- better-sqlite3 not installed in worktree node_modules (npm install resolved it)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- MCP server now discovers plugin tools from plugin_mcp_tools SQLite table
- Core plugin tools dispatch to built-in handlers in wiki-tools.ts
- Ready for hub chat integration and additional plugin tool registration

## Self-Check: PASSED

All created files exist. All deleted files confirmed removed. All commit hashes verified.

---
*Phase: 44-mcp-server-wiki-tools*
*Completed: 2026-04-10*
