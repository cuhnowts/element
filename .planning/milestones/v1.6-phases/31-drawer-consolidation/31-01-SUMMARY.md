---
phase: 31-drawer-consolidation
plan: 01
subsystem: ui
tags: [zustand, react, agent, drawer, keyboard-shortcuts]

# Dependency graph
requires: []
provides:
  - DrawerTab union with "elementai" value
  - Agent store with agentCommand/agentArgs fields (no panelOpen/togglePanel)
  - Lifecycle hook writing command/args to Zustand instead of useState
  - AppLayout-level agent boot via startAgent useEffect
  - Cmd+Shift+A wired to elementai drawer tab toggle
affects: [31-02-drawer-consolidation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand store for agent command/args instead of per-hook useState"
    - "AppLayout-level agent lifecycle boot (not component-specific)"

key-files:
  created: []
  modified:
    - src/stores/useWorkspaceStore.ts
    - src/types/agent.ts
    - src/stores/useAgentStore.ts
    - src/hooks/useAgentLifecycle.ts
    - src/stores/uiSlice.ts
    - src/components/agent/AgentTerminalTab.tsx
    - src/components/layout/AppLayout.tsx
    - src/hooks/useKeyboardShortcuts.ts
    - src/components/agent/AgentToggleButton.tsx
    - src/components/agent/AgentPanelHeader.tsx
    - src/stores/useAgentStore.test.ts
    - src/hooks/__tests__/useAgentLifecycle.test.ts
    - src/components/agent/__tests__/AgentPanel.test.tsx

key-decisions:
  - "Lifted agent command/args from useState to Zustand store for cross-component access"
  - "AgentToggleButton rewired to drawer toggle instead of dead togglePanel"
  - "AppLayout always renders AgentPanel (unconditional) until Plan 02 removes it"

patterns-established:
  - "Agent lifecycle state in Zustand: agentCommand/agentArgs readable by any component via selector"
  - "Keyboard shortcuts use workspace store getState() for conditional drawer toggle"

requirements-completed: [DRAW-01, DRAW-03]

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 31 Plan 01: State Layer and Agent Lifecycle for Drawer Consolidation Summary

**DrawerTab union extended with elementai, agent command/args lifted to Zustand, panelOpen/togglePanel removed, startAgent moved to AppLayout mount, Cmd+Shift+A rewired to drawer**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T11:53:24Z
- **Completed:** 2026-04-05T11:57:48Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Added "elementai" as first value in DrawerTab union type for drawer consolidation
- Lifted agentCommand/agentArgs from per-hook useState to Zustand store, enabling any component to read agent state
- Removed all panelOpen/togglePanel references from codebase (zero grep hits)
- Moved startAgent() boot to AppLayout mount so agent starts regardless of drawer tab visibility
- Rewired Cmd+Shift+A to toggle elementai drawer tab instead of dead sidebar panel

## Task Commits

Each task was committed atomically:

1. **Task 1: Update DrawerTab union, agent types, agent store, lifecycle hook, and consumers** - `019df9f` (feat)
2. **Task 2: Move startAgent to AppLayout, rewire keyboard shortcut** - `b6c6049` (feat)

## Files Created/Modified
- `src/stores/useWorkspaceStore.ts` - DrawerTab union now includes "elementai"
- `src/types/agent.ts` - AgentState without panelOpen/togglePanel, with agentCommand/agentArgs
- `src/stores/useAgentStore.ts` - Store implementation with new fields, old fields removed
- `src/hooks/useAgentLifecycle.ts` - Writes command/args to Zustand store, not useState
- `src/stores/uiSlice.ts` - Dead panelOpen reference removed
- `src/components/agent/AgentTerminalTab.tsx` - Reads from store instead of lifecycle hook
- `src/components/layout/AppLayout.tsx` - startAgent on mount, agentPanelOpen removed
- `src/hooks/useKeyboardShortcuts.ts` - Cmd+Shift+A opens elementai drawer tab
- `src/components/agent/AgentToggleButton.tsx` - Uses drawer toggle instead of togglePanel
- `src/components/agent/AgentPanelHeader.tsx` - Uses drawer toggle instead of togglePanel
- `src/stores/useAgentStore.test.ts` - Updated for new store shape
- `src/hooks/__tests__/useAgentLifecycle.test.ts` - Updated mock store and assertions
- `src/components/agent/__tests__/AgentPanel.test.tsx` - Removed panelOpen from setState

## Decisions Made
- Lifted agent command/args from useState to Zustand store for cross-component access without prop drilling
- AgentToggleButton and AgentPanelHeader rewired to drawer toggle (Rule 3 deviation) since panelOpen/togglePanel were removed from the type
- AppLayout unconditionally renders AgentPanel until Plan 02 removes the component entirely

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed AgentToggleButton, AgentPanelHeader, and AppLayout broken by type removal**
- **Found during:** Task 1 (removing panelOpen/togglePanel from AgentState)
- **Issue:** Plan removed panelOpen/togglePanel from types but didn't account for consumers in AgentToggleButton, AgentPanelHeader, and AppLayout that would break at compile time. These components are scheduled for removal in Plan 02 but need to compile now.
- **Fix:** AgentToggleButton and AgentPanelHeader rewired to use workspace store drawer toggle. AppLayout panelOpen selector removed, AgentPanel rendered unconditionally.
- **Files modified:** src/components/agent/AgentToggleButton.tsx, src/components/agent/AgentPanelHeader.tsx, src/components/layout/AppLayout.tsx, src/components/agent/__tests__/AgentPanel.test.tsx
- **Verification:** All tests pass, zero TS-level panelOpen references remain
- **Committed in:** 019df9f (Task 1 commit)

**2. [Rule 3 - Blocking] Updated test files concurrently with store changes**
- **Found during:** Task 1 (store test failed after removing panelOpen/togglePanel)
- **Issue:** Plan assigned test updates to Task 2 but store tests broke immediately after Task 1 type changes. Tests must pass per-commit.
- **Fix:** Updated useAgentStore.test.ts, useAgentLifecycle.test.ts, and AgentPanel.test.tsx in Task 1 commit.
- **Files modified:** src/stores/useAgentStore.test.ts, src/hooks/__tests__/useAgentLifecycle.test.ts, src/components/agent/__tests__/AgentPanel.test.tsx
- **Verification:** All 22 agent-related tests pass
- **Committed in:** 019df9f (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking)
**Impact on plan:** Both auto-fixes necessary for compilation and test correctness. No scope creep -- all changes were implicit requirements of the planned type removals.

## Issues Encountered
- 6 pre-existing test failures in unrelated files (mcp-server tests, calendar layout tests, action registry test) -- not related to this plan's changes.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all wiring is complete. The "elementai" drawer tab value exists in the union but has no corresponding UI panel yet; that is delivered by Plan 02.

## Next Phase Readiness
- State layer fully prepared for Plan 02 (UI relocation)
- DrawerTab union ready for elementai tab rendering
- Agent boots at app level, independent of any panel component
- All panelOpen/togglePanel references eliminated
- Plan 02 can safely delete AgentPanel, AgentToggleButton, AgentPanelHeader components

## Self-Check: PASSED

All 13 modified files verified present. Both task commits (019df9f, b6c6049) verified in git log.

---
*Phase: 31-drawer-consolidation*
*Completed: 2026-04-05*
