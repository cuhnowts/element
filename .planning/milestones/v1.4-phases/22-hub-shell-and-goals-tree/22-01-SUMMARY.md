---
phase: 22-hub-shell-and-goals-tree
plan: 01
subsystem: ui
tags: [zustand, react, routing, state-machine, shadcn, vitest]

# Dependency graph
requires: []
provides:
  - "activeView state machine in uiSlice (hub/project/task/theme/workflow)"
  - "CenterPanel switch-based routing on activeView"
  - "HomeButton component for hub navigation"
  - "7 test stub files for all phase 22 requirements (37 todo tests)"
  - "shadcn checkbox component installed"
affects: [22-02-PLAN, 22-03-PLAN]

# Tech tracking
tech-stack:
  added: ["@radix-ui/react-checkbox (via shadcn)"]
  patterns: ["activeView state machine for explicit routing", "navigateToHub clears all selection state"]

key-files:
  created:
    - src/components/sidebar/HomeButton.tsx
    - src/components/ui/checkbox.tsx
    - src/components/center/__tests__/CenterPanel.test.tsx
    - src/components/center/__tests__/HubView.test.tsx
    - src/components/hub/__tests__/MinimizedColumn.test.tsx
    - src/components/hub/__tests__/CalendarPlaceholder.test.tsx
    - src/components/hub/__tests__/GoalsTreePanel.test.tsx
    - src/components/hub/__tests__/GoalsTreeNode.test.tsx
    - src/components/hub/__tests__/ChoresSection.test.tsx
  modified:
    - src/stores/uiSlice.ts
    - src/stores/projectSlice.ts
    - src/stores/taskSlice.ts
    - src/stores/themeSlice.ts
    - src/components/layout/CenterPanel.tsx
    - src/components/sidebar/ThemeSidebar.tsx
    - src/components/sidebar/WorkflowList.tsx
    - src/components/sidebar/TaskListItem.tsx
    - src/components/center/PromoteButton.tsx
    - src/components/center/WorkflowDetail.tsx

key-decisions:
  - "activeView defaults to 'hub' on every launch (D-07, not persisted)"
  - "TodayView import removed from CenterPanel; hub placeholder shown until Plan 02 builds HubView"
  - "Workflow callers set activeView at call site since useWorkflowStore is separate from AppStore"

patterns-established:
  - "ActiveView routing: CenterPanel uses switch(activeView) not cascading if/else"
  - "Navigation pattern: navigateToHub clears selectedProjectId, selectedTaskId, selectedThemeId, and workspace selectedTaskId"
  - "Workflow activeView: callers of selectWorkflow must also call setActiveView('workflow') on main store"

requirements-completed: [HUB-03]

# Metrics
duration: 3min
completed: 2026-04-01
---

# Phase 22 Plan 01: ActiveView Routing and Hub Foundation Summary

**Explicit activeView state machine replacing cascading if/else routing, with HomeButton and 37 test stubs for all phase 22 requirements**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T23:41:41Z
- **Completed:** 2026-04-01T23:45:09Z
- **Tasks:** 3
- **Files modified:** 18

## Accomplishments
- Replaced CenterPanel cascading if/else with switch-based routing on explicit activeView state
- Added activeView state machine to uiSlice with navigateToHub action that clears all selection state
- Created HomeButton at top of ThemeSidebar for one-click hub navigation
- Wired all selection actions (project, task, theme, workflow) to set correct activeView
- Installed shadcn checkbox and created 7 test stub files with 37 todo tests for all phase 22 requirements

## Task Commits

Each task was committed atomically:

1. **Task 0: Wave 0 -- Install checkbox and create test stubs** - `b0b9cd9` (chore)
2. **Task 1: Add activeView state machine to uiSlice and update selection actions** - `b741a88` (feat)
3. **Task 2: Refactor CenterPanel routing and add HomeButton to sidebar** - `10aa2ba` (feat)

## Files Created/Modified
- `src/stores/uiSlice.ts` - ActiveView type, activeView state, setActiveView, navigateToHub
- `src/stores/projectSlice.ts` - selectProject sets activeView to 'project'
- `src/stores/taskSlice.ts` - selectTask sets activeView to 'task'
- `src/stores/themeSlice.ts` - selectTheme sets activeView to 'theme'
- `src/components/layout/CenterPanel.tsx` - Switch-based routing on activeView (hub/project/task/theme/workflow)
- `src/components/sidebar/HomeButton.tsx` - Home navigation button with active state
- `src/components/sidebar/ThemeSidebar.tsx` - HomeButton added at top
- `src/components/sidebar/WorkflowList.tsx` - setActiveView('workflow') on select
- `src/components/sidebar/TaskListItem.tsx` - setActiveView('workflow') on convert
- `src/components/center/PromoteButton.tsx` - setActiveView('workflow') on promote
- `src/components/center/WorkflowDetail.tsx` - navigateToHub on back/delete
- `src/components/ui/checkbox.tsx` - shadcn checkbox component
- `src/components/center/__tests__/CenterPanel.test.tsx` - 6 todo tests for activeView routing
- `src/components/center/__tests__/HubView.test.tsx` - 5 todo tests for 3-column layout
- `src/components/hub/__tests__/MinimizedColumn.test.tsx` - 5 todo tests for minimize/expand
- `src/components/hub/__tests__/CalendarPlaceholder.test.tsx` - 3 todo tests for calendar
- `src/components/hub/__tests__/GoalsTreePanel.test.tsx` - 5 todo tests for goals tree
- `src/components/hub/__tests__/GoalsTreeNode.test.tsx` - 7 todo tests for tree nodes
- `src/components/hub/__tests__/ChoresSection.test.tsx` - 6 todo tests for chores

## Decisions Made
- activeView defaults to 'hub' on every launch (D-07) -- not persisted via middleware
- TodayView import removed from CenterPanel; hub renders a placeholder until Plan 02 creates HubView
- Workflow callers set activeView at call site since useWorkflowStore is a separate Zustand store

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused expect import from test stubs**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** Test stubs imported `expect` from vitest but never used it, causing TS6133 errors
- **Fix:** Changed imports to `import { describe, it } from "vitest"`
- **Files modified:** All 7 test stub files
- **Verification:** `npx tsc --noEmit` clean (no TS6133 for stubs)
- **Committed in:** b741a88 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial fix for unused import. No scope creep.

## Issues Encountered
None

## Known Stubs
- `src/components/layout/CenterPanel.tsx` line 57: Hub case renders "Hub view loading..." placeholder text -- intentional, resolved by Plan 02 which creates HubView component

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- activeView routing foundation complete for Plan 02 (HubView 3-column layout)
- All 7 test stub files ready for Plan 02 and Plan 03 to fill in
- Checkbox component installed for Plan 03 ChoresSection
- HomeButton wired and rendering in sidebar

---
*Phase: 22-hub-shell-and-goals-tree*
*Completed: 2026-04-01*
