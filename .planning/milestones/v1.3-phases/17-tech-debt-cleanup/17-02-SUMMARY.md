---
phase: 17-tech-debt-cleanup
plan: 02
subsystem: ui
tags: [react, zustand, error-handling, navigation, sonner, toast]

# Dependency graph
requires: []
provides:
  - "Navigation-safe Open AI button with explicit error handling on all failure paths"
  - "Test proving startPlanWatcher failure does not cause navigation away from ProjectDetail"
affects: [19-multi-terminal, 21-central-ai-agent]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Explicit try/catch per async step in OpenAiButton rather than relying on outer catch-all"

key-files:
  created: []
  modified:
    - src/components/center/OpenAiButton.tsx
    - src/components/center/OpenAiButton.test.tsx

key-decisions:
  - "Explicit try/catch around startPlanWatcher with early return, rather than relying on outer generic catch"
  - "Fixed pre-existing test bug (missing @ prefix in context path assertion) as Rule 1 auto-fix"

patterns-established:
  - "Error toast pattern: descriptive problem + actionable next step per UI-SPEC copywriting contract"

requirements-completed: [DEBT-03]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 17 Plan 02: Open AI Navigation Bug Fix Summary

**Explicit startPlanWatcher error handling prevents navigation-to-home bug and adds descriptive toast on watcher failure**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T01:00:51Z
- **Completed:** 2026-03-30T01:04:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Diagnosed navigation bug root cause: startPlanWatcher rejection fell through to generic catch without actionable error message
- Added explicit try/catch around startPlanWatcher with descriptive toast and early return before launchTerminalCommand
- Added test proving watcher failure shows specific error toast and does not call launchTerminalCommand
- OpenAiButton now has 5 toast.error calls covering all failure paths (3 existing + 1 watcher + 1 generic catch)

## Task Commits

Each task was committed atomically:

1. **Task 1: Diagnose navigation bug and write failing test** - `81984d8` (test)
2. **Task 2: Fix the navigation bug (GREEN step)** - `4b1dc3e` (feat)

## Files Created/Modified
- `src/components/center/OpenAiButton.tsx` - Added explicit try/catch around startPlanWatcher with descriptive toast error and early return
- `src/components/center/OpenAiButton.test.tsx` - Added navigation bug regression test, fixed pre-existing @ prefix assertion bug

## Decisions Made
- Used explicit try/catch with early return around startPlanWatcher rather than relying on the outer generic catch block. This ensures a descriptive error message specific to the watcher failure and prevents launchTerminalCommand from executing on a broken watcher state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing test assertion for context path @ prefix**
- **Found during:** Task 2 (GREEN step)
- **Issue:** Existing happy-path test expected `"/path/.element/context.md"` but code prepends `@` prefix, making the test fail with `"@/path/.element/context.md"`
- **Fix:** Updated test assertion to include the `@` prefix
- **Files modified:** src/components/center/OpenAiButton.test.tsx
- **Verification:** All 6 tests pass
- **Committed in:** 4b1dc3e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Pre-existing test bug fix was necessary to verify GREEN step. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Open AI button error handling is now comprehensive for all async failure paths
- Ready for multi-terminal work (Phase 19) -- navigation state is protected during terminal launch flow
- No blockers

---
*Phase: 17-tech-debt-cleanup*
*Completed: 2026-03-30*
