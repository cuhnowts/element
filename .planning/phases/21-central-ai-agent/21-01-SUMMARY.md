---
phase: 21-central-ai-agent
plan: 01
subsystem: ai-agent
tags: [mcp, model-context-protocol, better-sqlite3, esbuild, stdio-transport, file-queue]

# Dependency graph
requires: []
provides:
  - MCP server sub-project with 10 tools over stdio transport
  - Read-only SQLite access to element.db with WAL mode
  - File-based agent-queue for approvals, notifications, status reports, session spawns
  - Bundled single-file output via esbuild
affects: [21-02, 21-03, 21-04]

# Tech tracking
tech-stack:
  added: ["@modelcontextprotocol/sdk 1.28.0", "better-sqlite3 11.x", "zod 3.x", "esbuild 0.25.x", "tsx 4.x"]
  patterns: ["MCP server sidecar over stdio", "file-based IPC queue for approval flow", "read-only SQLite from Node.js sidecar"]

key-files:
  created:
    - mcp-server/package.json
    - mcp-server/tsconfig.json
    - mcp-server/build.ts
    - mcp-server/src/index.ts
    - mcp-server/src/db.ts
    - mcp-server/src/tools/project-tools.ts
    - mcp-server/src/tools/phase-tools.ts
    - mcp-server/src/tools/task-tools.ts
    - mcp-server/src/tools/orchestration-tools.ts
  modified: []

key-decisions:
  - "File-based queue in agent-queue/ directory for approval flow IPC between MCP sidecar and frontend"
  - "better-sqlite3 marked external in esbuild since native addons cannot be bundled"
  - "Task completion status uses 'complete' matching Rust TaskStatus enum"

patterns-established:
  - "MCP tool handlers accept (db, args) for read tools and (db, dbPath, args) for orchestration tools that need filesystem access"
  - "Queue files use generateId(prefix) producing prefix-timestamp-random4chars format"
  - "All orchestration tools create subdirectories on first use with mkdirSync recursive"

requirements-completed: [AGENT-02, AGENT-05, AGENT-06]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 21 Plan 01: MCP Server Summary

**MCP server sidecar with 10 tools (5 read, 5 orchestration) over stdio transport, reading element.db read-only with WAL mode and file-based agent-queue for approval/notification flow**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T10:58:09Z
- **Completed:** 2026-03-30T11:01:07Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Standalone MCP server sub-project at mcp-server/ with all dependencies installed
- 5 read tools querying projects, phases, and tasks from SQLite with correct schema
- 5 orchestration tools writing to file-based agent-queue for approvals, notifications, status, and session spawning
- esbuild bundles to single dist/index.js file for sidecar deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MCP server sub-project with package.json, tsconfig, and esbuild script** - `6825c76` (feat)
2. **Task 2: Implement MCP server with all read tools and orchestration tools** - `7a631c4` (feat)

## Files Created/Modified
- `mcp-server/package.json` - Sub-project with MCP SDK, better-sqlite3, zod dependencies
- `mcp-server/tsconfig.json` - ESNext module, bundler resolution, strict mode
- `mcp-server/build.ts` - esbuild script bundling to dist/index.js with better-sqlite3 external
- `mcp-server/src/index.ts` - MCP server entry point with 10 tool registrations and dispatch
- `mcp-server/src/db.ts` - Read-only SQLite connection with WAL and busy_timeout
- `mcp-server/src/tools/project-tools.ts` - list_projects, get_project_detail handlers
- `mcp-server/src/tools/phase-tools.ts` - list_phases, get_phase_status handlers
- `mcp-server/src/tools/task-tools.ts` - list_tasks handler with optional phase filter
- `mcp-server/src/tools/orchestration-tools.ts` - request_approval, check_approval_status, send_notification, report_status, spawn_project_session handlers

## Decisions Made
- File-based queue approach for approval flow IPC (option a from research) -- simple, debuggable, no network stack
- better-sqlite3 marked as external in esbuild bundle since native addons cannot be bundled
- Task completion status uses 'complete' (matching Rust TaskStatus enum) not 'done' as plan initially suggested
- Explicit Database type annotation needed for TypeScript export compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript export type error for db instance**
- **Found during:** Task 2 (MCP server implementation)
- **Issue:** TypeScript TS4023 error -- exported variable 'db' uses name from external module but cannot be named
- **Fix:** Added explicit `Database` type import and annotation: `const db: DatabaseType = new Database(...)`
- **Files modified:** mcp-server/src/db.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 7a631c4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type annotation fix for TypeScript compatibility. No scope creep.

## Issues Encountered
- element.db does not exist in the worktree (runtime artifact) so live integration test was not possible. Server startup verified via error handling path (exits with helpful message when no DB path given).

## Known Stubs
None -- all tools are fully implemented with real SQLite queries and file I/O.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MCP server ready for integration with Tauri sidecar management (Phase 21 Plan 02)
- Agent CLI launch can reference built dist/index.js
- Frontend can watch agent-queue/ directories for approval requests and notifications

## Self-Check: PASSED

All 10 files verified present. Both commit hashes (6825c76, 7a631c4) confirmed in git log.

---
*Phase: 21-central-ai-agent*
*Completed: 2026-03-30*
