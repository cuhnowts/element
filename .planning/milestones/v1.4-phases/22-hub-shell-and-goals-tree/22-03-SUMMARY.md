---
phase: 22-hub-shell-and-goals-tree
plan: 03
subsystem: ui
tags: [react, zustand, collapsible, tree-view, checkbox, shadcn]

# Dependency graph
requires:
  - phase: 22-02
    provides: 3-column HubView with goals panel placeholder slot

provides:
  - "GoalsTreePanel with expandable project/phase hierarchy and per-project data fetching"
  - "ProgressDot component for visual progress indicators (complete/in-progress/not-started)"
  - "GoalsTreeNode with collapsible phases and project navigation via selectProject"
  - "ChoresSection with standalone task checkboxes for quick completion toggle"
  - "Phase status derivation from task statuses (derivePhaseStatus, deriveProjectStatus)"

affects: [23-ai-briefing, 24-hub-chat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-project data fetching via direct API calls to avoid global store pollution"
    - "Stable projectIds string for useEffect dependency (Zustand selector stability)"
    - "Phase/project status derived from task statuses (no status field on Phase)"

key-files:
  created:
    - src/components/hub/ProgressDot.tsx
    - src/components/hub/GoalsTreeNode.tsx
    - src/components/hub/GoalsTreePanel.tsx
    - src/components/hub/ChoresSection.tsx
  modified:
    - src/components/center/HubView.tsx

key-decisions:
  - "Phase/project progress derived from task statuses at render time (no stored status field)"
  - "Used CollapsibleTrigger directly instead of asChild pattern (base-ui API compatibility)"
  - "Exported derivePhaseStatus and deriveProjectStatus for potential reuse/testing"

patterns-established:
  - "Progress derivation: all tasks complete = filled, any in-progress/blocked = hollow, otherwise empty"
  - "Goals tree data isolation: per-project API calls stored in local component state, not global phaseSlice"

requirements-completed: [GOAL-01, GOAL-02, GOAL-03]

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 22 Plan 03: Goals Tree and Chores Summary

**Expandable project/phase goals tree with progress dots and standalone task chores section with interactive checkboxes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T23:55:25Z
- **Completed:** 2026-04-01T23:57:23Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Goals tree renders flat project list with chevron expand/collapse to reveal phases
- ProgressDot shows filled (complete), hollow (in-progress), or empty (not-started) based on task statuses
- ChoresSection displays standalone tasks with checkboxes that toggle pending/complete status
- HubView goals panel slot replaced with fully wired GoalsTreePanel component

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ProgressDot, GoalsTreeNode, and GoalsTreePanel with per-project phase fetching** - `3d1e398` (feat)
2. **Task 2: Create ChoresSection with standalone tasks and checkbox completion** - `3f9b548` (feat)

## Files Created/Modified
- `src/components/hub/ProgressDot.tsx` - Visual progress indicator (complete/in-progress/not-started)
- `src/components/hub/GoalsTreeNode.tsx` - Expandable project row with phase children and progress dots
- `src/components/hub/GoalsTreePanel.tsx` - Scrollable goals tree with loading skeleton, empty state, and ChoresSection
- `src/components/hub/ChoresSection.tsx` - Standalone tasks with checkboxes for quick completion toggle
- `src/components/center/HubView.tsx` - Goals panel slot now renders GoalsTreePanel

## Decisions Made
- Phase/project progress derived from task statuses at render time (Phase type has no status field)
- Used CollapsibleTrigger directly with className instead of asChild pattern (base-ui API, not Radix)
- Exported derivePhaseStatus and deriveProjectStatus functions for potential reuse and testing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted CollapsibleTrigger usage for base-ui API**
- **Found during:** Task 1 (GoalsTreeNode creation)
- **Issue:** Plan used `asChild` prop on CollapsibleTrigger which is a Radix UI pattern; project uses @base-ui/react which does not support asChild
- **Fix:** Used CollapsibleTrigger directly with className prop instead of wrapping a button with asChild
- **Files modified:** src/components/hub/GoalsTreeNode.tsx
- **Verification:** `npx tsc --noEmit` passes with zero new errors
- **Committed in:** 3d1e398

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** API adaptation was necessary for TypeScript compilation. No scope creep -- same behavior achieved with correct API.

## Issues Encountered
None beyond the base-ui API adaptation handled as a deviation.

## Known Stubs
None -- all components are fully wired with real data sources.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Goals tree and chores section complete -- Phase 22 is now fully delivered
- Hub center panel still shows "Welcome back" placeholder -- Phase 23 will replace with AI briefing
- Calendar panel shows "Coming Soon" placeholder -- future phase will add calendar

---
*Phase: 22-hub-shell-and-goals-tree*
*Completed: 2026-04-01*
