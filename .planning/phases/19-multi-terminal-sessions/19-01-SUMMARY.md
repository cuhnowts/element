---
phase: 19-multi-terminal-sessions
plan: 01
subsystem: terminal
tags: [zustand, xterm, pty, multi-session, tdd]

requires:
  - phase: 17-tech-debt-cleanup
    provides: clean TS compilation baseline
provides:
  - useTerminalSessionStore with project-isolated CRUD, active tracking, AI session lookup
  - gracefulKillPty utility (SIGTERM + 3s SIGKILL)
  - useTerminal hook exposing ptyRef and termRef for component lifecycle management
  - workspace store cleaned of old terminal kill/respawn fields
affects: [19-02 (tab UI components), 19-03 (AI session wiring), 21 (agent terminal spawning)]

tech-stack:
  added: []
  patterns: [project-keyed Zustand store, exported utility function alongside store, TDD red-green workflow]

key-files:
  created:
    - src/stores/useTerminalSessionStore.ts
    - src/stores/useTerminalSessionStore.test.ts
  modified:
    - src/stores/useWorkspaceStore.ts
    - src/stores/useWorkspaceStore.test.ts
    - src/hooks/useTerminal.ts

key-decisions:
  - "PTY and xterm Terminal refs not stored in Zustand - managed by React refs in component layer"
  - "gracefulKillPty exported as standalone async function, not a store action"
  - "closeSession prefers left/earlier neighbor when re-selecting active session"

patterns-established:
  - "Project-keyed state: Record<projectId, T[]> pattern for per-project isolation"
  - "Graceful kill: SIGTERM then SIGKILL after 3s timeout with onExit early resolve"

requirements-completed: [TERM-01, TERM-02, TERM-04, TERM-05]

duration: 2min
completed: 2026-03-29
---

# Phase 19 Plan 01: Terminal Session Store Summary

**Zustand session store with project-isolated CRUD, graceful PTY kill, and refactored useTerminal hook exposing PTY/Terminal refs**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T01:19:55Z
- **Completed:** 2026-03-30T01:22:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Terminal session store created with full CRUD, project isolation, active session tracking, AI session lookup, and getAllSessions for app quit
- gracefulKillPty utility with SIGTERM/SIGKILL lifecycle and 13 unit tests (TDD)
- Old terminal kill/respawn pattern (terminalSessionKey, terminalInitialCommand, launchTerminalCommand) removed from workspace store
- useTerminal hook refactored to expose ptyRef and termRef for component-level lifecycle management

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useTerminalSessionStore with unit tests** - `77db120` (feat, TDD red-green)
2. **Task 2: Remove old terminal fields and refactor useTerminal** - `4666182` (refactor)

## Files Created/Modified
- `src/stores/useTerminalSessionStore.ts` - Zustand store with TerminalSession type, CRUD actions, gracefulKillPty
- `src/stores/useTerminalSessionStore.test.ts` - 13 unit tests covering isolation, lifecycle, kill behavior
- `src/stores/useWorkspaceStore.ts` - Removed terminalSessionKey, terminalInitialCommand, launchTerminalCommand
- `src/stores/useWorkspaceStore.test.ts` - Removed tests for deleted fields
- `src/hooks/useTerminal.ts` - Now returns { isReady, error, ptyRef, termRef }

## Decisions Made
- PTY and xterm Terminal refs kept out of Zustand store; they will be managed by React refs in the component layer (Plan 02)
- gracefulKillPty exported as standalone async function rather than store action, since it needs the PTY reference which lives in components
- closeSession auto-selects left/earlier neighbor to match tab bar UX conventions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functionality is fully wired.

## Next Phase Readiness
- Session store ready for Plan 02 to build TerminalSession component and tab UI
- OutputDrawer.tsx and OpenAiButton.tsx will have compile errors referencing removed fields (expected, fixed in Plan 02/03)
- useTerminal hook's exposed ptyRef/termRef ready for component-level graceful kill integration

---
*Phase: 19-multi-terminal-sessions*
*Completed: 2026-03-29*
