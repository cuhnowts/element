---
phase: 21-central-ai-agent
plan: 03
subsystem: agent
tags: [react-hooks, zustand, mcp, tauri, lifecycle, backoff, tdd]

# Dependency graph
requires:
  - phase: 21-02
    provides: AgentStore with status, restartCount, entries state management
provides:
  - useAgentLifecycle hook with auto-start, crash detection, exponential backoff restart
  - useAgentMcp hook with MCP config JSON and system prompt file generation
  - Behavioral tests covering all lifecycle state transitions
affects: [21-04, 21-05, 21-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Agent lifecycle hook using useState for command/args (reactive for terminal consumption)"
    - "MCP config generation via Tauri invoke plugin:fs commands"
    - "Exponential backoff with BACKOFF_MS array and MAX_RETRIES constant"

key-files:
  created:
    - src/hooks/useAgentLifecycle.ts
    - src/hooks/useAgentMcp.ts
    - src/hooks/__tests__/useAgentLifecycle.test.ts
  modified: []

key-decisions:
  - "Used invoke('plugin:fs|write_text_file') instead of @tauri-apps/plugin-fs package (not installed); consistent with existing invoke pattern"
  - "Used useState for agentCommand/agentArgs instead of refs to trigger re-renders for terminal consumption"
  - "resolveResource for MCP server path enables both dev and production resolution"

patterns-established:
  - "Agent lifecycle hooks use useAgentStore.getState() for reading restart count in callbacks"
  - "MCP config written to appDataDir/agent/ directory with mkdir recursive"

requirements-completed: [AGENT-01, AGENT-04]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 21 Plan 03: Agent Lifecycle & MCP Config Hooks Summary

**Agent lifecycle hooks with auto-start, 2s/4s/8s exponential backoff restart, and MCP config file generation for CLI tool integration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T11:05:30Z
- **Completed:** 2026-03-30T11:09:23Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments
- useAgentLifecycle hook implements auto-start, CLI validation, crash detection, and exponential backoff (2s/4s/8s, max 3 retries)
- useAgentMcp hook generates MCP config JSON (mcpServers.element pointing to mcp-server/dist/index.js) and agent system prompt file
- 8 behavioral tests covering all state transitions: no CLI, invalid CLI, valid CLI, exit code 0, non-zero exit, max retries, and manual restart

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests** - `0916c91` (test)
2. **Task 1 GREEN: Passing implementation** - `be7e3cf` (feat)

_TDD task: RED committed first, then GREEN with implementation._

## Files Created/Modified
- `src/hooks/useAgentLifecycle.ts` - Agent process lifecycle: start, restart, crash handling with backoff
- `src/hooks/useAgentMcp.ts` - MCP config JSON and system prompt file generation
- `src/hooks/__tests__/useAgentLifecycle.test.ts` - 8 behavioral tests for lifecycle and MCP config

## Decisions Made
- Used `invoke('plugin:fs|write_text_file')` instead of `@tauri-apps/plugin-fs` package since the package is not installed and invoke is the established pattern
- Used `useState` for `agentCommand`/`agentArgs` instead of refs so the values trigger re-renders and are accessible to the terminal component
- Used `resolveResource` from `@tauri-apps/api/path` for MCP server bundle path resolution (works in both dev and production)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched from @tauri-apps/plugin-fs to invoke for file operations**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** `@tauri-apps/plugin-fs` package not installed; import resolution fails in both source and tests
- **Fix:** Used `invoke("plugin:fs|write_text_file")` and `invoke("plugin:fs|mkdir")` which route through Tauri's plugin system via the already-mocked `invoke` function
- **Files modified:** src/hooks/useAgentMcp.ts, src/hooks/__tests__/useAgentLifecycle.test.ts
- **Verification:** All 8 tests pass, TypeScript compiles clean
- **Committed in:** be7e3cf (Task 1 GREEN commit)

**2. [Rule 1 - Bug] Changed refs to state for agentCommand/agentArgs**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Ref values captured at render time returned null even after startAgent updated them; tests failed because renderHook snapshot didn't reflect ref mutations
- **Fix:** Replaced `useRef` with `useState` for `agentCommand` and `agentArgs` so updates trigger re-render and are visible to consumers
- **Files modified:** src/hooks/useAgentLifecycle.ts
- **Verification:** Test "sets status to running and exposes agentCommand/agentArgs" passes
- **Committed in:** be7e3cf (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Known Stubs
None - all hooks are fully wired with real Tauri API calls (mocked in tests).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Lifecycle and MCP hooks ready for AgentTerminalTab (Plan 04/05) to consume
- `agentCommand`/`agentArgs` exposed as reactive state for terminal spawning
- `handleAgentExit` ready to be wired to PTY onExit callback

## Self-Check: PASSED

- All 3 created files verified on disk
- Both commit hashes (0916c91, be7e3cf) found in git log

---
*Phase: 21-central-ai-agent*
*Completed: 2026-03-30*
