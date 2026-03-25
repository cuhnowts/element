---
phase: 11-workspace-integration-and-ai-context
plan: 02
subsystem: ui
tags: [zustand, react, terminal, workspace, state-management]

requires:
  - phase: 09-embedded-terminal
    provides: useTerminal hook, TerminalTab component, PTY spawn/cleanup
provides:
  - Per-project workspace state map in useWorkspaceStore (center tab, drawer state)
  - Terminal kill/respawn mechanism via terminalSessionKey and launchTerminalCommand
  - useTerminal initialCommand support for spawning CLI tools in PTY
  - CenterPanel and OutputDrawer wired to per-project state restore on project switch
affects: [11-03-open-ai-button]

tech-stack:
  added: []
  patterns: [per-project session state via Zustand map keyed by project ID, React key-based remount for PTY lifecycle]

key-files:
  created:
    - src/stores/useWorkspaceStore.test.ts
  modified:
    - src/stores/useWorkspaceStore.ts
    - src/hooks/useTerminal.ts
    - src/components/output/TerminalTab.tsx
    - src/components/layout/CenterPanel.tsx
    - src/components/layout/OutputDrawer.tsx

key-decisions:
  - "Session-only per-project state excluded from Zustand partialize (D-14)"
  - "Terminal kill/respawn via session key increment triggering React key change and component remount"

patterns-established:
  - "Per-project state: useWorkspaceStore.projectStates map with getProjectState/setProjectCenterTab/saveCurrentProjectState/restoreProjectState"
  - "Terminal kill/respawn: launchTerminalCommand increments terminalSessionKey, TerminalTab key includes session key for remount"

requirements-completed: [AIAS-02]

duration: 3min
completed: 2026-03-25
---

# Phase 11 Plan 02: Per-Project Workspace State Summary

**Per-project workspace state map with save/restore on project switch, plus terminal kill/respawn infrastructure via session key and initialCommand support**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25T00:41:40Z
- **Completed:** 2026-03-25T00:44:18Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Per-project workspace state stored in session-only Zustand map keyed by project ID
- Switching projects saves outgoing state and restores incoming center tab and drawer state
- Terminal kill/respawn mechanism: launchTerminalCommand increments session key, causing TerminalTab remount with initialCommand
- useTerminal supports optional initialCommand to spawn CLI tools instead of default shell
- 5 Vitest behavioral tests covering defaults, persistence, independence, kill/respawn, and session-only storage

## Task Commits

Each task was committed atomically:

1. **Task 1: Add per-project state map and terminal session key** - `1de5b53` (feat)
2. **Task 2: Wire CenterPanel, OutputDrawer and add tests** - `246ac42` (feat)

## Files Created/Modified
- `src/stores/useWorkspaceStore.ts` - Added ProjectWorkspaceState interface, per-project state map, terminal session key, and launchTerminalCommand
- `src/hooks/useTerminal.ts` - Added optional initialCommand parameter for spawning CLI tools
- `src/components/output/TerminalTab.tsx` - Added initialCommand prop passthrough
- `src/components/layout/CenterPanel.tsx` - Added project switch save/restore via useEffect with prevProjectRef
- `src/components/layout/OutputDrawer.tsx` - Added per-project drawer state saving and terminal session key in TerminalTab key
- `src/stores/useWorkspaceStore.test.ts` - 5 behavioral tests for per-project state management

## Decisions Made
- Session-only per-project state excluded from Zustand partialize (not persisted across restarts, per D-14)
- Terminal kill/respawn uses React key-based remount pattern: incrementing terminalSessionKey changes the TerminalTab key, triggering unmount (kills old PTY) and remount (spawns new PTY with initialCommand)
- saveCurrentProjectState reads current global drawer state to snapshot; restoreProjectState applies stored state to globals

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Per-project workspace state is ready for Plan 11-03 (OpenAiButton) to use launchTerminalCommand for spawning CLI tools
- CenterPanel and OutputDrawer fully wired to per-project state restore

---
*Phase: 11-workspace-integration-and-ai-context*
*Completed: 2026-03-25*
