---
phase: 27-hub-calendar-view
plan: 01
subsystem: ui
tags: [react, zustand, calendar, tdd, vitest, layout-math]

# Dependency graph
requires: []
provides:
  - MergedEvent type unifying CalendarEvent and ScheduleBlock
  - Pure layout math functions (timeToPixelOffset, eventHeight, assignOverlapColumns)
  - Hub calendar Zustand state (hubSelectedDate, hubViewMode)
  - useCalendarEvents hook merging calendar events and schedule blocks
  - useNowLine hook for current time pixel offset
affects: [27-02, 27-03, 27-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [greedy-column-overlap-algorithm, minutes-from-midnight-normalization, memoized-data-merge-hook]

key-files:
  created:
    - src/components/hub/calendar/calendarTypes.ts
    - src/components/hub/calendar/calendarLayout.ts
    - src/components/hub/calendar/calendarLayout.test.ts
    - src/components/hub/calendar/useCalendarEvents.ts
    - src/components/hub/calendar/useNowLine.ts
  modified:
    - src/stores/calendarSlice.ts

key-decisions:
  - "Store hubSelectedDate as ISO string (not Date) for Zustand selector stability"
  - "Union-find algorithm for overlap group detection in assignOverlapColumns"
  - "Cap totalColumns at MAX_OVERLAP_COLUMNS=4 but keep actual column assignments for all events"

patterns-established:
  - "Minutes-from-midnight normalization: all time values converted to number before layout math"
  - "Greedy column assignment with union-find grouping for overlap detection"
  - "Memoized hook pattern: useCalendarEvents returns stable refs via useMemo"

requirements-completed: [VIEW-01, VIEW-03]

# Metrics
duration: 3min
completed: 2026-04-04
---

# Phase 27 Plan 01: Calendar Data Foundation Summary

**TDD-verified layout math (16 tests), MergedEvent type, Zustand hub state, and data hooks for calendar grid rendering**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-04T12:30:30Z
- **Completed:** 2026-04-04T12:33:12Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- TDD-driven layout math with 16 passing tests covering pixel positioning, overlap algorithm, edge cases
- MergedEvent type unifies CalendarEvent (ISO datetimes) and ScheduleBlock (HH:mm) into a single renderable model
- Hub calendar Zustand state (hubSelectedDate, hubViewMode) ready for UI coordination with MiniCalendar
- useCalendarEvents hook merges both data sources with stable memoized references
- useNowLine hook provides current-time pixel offset with 60-second interval and proper cleanup

## Task Commits

Each task was committed atomically:

1. **Task 1: Types, constants, and layout math with TDD** - `d832b0b` (feat)
2. **Task 2: Hub calendar Zustand state and data hooks** - `d67a6c9` (feat)

## Files Created/Modified
- `src/components/hub/calendar/calendarTypes.ts` - MergedEvent, PositionedEvent types, 14 named constant exports
- `src/components/hub/calendar/calendarLayout.ts` - normalizeToMinutes, timeToPixelOffset, eventHeight, assignOverlapColumns
- `src/components/hub/calendar/calendarLayout.test.ts` - 16 unit tests for all layout math functions
- `src/components/hub/calendar/useCalendarEvents.ts` - Hook merging CalendarEvent + ScheduleBlock into MergedEvent[]
- `src/components/hub/calendar/useNowLine.ts` - Hook returning now-line pixel offset with 60s refresh
- `src/stores/calendarSlice.ts` - Extended with hubSelectedDate, hubViewMode, and setters

## Decisions Made
- Used string type for hubSelectedDate (not Date object) per project memory on Zustand selector stability
- Used union-find for overlap group detection rather than simpler pairwise scan (handles cascading overlaps correctly)
- Capped totalColumns at MAX_OVERLAP_COLUMNS=4 per D-09 while preserving actual column indices beyond 4

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All data types, layout math, state, and hooks are ready for UI component rendering (plans 02-04)
- CalendarDayGrid, CalendarWeekGrid, and CalendarEventBlock can import directly from these modules
- MiniCalendar coordination via hubSelectedDate is wired and ready

---
*Phase: 27-hub-calendar-view*
*Completed: 2026-04-04*
