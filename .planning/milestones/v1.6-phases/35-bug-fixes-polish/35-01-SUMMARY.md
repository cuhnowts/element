---
phase: 35-bug-fixes-polish
plan: 01
subsystem: ui
tags: [date-fns, calendar, zustand, collapsible, timezone]

# Dependency graph
requires:
  - phase: 32-hub-layout-overhaul
    provides: Hub calendar panel with CalendarWeekGrid and CalendarDayGrid
provides:
  - Timezone-safe calendar Today detection using date-fns format()
  - Audit confirmation that all overdue rendering is deterministic (no LLM)
  - Collapsible workflows sidebar section with persisted state
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use format(new Date(), 'yyyy-MM-dd') for local date strings, never toISOString().split('T')[0]"
    - "Collapsible sidebar sections use useWorkspaceStore boolean + Collapsible from @base-ui/react"

key-files:
  created:
    - src/__tests__/calendar-today.test.ts
    - src/__tests__/workflow-collapse.test.ts
  modified:
    - src/components/hub/calendar/CalendarWeekGrid.tsx
    - src/components/hub/calendar/CalendarDayGrid.tsx
    - src/stores/useWorkspaceStore.ts
    - src/components/sidebar/WorkflowList.tsx

key-decisions:
  - "FIX-02 audit: all overdue paths are deterministic (date-utils isOverdue, inline parseISO comparisons) -- no code changes needed"
  - "Workflows default collapsed per D-09 to reduce sidebar clutter"

patterns-established:
  - "Local date formatting: always use date-fns format() over Date.toISOString() for user-facing date comparisons"
  - "Sidebar section collapse: boolean in useWorkspaceStore with persist partialize, Collapsible wrapper in component"

requirements-completed: [FIX-01, FIX-02, FIX-03]

# Metrics
duration: 3min
completed: 2026-04-05
---

# Phase 35 Plan 01: Bug Fixes Summary

**Timezone-safe calendar Today highlight via date-fns format(), deterministic overdue audit (no changes needed), and collapsible workflows sidebar with persisted state**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-05T12:32:29Z
- **Completed:** 2026-04-05T12:35:10Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Fixed calendar Today label showing on wrong day near midnight in UTC+N timezones by replacing toISOString().split with date-fns format()
- Confirmed all overdue rendering paths (TodayTaskRow, SchedulingBadges, GoalsTreeNode, TimeGroupSection) use deterministic date comparison -- no LLM dependency
- Added collapsible workflows sidebar section with chevron toggle, defaulting collapsed, state persisted via Zustand persist middleware
- CalendarDayGrid now shows "No events" instead of "No events today" when viewing non-today dates

## Task Commits

Each task was committed atomically:

1. **Task 0: Create Wave 0 test stubs** - `e729813` (test)
2. **Task 1: Fix calendar Today label timezone bug and audit overdue detection** - `42629f1` (fix)
3. **Task 2: Add collapsible workflows section with persisted state** - `686ddcf` (feat)

## Files Created/Modified
- `src/__tests__/calendar-today.test.ts` - Wave 0 test stubs for timezone-safe today detection
- `src/__tests__/workflow-collapse.test.ts` - Wave 0 test stubs for workflow collapse state
- `src/components/hub/calendar/CalendarWeekGrid.tsx` - Replaced toISOString with format() for todayStr
- `src/components/hub/calendar/CalendarDayGrid.tsx` - Added format import, fixed isToday, conditional empty text
- `src/stores/useWorkspaceStore.ts` - Added workflowsCollapsed boolean with toggle and persist
- `src/components/sidebar/WorkflowList.tsx` - Wrapped in Collapsible with chevron toggle

## Decisions Made
- FIX-02 overdue audit: all rendering paths are deterministic (isOverdue from date-utils, inline parseISO comparisons in TodayTaskRow). No code changes needed -- existing implementation satisfies the requirement.
- Workflows default collapsed per D-09 to reduce sidebar visual clutter when workflows are not actively used.
- Did NOT modify Sidebar.tsx -- the existing max-h-[200px] wrapper naturally accommodates the collapsible shrink behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all implementations are fully wired with no placeholder data.

## Next Phase Readiness
- Calendar timezone fix is complete and tested
- Overdue detection audit confirms no further work needed
- Workflows collapse feature is complete with persistence
- Ready for remaining v1.6 phases (briefing, project detail, drawer consolidation)

## Self-Check: PASSED

All 7 files verified present. All 3 task commits verified in git log.

---
*Phase: 35-bug-fixes-polish*
*Completed: 2026-04-05*
