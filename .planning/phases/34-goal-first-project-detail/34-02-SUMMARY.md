---
phase: 34-goal-first-project-detail
plan: 02
subsystem: ui
tags: [react, zustand, shadcn, accordion, inline-edit, debounce, lucide-react]

# Dependency graph
requires:
  - phase: 34-goal-first-project-detail
    provides: "Wave 0 test stubs (GoalHeroCard, WorkspaceButton), goal DB migration, update_project_goal command, Project.goal field, updateProjectGoal API wrapper"
provides:
  - "GoalHeroCard component with inline edit, auto-save, empty state"
  - "WorkspaceButton component with dual-mode Open Workspace / Link Directory"
  - "Restructured ProjectDetail layout: name row -> goal hero -> workspace -> phases -> details accordion"
affects: [project-detail, workspace-entry, goal-editing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Debounced auto-save with useRef timer (800ms, same as description pattern)"
    - "Synchronous fire-and-forget for non-blocking multi-action workspace entry"

key-files:
  created:
    - src/components/center/GoalHeroCard.tsx
    - src/components/center/WorkspaceButton.tsx
  modified:
    - src/components/center/ProjectDetail.tsx
    - src/components/center/__tests__/GoalHeroCard.test.tsx

key-decisions:
  - "WorkspaceButton fires startFileWatcher as fire-and-forget to avoid blocking setProjectCenterTab and openTerminal behind async await"
  - "GoalHeroCard test updated to use act() with fake timers instead of waitFor to prevent timeout with vi.useFakeTimers()"

patterns-established:
  - "GoalHeroCard: inline edit pattern with display/edit mode toggle, Escape to revert, blur/Enter to save"
  - "WorkspaceButton: single-click workspace entry combining file tree + terminal drawer activation"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03]

# Metrics
duration: 3min
completed: 2026-04-05
---

# Phase 34 Plan 02: Goal-First UI Components Summary

**GoalHeroCard with inline edit and auto-save, WorkspaceButton with one-click workspace entry, ProjectDetail restructured to goal-first layout with details accordion**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-05T12:40:12Z
- **Completed:** 2026-04-05T12:43:09Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- GoalHeroCard renders project goal with Target icon, inline edit with 800ms debounce auto-save, and "Set a project goal..." empty state prompt
- WorkspaceButton provides dual-mode: "Open Workspace" (opens file tree + terminal in one click) and "Link Directory" (native OS picker)
- ProjectDetail restructured to goal-first layout: name row with compact progress and clickable tier badge -> goal hero card -> workspace button -> phases -> collapsible details accordion
- All 21 tests pass (14 Wave 0 component tests + 7 ProjectDetail helper tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GoalHeroCard and WorkspaceButton components** - `37b63f7` (feat)
2. **Task 2: Restructure ProjectDetail layout** - `692e1db` (feat)

## Files Created/Modified
- `src/components/center/GoalHeroCard.tsx` - Goal hero card with inline edit, auto-save via updateProjectGoal, empty state
- `src/components/center/WorkspaceButton.tsx` - Dual-mode workspace button replacing OpenAiButton + DirectoryLink
- `src/components/center/ProjectDetail.tsx` - Restructured layout with goal-first order and details accordion
- `src/components/center/__tests__/GoalHeroCard.test.tsx` - Fixed debounce test to use act() with fake timers

## Decisions Made
- WorkspaceButton calls startFileWatcher as fire-and-forget (not awaited) so setProjectCenterTab and openTerminal execute immediately -- matches test expectations and provides snappier UX
- GoalHeroCard test updated from waitFor to act() wrapping vi.advanceTimersByTime to prevent timeout when using vi.useFakeTimers()

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed GoalHeroCard debounce test timeout with fake timers**
- **Found during:** Task 1 (GoalHeroCard implementation)
- **Issue:** Test used `waitFor` with `vi.useFakeTimers()` causing 5s timeout -- waitFor polls with timers that are also faked
- **Fix:** Replaced `waitFor` with `act(async () => { vi.advanceTimersByTime(800) })` and direct assertion
- **Files modified:** src/components/center/__tests__/GoalHeroCard.test.tsx
- **Verification:** All 9 GoalHeroCard tests pass
- **Committed in:** 37b63f7 (Task 1 commit)

**2. [Rule 1 - Bug] Made WorkspaceButton fire-and-forget for non-blocking multi-action**
- **Found during:** Task 1 (WorkspaceButton implementation)
- **Issue:** Awaiting startFileWatcher before setProjectCenterTab/openTerminal caused test assertions to fail (sync expectations)
- **Fix:** Changed to fire-and-forget pattern with .catch() error handler
- **Files modified:** src/components/center/WorkspaceButton.tsx
- **Verification:** All 5 WorkspaceButton tests pass
- **Committed in:** 37b63f7 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for test correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components are fully wired to real APIs and stores.

## Next Phase Readiness
- GoalHeroCard and WorkspaceButton are ready for use in any project detail context
- ProjectDetail layout complete with all three PROJ requirements delivered
- OpenAiButton and DirectoryLink are no longer imported in ProjectDetail but remain in codebase for other potential consumers

---
*Phase: 34-goal-first-project-detail*
*Completed: 2026-04-05*

## Self-Check: PASSED
