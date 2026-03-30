---
phase: 19-multi-terminal-sessions
plan: 03
subsystem: ui
tags: [zustand, react, xterm, tauri, terminal, sessions]

requires:
  - phase: 19-multi-terminal-sessions/01
    provides: "useTerminalSessionStore with session CRUD, gracefulKillPty"
  - phase: 19-multi-terminal-sessions/02
    provides: "RefreshContextDialog component (placeholder created for compilation)"
provides:
  - "Session-aware OpenAiButton with refresh dialog flow (D-01)"
  - "Project delete terminal cleanup (D-11)"
  - "Sidebar SessionIndicator green dot (D-10)"
  - "App quit useTerminalCleanup hook (D-13)"
affects: [19-multi-terminal-sessions]

tech-stack:
  added: []
  patterns: ["Store-driven cleanup before API calls", "Window close intercept with store-triggered unmounts"]

key-files:
  created:
    - src/components/output/RefreshContextDialog.tsx
    - src/components/sidebar/SessionIndicator.tsx
    - src/hooks/useTerminalCleanup.ts
  modified:
    - src/components/center/OpenAiButton.tsx
    - src/stores/projectSlice.ts
    - src/components/sidebar/ProjectList.tsx
    - src/components/layout/AppLayout.tsx

key-decisions:
  - "Placeholder RefreshContextDialog created for Plan 02 dependency -- will be replaced by Plan 02's real implementation"
  - "App quit cleanup uses store removeAllForProject to trigger React unmount cleanup effects rather than direct PTY kills"

patterns-established:
  - "Store-first cleanup: clear session store state to trigger React unmount, which handles PTY teardown"
  - "Session-aware AI launch: check existing session before creating, show dialog for user choice"

requirements-completed: [TERM-01, TERM-03, TERM-04]

duration: 4min
completed: 2026-03-30
---

# Phase 19 Plan 03: Integration Points Summary

**Session-aware OpenAiButton with refresh dialog, project delete cleanup, sidebar session indicator, and app quit teardown**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T01:25:02Z
- **Completed:** 2026-03-30T01:29:11Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- OpenAiButton now checks for existing AI session before creating a new one, showing RefreshContextDialog when one exists (D-01, TERM-03)
- Project deletion kills all terminal sessions first via removeAllForProject before API call (D-11, TERM-01)
- Sidebar projects with running sessions show a green indicator dot (D-10)
- App quit intercepts window close to gracefully tear down all PTY processes (D-13, TERM-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor OpenAiButton for session-aware AI launch with refresh dialog** - `1086570` (feat)
2. **Task 2: Project delete cleanup, sidebar indicator, and app quit hook** - `1c91821` (feat)

## Files Created/Modified
- `src/components/center/OpenAiButton.tsx` - Replaced launchTerminalCommand with session-aware createSession + refresh dialog flow
- `src/components/output/RefreshContextDialog.tsx` - Placeholder dialog for Plan 02 dependency
- `src/stores/projectSlice.ts` - Added removeAllForProject cleanup before deleteProject API call
- `src/components/sidebar/SessionIndicator.tsx` - Green dot indicator for projects with running sessions
- `src/components/sidebar/ProjectList.tsx` - Added SessionIndicator after project name
- `src/hooks/useTerminalCleanup.ts` - App quit cleanup hook with onCloseRequested + store teardown
- `src/components/layout/AppLayout.tsx` - Mounted useTerminalCleanup hook

## Decisions Made
- Created placeholder RefreshContextDialog since Plan 02 (which creates the real one) runs in parallel. The real implementation will replace it on merge.
- App quit cleanup strategy: clear store state (removeAllForProject) to trigger React component unmounts, which run gracefulKillPty in their useEffect cleanup. This avoids duplicating PTY ref management in the hook.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created placeholder RefreshContextDialog for Plan 02 dependency**
- **Found during:** Task 1 (OpenAiButton refactor)
- **Issue:** Plan 02 creates RefreshContextDialog.tsx, but as a parallel dependency it doesn't exist in this worktree
- **Fix:** Created minimal placeholder with correct interface (open, onOpenChange, onRefresh, onKeepExisting props)
- **Files modified:** src/components/output/RefreshContextDialog.tsx
- **Verification:** TypeScript compiles clean for all plan files
- **Committed in:** 1086570 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Placeholder necessary for compilation. Plan 02's real implementation replaces it on merge. No scope creep.

## Issues Encountered
- 8 pre-existing TypeScript errors in files outside this plan's scope (ProjectDetail.tsx references removed launchTerminalCommand, OutputDrawer.tsx references removed workspace properties, CenterPanel.tsx imports missing ThemeDetail module, test file unused variables). None of these are in files modified by this plan.

## Known Stubs
- `src/components/output/RefreshContextDialog.tsx` - Placeholder implementation; Plan 02 delivers the full version with proper styling and behavior.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four integration points (OpenAiButton, project delete, sidebar indicator, app quit) are wired to useTerminalSessionStore
- Plan 02's RefreshContextDialog will replace the placeholder on merge
- Pre-existing TS errors in ProjectDetail.tsx and OutputDrawer.tsx from Plan 01's workspace store changes will be resolved when those files are updated by their respective plans

---
*Phase: 19-multi-terminal-sessions*
*Completed: 2026-03-30*
