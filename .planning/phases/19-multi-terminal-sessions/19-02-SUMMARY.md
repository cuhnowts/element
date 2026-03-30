---
phase: 19-multi-terminal-sessions
plan: 02
subsystem: terminal
tags: [react, xterm, pty, zustand, multi-session, tabs, shadcn]

requires:
  - phase: 19-multi-terminal-sessions
    plan: 01
    provides: useTerminalSessionStore with project-isolated CRUD, gracefulKillPty, refactored useTerminal hook
provides:
  - SessionTab component with active/inactive states and hover-reveal close button
  - SessionTabBar component with horizontal scroll and new session button
  - RefreshContextDialog for AI session refresh confirmation
  - TerminalSession component wrapping per-session xterm.js with PTY lifecycle
  - TerminalPane mount-all/show-one container with empty state
  - Refactored OutputDrawer using new multi-session components
affects: [19-03 (OpenAiButton AI session wiring), 21 (agent terminal spawning)]

tech-stack:
  added: []
  patterns: [mount-all-show-one terminal rendering, base-ui tooltip render prop for button triggers, PTY exit auto-cleanup with timeout]

key-files:
  created:
    - src/components/output/SessionTab.tsx
    - src/components/output/SessionTabBar.tsx
    - src/components/output/RefreshContextDialog.tsx
    - src/components/output/TerminalSession.tsx
    - src/components/output/TerminalPane.tsx
  modified:
    - src/components/layout/OutputDrawer.tsx

key-decisions:
  - "base-ui tooltip render prop used on TooltipTrigger to avoid nested button DOM elements"
  - "Empty state for no-sessions rendered inside TerminalPane rather than extending TerminalEmptyState"
  - "SessionTabBar rendered inside OutputDrawer terminal section, not in AppLayout ResizableHandle"

patterns-established:
  - "Mount-all-show-one: all sessions mounted with display:none/block, preserving scroll history"
  - "PTY exit auto-cleanup: markExited then removeSession after 3s timeout"
  - "Graceful kill on unmount: useEffect cleanup calls gracefulKillPty"

requirements-completed: [TERM-02, TERM-05]

duration: 2min
completed: 2026-03-30
---

# Phase 19 Plan 02: Terminal UI Components Summary

**Session tab bar with horizontal scroll, mount-all/show-one terminal pane, per-session xterm.js wrapper with PTY lifecycle, and refresh context dialog**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T01:25:10Z
- **Completed:** 2026-03-30T01:27:23Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Five new UI components built: SessionTab, SessionTabBar, RefreshContextDialog, TerminalSession, TerminalPane
- OutputDrawer refactored to use SessionTabBar + TerminalPane instead of single TerminalTab
- PTY exit detection with auto-remove after 3 seconds and graceful kill on unmount
- Mount-all/show-one rendering pattern preserves scroll history across tab switches

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SessionTab, SessionTabBar, and RefreshContextDialog** - `14d3b05` (feat)
2. **Task 2: Create TerminalSession, TerminalPane, and refactor OutputDrawer** - `b18ad26` (feat)

## Files Created/Modified
- `src/components/output/SessionTab.tsx` - Individual session tab with active/inactive styles, hover-reveal close button, tooltip
- `src/components/output/SessionTabBar.tsx` - Sub-row of session tabs with horizontal scroll and + new session button
- `src/components/output/RefreshContextDialog.tsx` - Two-action dialog for AI session refresh confirmation
- `src/components/output/TerminalSession.tsx` - Per-session xterm.js wrapper with PTY exit detection and graceful kill
- `src/components/output/TerminalPane.tsx` - Mount-all/show-one container with no-sessions empty state
- `src/components/layout/OutputDrawer.tsx` - Refactored to use SessionTabBar + TerminalPane, removed old terminal fields

## Decisions Made
- Used base-ui tooltip render prop on TooltipTrigger to wrap buttons without nesting (matching existing pattern from Phase 18)
- No-sessions empty state rendered inside TerminalPane for cleaner separation rather than extending TerminalEmptyState component
- SessionTabBar rendered inside OutputDrawer terminal content area, not in AppLayout ResizableHandle (simpler, avoids clutter)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functionality is fully wired. RefreshContextDialog is ready for OpenAiButton integration in Plan 03.

## Next Phase Readiness
- All terminal UI components ready for Plan 03 to wire OpenAiButton AI session flow
- Pre-existing TS errors in OpenAiButton.tsx and ProjectDetail.tsx (referencing removed launchTerminalCommand) expected to be fixed in Plan 03
- ExecutionHistory import error in OutputDrawer is from parallel agent work

---
*Phase: 19-multi-terminal-sessions*
*Completed: 2026-03-30*
