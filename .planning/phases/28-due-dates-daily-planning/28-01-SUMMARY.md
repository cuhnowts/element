---
phase: 28-due-dates-daily-planning
plan: 01
subsystem: ui
tags: [date-fns, react, shadcn, due-dates, urgency, badges, calendar-popover]

requires: []
provides:
  - "date-utils: isOverdue, isDueSoon, isBacklogPhase pure functions"
  - "DatePickerPopover component with quick-select shortcuts"
  - "Badge warning variant (amber oklch)"
  - "ProgressDot overdue status with bg-destructive"
  - "SchedulingBadges three-tier urgency with backlog exemption"
  - "GoalsTreeNode overdue count badges bubbling up from child tasks"
affects: [28-02, 28-03, hub-calendar-view, daily-planning-skill]

tech-stack:
  added: [date-fns@4.1.0]
  patterns: [three-tier-urgency, backlog-exemption-999, date-picker-popover]

key-files:
  created:
    - src/lib/date-utils.ts
    - src/lib/date-utils.test.ts
    - src/components/shared/DatePickerPopover.tsx
    - src/components/shared/SchedulingBadges.test.ts
  modified:
    - src/components/ui/badge.tsx
    - src/components/hub/ProgressDot.tsx
    - src/components/shared/SchedulingBadges.tsx
    - src/components/center/TaskDetail.tsx
    - src/components/hub/GoalsTreeNode.tsx

key-decisions:
  - "Empty string convention for clearing due dates through Tauri invoke (Rust Option<String> fallback prevents null clearing)"
  - "base-ui Popover with render prop for trigger instead of radix-style composition"

patterns-established:
  - "Three-tier urgency: overdue=destructive, due-soon=warning, normal=outline"
  - "Backlog exemption: phases with sortOrder >= 999 always show outline variant"
  - "countOverdueTasks helper for aggregating overdue counts across phase/project hierarchy"

requirements-completed: [DUE-01, DUE-02, DUE-03]

duration: 7min
completed: 2026-04-04
---

# Phase 28 Plan 01: Due Dates & Urgency Visuals Summary

**DatePickerPopover with quick-select shortcuts, three-tier urgency badges (overdue red, due-soon amber, normal outline), GoalsTreeNode overdue count badges with backlog exemption**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-04T12:30:46Z
- **Completed:** 2026-04-04T12:38:10Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Created date-utils with isOverdue, isDueSoon, isBacklogPhase and full test coverage (16 tests passing)
- Built DatePickerPopover with Today/Tomorrow/Next week/+1 month quick-select shortcuts and shadcn Calendar
- Implemented three-tier urgency system across SchedulingBadges (destructive/warning/outline) with backlog phase exemption
- Added overdue count badges to GoalsTreeNode phases and projects, bubbling up from child tasks
- Extended Badge component with amber warning variant and ProgressDot with overdue status

## Task Commits

Each task was committed atomically:

1. **Task 1: Date utilities, badge warning variant, ProgressDot overdue, SchedulingBadges tests (TDD)**
   - `46d18b2` (test: failing tests for date-utils and SchedulingBadges)
   - `dad722c` (feat: date-utils, badge warning, ProgressDot overdue, SchedulingBadges three-tier)
2. **Task 2: DatePickerPopover, SchedulingBadges three-tier, TaskDetail wiring, GoalsTreeNode overdue badges** - `c826935` (feat)

## Files Created/Modified
- `src/lib/date-utils.ts` - Pure utility functions: isOverdue, isDueSoon, isBacklogPhase
- `src/lib/date-utils.test.ts` - 12 unit tests with vi.useFakeTimers for deterministic date testing
- `src/components/shared/DatePickerPopover.tsx` - Calendar popover with quick-select shortcuts for due date setting
- `src/components/shared/SchedulingBadges.test.ts` - 4 tests for three-tier variant logic with backlog exemption
- `src/components/ui/badge.tsx` - Added warning variant with oklch(0.75 0.15 85) amber color
- `src/components/hub/ProgressDot.tsx` - Added "overdue" status with bg-destructive fill
- `src/components/shared/SchedulingBadges.tsx` - Three-tier urgency (destructive/warning/outline) with isBacklog prop
- `src/components/center/TaskDetail.tsx` - Wired DatePickerPopover and isBacklog into scheduling accordion
- `src/components/hub/GoalsTreeNode.tsx` - Added countOverdueTasks, overdue count badges, overdue ProgressDot status

## Decisions Made
- Used empty string convention (`""`) for clearing due dates via Tauri invoke, since Rust `Option<String>` with `.or()` fallback cannot distinguish "no change" from "set to null" -- empty string is falsy in JS so treated as no date
- Used base-ui Popover `render` prop for trigger button (not radix-style children composition)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed UpdateTaskInput type compatibility for due date clearing**
- **Found during:** Task 2 (TaskDetail wiring)
- **Issue:** `onChange` from DatePickerPopover returns `string | null` but `UpdateTaskInput.dueDate` is `string | undefined` -- TypeScript error on null assignment
- **Fix:** Convert null to empty string (`date ?? ""`) when passing to updateTask, preserving type safety while enabling due date clearing
- **Files modified:** src/components/center/TaskDetail.tsx
- **Verification:** TypeScript compilation passes
- **Committed in:** c826935 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for due date clearing to work end-to-end. No scope creep.

## Issues Encountered
None

## Known Stubs
None -- all data sources are wired to existing task CRUD via updateTask and the goals tree reads live task data from the store.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Date utilities and urgency visuals ready for daily planning features
- DatePickerPopover can be reused in briefing suggestion cards (Plan 02/03)
- GoalsTreeNode overdue count badges will update live as due dates are set

## Self-Check: PASSED

All 9 files verified present. All 3 commits verified in git log.

---
*Phase: 28-due-dates-daily-planning*
*Completed: 2026-04-04*
