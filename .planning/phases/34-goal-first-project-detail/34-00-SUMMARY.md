---
phase: 34-goal-first-project-detail
plan: 00
subsystem: testing
tags: [vitest, react-testing-library, test-stubs, tdd]

requires: []
provides:
  - "Test stubs for GoalHeroCard (9 tests: display, a11y, inline editing, debounce save)"
  - "Test stubs for WorkspaceButton (5 tests: dual-mode, workspace open, directory link)"
affects: [34-goal-first-project-detail]

tech-stack:
  added: []
  patterns:
    - "Test-first stubs with mocked Tauri API and stores for component TDD"

key-files:
  created:
    - src/components/center/__tests__/GoalHeroCard.test.tsx
    - src/components/center/__tests__/WorkspaceButton.test.tsx
  modified: []

key-decisions:
  - "Followed existing ProjectDetail.test.tsx mock patterns for Tauri and store mocks"
  - "Used vi.useFakeTimers for debounce testing in goal editing"

patterns-established:
  - "GoalHeroCard test pattern: mock api.updateProjectGoal and useStore.getState for isolated component testing"
  - "WorkspaceButton test pattern: mock useWorkspaceStore with getState for workspace action testing"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03]

duration: 1min
completed: 2026-04-05
---

# Phase 34 Plan 00: Test Stubs Summary

**Test-first stubs for GoalHeroCard (9 cases) and WorkspaceButton (5 cases) covering goal display, inline editing, and dual-mode workspace entry**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-05T12:32:08Z
- **Completed:** 2026-04-05T12:33:08Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created GoalHeroCard test stubs with 9 test cases covering PROJ-01 (goal display, empty state, Target icon, a11y region) and PROJ-02 (edit pencil, edit mode entry, empty card click, Escape revert, debounce save on blur)
- Created WorkspaceButton test stubs with 5 test cases covering PROJ-03 (Open Workspace label, Link Directory label, path display, workspace click actions, directory picker dialog)
- Both files follow existing Tauri mock patterns from ProjectDetail.test.tsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test stubs for GoalHeroCard and WorkspaceButton** - `5004d57` (test)

## Files Created/Modified
- `src/components/center/__tests__/GoalHeroCard.test.tsx` - 9 test cases for goal hero card display and editing
- `src/components/center/__tests__/WorkspaceButton.test.tsx` - 5 test cases for workspace button dual-mode behavior

## Decisions Made
- Followed existing ProjectDetail.test.tsx mock patterns for consistency
- Used vi.useFakeTimers with advanceTimersByTime(800) for debounce testing
- Mocked useWorkspaceStore with getState pattern for workspace action assertions

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - these are intentional test stubs (RED phase). The components they import do not exist yet; Plan 02 will create the implementations that make these tests pass.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Test files ready as verify targets for Plans 01 and 02
- Plan 01 adds the goal column to the database; Plan 02 creates GoalHeroCard and WorkspaceButton components

---
*Phase: 34-goal-first-project-detail*
*Completed: 2026-04-05*
