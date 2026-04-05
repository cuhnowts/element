# Phase 27: Hub Calendar View - Research

**Researched:** 2026-04-03
**Domain:** React time-grid calendar UI (custom Tailwind, no third-party calendar lib)
**Confidence:** HIGH

## Summary

Phase 27 replaces the `CalendarPlaceholder` in the hub's right column with a fully custom time-grid calendar view. The decision to use a custom Tailwind time-grid (not react-big-calendar or FullCalendar) was locked during v1.5 research and recorded in STATE.md. The only new npm dependency is date-fns, which is already installed (v4.1.0, transitive via react-day-picker).

All data sources exist: `calendarSlice` provides external calendar events, `schedulingSlice` provides AI work blocks, and `api.getWorkHours()` provides the grid's time range. The main work is building the visual time-grid layout, event block rendering with overlap handling, day/week toggle, date navigation, now-line, and MiniCalendar coordination. A detailed UI-SPEC already exists at `27-UI-SPEC.md` with pixel-level specifications.

**Primary recommendation:** Build 7 custom components (CalendarHeader, CalendarDayGrid, CalendarWeekGrid, CalendarEventBlock, AllDayBanner, NowLine, OverflowIndicator) composed into a single HubCalendar container that replaces CalendarPlaceholder. Use pure CSS grid + absolute positioning for event layout -- no external calendar library.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Time range driven by user's WorkHoursConfig (start_time/end_time), not hardcoded. Events outside working hours get a collapsed overflow indicator.
- D-02: 30-minute slot granularity. Events render at pixel-accurate positions within slots.
- D-03: All-day events render as horizontal banners pinned above the time grid (Google Calendar pattern).
- D-04: Default to day view on hub load.
- D-05: Week view shows work week (Mon-Fri) by default, configurable by user in settings.
- D-06: Segmented control (Day | Week) in the calendar panel header bar, next to the date.
- D-07: External meetings use solid fill with calendar account color (CALENDAR_COLORS). AI work blocks use lighter opacity/fill with primary accent color (indigo).
- D-08: Each block shows title + time range. Location, attendees, and other metadata available on hover tooltip.
- D-09: Overlapping events render side-by-side, splitting column width (Google Calendar pattern). Max 4 columns; 5+ show "+N more" badge.
- D-10: Clicking a work block navigates to the associated task's detail view.
- D-11: Clicking an external meeting shows a tooltip/popover with meeting details.
- D-12: Red/accent horizontal "now line" at current time, auto-scrolls into view on load.
- D-13: Date navigation via `< [Today] >` arrows. Left/right moves by day or week depending on view.
- D-14: Sidebar MiniCalendar date click navigates the hub calendar grid to that date.
- D-15: No drag-to-create or drag-to-move in this phase -- view only.

### Claude's Discretion
- Exact pixel heights per 30-min slot (UI-SPEC specifies 24px per 30-min = 48px/hour)
- Overflow indicator design for events outside working hours
- Tooltip/popover styling for meeting details
- Week column minimum width and responsive behavior
- Scroll position management details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-01 | Hub right column shows a day view with time slots, meetings, and work blocks | CalendarDayGrid component reads calendarSlice.calendarEvents + schedulingSlice.todaySchedule; WorkHoursConfig drives slot range |
| VIEW-02 | User can switch between day and week view | Segmented control in CalendarHeader toggles hubViewMode state; CalendarWeekGrid renders 5-column layout |
| VIEW-03 | AI-scheduled work blocks appear alongside external calendar events | Both data sources merge into unified event list; distinct visual styles per D-07 |
| VIEW-04 | Clicking a work block navigates to the associated task | ScheduleBlock.taskId used with selectTask + setActiveView('task') -- existing navigation pattern |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.4 | UI framework | Already in project |
| Zustand | ^5.0.11 | State management | Already in project, all state goes through slices |
| date-fns | 4.1.0 | Date math (addDays, startOfWeek, format, etc.) | Already installed (via react-day-picker). STATE.md locks "only 1 new npm dep (date-fns)" |
| Tailwind CSS | (via @tailwindcss/vite) | Styling | Already in project, all styling is Tailwind |
| shadcn/ui | existing | ScrollArea, Button, Tooltip, Popover, Skeleton, Badge, Separator | Already registered |
| lucide-react | existing | Icons (ChevronLeft, ChevronRight, Clock, etc.) | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tauri-apps/api | existing | Tauri event listener for "calendar-synced" | Real-time refresh when calendar syncs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom time-grid | react-big-calendar / FullCalendar | REJECTED -- locked decision in STATE.md. Custom Tailwind grid gives full control over styling, smaller bundle, no dependency conflicts |
| date-fns | dayjs | date-fns already installed, tree-shakeable, no reason to switch |

**Installation:**
```bash
# No installation needed -- all dependencies already present
# date-fns 4.1.0 already installed as transitive dep of react-day-picker
```

**Version verification:** date-fns 4.1.0 confirmed via `npm ls date-fns`. React 19.2.4, Zustand 5.0.11 confirmed in package.json.

## Architecture Patterns

### Recommended Component Structure
```
src/components/hub/calendar/
  HubCalendar.tsx            # Main container, replaces CalendarPlaceholder
  CalendarHeader.tsx          # Date nav, today button, day/week toggle
  CalendarDayGrid.tsx         # Single-day time grid
  CalendarWeekGrid.tsx        # 5-column work-week grid
  CalendarEventBlock.tsx      # Single event block (meeting or work block)
  AllDayBanner.tsx            # Horizontal strip for all-day events
  NowLine.tsx                 # Current time indicator
  OverflowIndicator.tsx       # Collapsed section for events outside work hours
  useCalendarEvents.ts        # Hook: merges calendar events + schedule blocks for a date range
  useNowLine.ts               # Hook: current time position, 60s interval
  calendarLayout.ts           # Pure functions: overlap detection, column assignment, pixel positioning
  calendarLayout.test.ts      # Unit tests for layout math
```

### Pattern 1: Pixel-Accurate Event Positioning
**What:** Convert event start/end times to absolute pixel positions within the grid container.
**When to use:** Every event block placement.
**Example:**
```typescript
// calendarLayout.ts
const SLOT_HEIGHT = 24; // px per 30 minutes
const MINUTES_PER_SLOT = 30;

export function timeToPixelOffset(
  time: string, // "HH:mm" or ISO string
  gridStartHour: number // from WorkHoursConfig
): number {
  const [h, m] = parseTime(time);
  const minutesFromStart = (h - gridStartHour) * 60 + m;
  return (minutesFromStart / MINUTES_PER_SLOT) * SLOT_HEIGHT;
}

export function eventHeight(startTime: string, endTime: string): number {
  const startMinutes = parseMinutes(startTime);
  const endMinutes = parseMinutes(endTime);
  const durationMinutes = endMinutes - startMinutes;
  return Math.max(20, (durationMinutes / MINUTES_PER_SLOT) * SLOT_HEIGHT);
}
```

### Pattern 2: Overlap Column Assignment (Google Calendar Algorithm)
**What:** When events overlap in time, assign each to a "column" so they render side by side.
**When to use:** Before rendering events in the day/week grid.
**Example:**
```typescript
// calendarLayout.ts
interface PositionedEvent {
  event: MergedEvent;
  column: number;    // 0-based column index
  totalColumns: number; // total columns in this overlap group
}

export function assignOverlapColumns(events: MergedEvent[]): PositionedEvent[] {
  // Sort by start time, then by duration (longer first)
  const sorted = [...events].sort((a, b) => {
    const diff = a.startMinutes - b.startMinutes;
    return diff !== 0 ? diff : (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });

  const columns: MergedEvent[][] = [];

  for (const event of sorted) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const lastInCol = columns[col][columns[col].length - 1];
      if (lastInCol.endMinutes <= event.startMinutes) {
        columns[col].push(event);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([event]);
    }
  }

  // Cap at 4 visible columns per D-09
  // Events in column 4+ get "+N more" badge treatment
  // ...
}
```

### Pattern 3: Unified Event Model
**What:** Merge CalendarEvent (external) and ScheduleBlock (AI) into a common type for rendering.
**When to use:** In the useCalendarEvents hook before passing to grid components.
**Example:**
```typescript
// useCalendarEvents.ts
export type MergedEvent = {
  id: string;
  type: "meeting" | "work" | "buffer";
  title: string;
  startTime: string; // ISO for meetings, "HH:mm" for blocks -- normalize to minutes
  endTime: string;
  allDay: boolean;
  // Meeting-specific
  accountId?: string;
  location?: string | null;
  attendees?: string[];
  status?: string;
  // Work-block-specific
  taskId?: string;
  taskPriority?: string;
  isConfirmed?: boolean;
};
```

### Pattern 4: Task Navigation (existing pattern)
**What:** Navigate to a task's detail view when clicking a work block.
**When to use:** Work block click handler (VIEW-04).
**Example:**
```typescript
// Existing pattern from TaskListItem.tsx and WorkflowList.tsx
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useStore } from "@/stores";

function handleWorkBlockClick(taskId: string) {
  useWorkspaceStore.getState().selectTask(taskId);
  useStore.getState().setActiveView('task');
}
```

### Pattern 5: Zustand State for Calendar Coordination
**What:** New hub calendar state to coordinate between CalendarHeader, grid, and MiniCalendar.
**When to use:** All calendar date/view changes.
**Example:**
```typescript
// New hubCalendarSlice or extend calendarSlice
interface HubCalendarState {
  hubSelectedDate: string;        // ISO date string "YYYY-MM-DD"
  hubViewMode: "day" | "week";
  setHubSelectedDate: (date: string) => void;
  setHubViewMode: (mode: "day" | "week") => void;
}
```
Note: Use string (not Date object) to avoid Zustand selector stability issues per project memory.

### Anti-Patterns to Avoid
- **Returning new object/array refs from Zustand selectors:** Per project memory (`feedback_zustand_selector_stability.md`), never return new object/array refs from selectors. Use constants or useMemo. The `useCalendarEvents` hook should memoize its merged event list.
- **Hardcoded time ranges:** D-01 explicitly requires WorkHoursConfig -- never hardcode 9-5.
- **Date objects in Zustand state:** Store ISO strings, not Date objects. Date objects cause reference instability on every render.
- **Using external calendar library:** STATE.md locks "Custom Tailwind time-grid for calendar view, not react-big-calendar or FullCalendar."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic | Manual date string manipulation | date-fns (addDays, startOfWeek, format, differenceInMinutes, etc.) | Timezone bugs, DST transitions, locale handling |
| Scroll management | Manual scrollTop calculations | ScrollArea from shadcn + ref.scrollIntoView | Consistent cross-platform scrollbar styling |
| Popovers | Manual absolute-positioned divs | shadcn Popover (Radix) | Focus trapping, keyboard dismiss, portal rendering |
| Tooltips | Manual hover state management | shadcn Tooltip (Radix) | Accessibility, delay, positioning |
| Segmented control | Custom radio group | Two shadcn Buttons with active/inactive styling (or Radix ToggleGroup) | Keyboard navigation, aria-selected |

**Key insight:** The time-grid layout IS custom (locked decision), but all chrome around it (buttons, popovers, scroll, tooltips) should use existing shadcn components.

## Common Pitfalls

### Pitfall 1: Zustand Selector Stability
**What goes wrong:** Creating new arrays/objects in Zustand selectors causes unnecessary re-renders, especially with the merged event list.
**Why it happens:** `useStore(s => s.events.filter(...))` returns a new array reference every time.
**How to avoid:** Use `useMemo` in the consuming component, or use Zustand's `useShallow` for object selectors. The `useCalendarEvents` hook should memoize output.
**Warning signs:** Calendar grid re-renders on every store update, not just when events change.

### Pitfall 2: Event Time Format Mismatch
**What goes wrong:** CalendarEvent uses ISO datetime strings (`startTime: "2026-04-03T09:00:00"`), but ScheduleBlock uses "HH:mm" format (`startTime: "09:00"`). Comparing or sorting them without normalization breaks layout.
**Why it happens:** Two different data sources with different time representations.
**How to avoid:** Normalize both to minutes-from-midnight in the merge step. Extract parsing into a shared utility.
**Warning signs:** Events rendering at wrong positions, work blocks clustered at midnight.

### Pitfall 3: Overlap Algorithm Edge Cases
**What goes wrong:** Naive overlap detection fails with events that partially overlap, adjacent events (end of one = start of next), or cascading overlaps where A overlaps B, B overlaps C, but A doesn't overlap C.
**Why it happens:** Overlap grouping requires a proper sweep-line or interval merging algorithm, not pairwise comparisons.
**How to avoid:** Sort events by start time, use a greedy column assignment (Google Calendar algorithm). Unit test with edge cases: zero-duration events, exactly adjacent events, 5+ simultaneous events.
**Warning signs:** Events rendering on top of each other, or unnecessary column splits.

### Pitfall 4: Now-Line Timer Leak
**What goes wrong:** setInterval for the now-line position update leaks if the component unmounts or the calendar panel is collapsed.
**Why it happens:** Missing cleanup in useEffect, or multiple intervals stacking.
**How to avoid:** Custom `useNowLine` hook with proper cleanup. Consider pausing when the panel is not visible.
**Warning signs:** Performance degradation over time, stale now-line position after panel collapse/expand.

### Pitfall 5: Week View Date Range Fetch
**What goes wrong:** Fetching events for a single day when in week view, or fetching the full month. Results in missing events or unnecessary load.
**Why it happens:** Not adjusting the fetch range when toggling between day and week view.
**How to avoid:** Compute fetch range based on view mode: single day for day view, Mon-Fri for week view. Trigger refetch when view mode or selected date changes.
**Warning signs:** Events missing on non-selected days in week view, or events appearing then disappearing.

### Pitfall 6: ScheduleBlock Only Has Today's Data
**What goes wrong:** `schedulingSlice.todaySchedule` only contains blocks for today. Week view or navigating to other days shows no work blocks.
**Why it happens:** The scheduling store was designed for the sidebar's "today's schedule" overlay.
**How to avoid:** For day view of today, `todaySchedule` works. For other dates or week view, either: (a) call `generateSchedule(date)` for each visible day, or (b) accept that work blocks only appear for today initially and expand in a later phase. The planner must decide the approach -- calling generateSchedule for 5 days may be slow. Recommend showing work blocks only for today's column in week view, with a visual indicator that other days' blocks require schedule generation.
**Warning signs:** Empty work block slots when navigating away from today.

## Code Examples

### Existing Navigation Pattern (verified from codebase)
```typescript
// From TaskListItem.tsx -- navigate to task detail
const selectTask = useWorkspaceStore((s) => s.selectTask);
// On click:
selectTask(task.id);
useStore.getState().setActiveView('task');
```

### Existing Calendar Event Fetch Pattern (verified from MiniCalendar.tsx)
```typescript
// Fetch events for a date range
const fetchCalendarEvents = useStore((s) => s.fetchCalendarEvents);
const start = new Date(year, month, 1);
const end = new Date(year, month + 1, 0, 23, 59, 59);
fetchCalendarEvents(start.toISOString(), end.toISOString());
```

### Existing Tauri Event Listener Pattern (verified from MiniCalendar.tsx)
```typescript
import { listen } from "@tauri-apps/api/event";

useEffect(() => {
  const unlisten = listen("calendar-synced", () => {
    fetchMonthEvents();
  });
  return () => {
    unlisten.then((fn) => fn());
  };
}, [fetchMonthEvents]);
```

### CALENDAR_COLORS (verified from MiniCalendar.tsx)
```typescript
const CALENDAR_COLORS = [
  "var(--chart-2)", // teal (Account 1)
  "var(--chart-4)", // amber (Account 2)
  "var(--chart-1)", // orange (Account 3)
  "var(--chart-5)", // gold (Account 4+)
];
```

### Work Block Indigo Color (verified from UI-SPEC)
```typescript
// AI work blocks
const WORK_BLOCK_COLOR = "oklch(0.585 0.156 272)"; // indigo
// Fill: 15% opacity
// Border: 1px solid at full opacity
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-big-calendar for all calendar views | Custom CSS grid/absolute positioning | Locked decision for this project | Full styling control, zero external calendar deps |
| Moment.js for date math | date-fns v4 (tree-shakeable, ESM-native) | date-fns v4 released 2024 | Smaller bundle, better types, already installed |
| Class components with lifecycle timers | useEffect + useRef for interval cleanup | React 16.8+ (hooks) | Cleaner timer management for now-line |

**Deprecated/outdated:**
- react-big-calendar: Still maintained but heavy, opinionated styling conflicts with Tailwind
- FullCalendar: Premium features require license, excessive for a read-only grid

## Open Questions

1. **Work blocks for non-today dates**
   - What we know: `schedulingSlice.todaySchedule` only has today's data. `generateSchedule(date)` can fetch other dates but may be slow.
   - What's unclear: Should week view show work blocks for all 5 days, or only today?
   - Recommendation: Show work blocks only for today. For other days in week view, show a subtle "No schedule" indicator. This avoids 5 API calls on every week view load. Can be enhanced in Phase 28-29 when scheduling interactions are added.

2. **MiniCalendar store coordination**
   - What we know: MiniCalendar has `onDateSelect` prop but currently manages date state locally.
   - What's unclear: Should the new `hubSelectedDate` state live in an existing slice or a new one?
   - Recommendation: Add `hubSelectedDate` and `hubViewMode` to `calendarSlice` since that slice already owns calendar-related state. Wire MiniCalendar's `onDateSelect` to `setHubSelectedDate`.

3. **CalendarEvent fetch frequency**
   - What we know: MiniCalendar fetches monthly ranges. Hub calendar needs day or week ranges.
   - What's unclear: Will the same `calendarEvents` state serve both, or do they need separate storage?
   - Recommendation: Share the same `calendarEvents` array. The hub calendar triggers `fetchCalendarEvents` with a tighter range (day or week). MiniCalendar's monthly fetch is a superset that also works. Whichever component fetches last wins, which is fine since the hub calendar is the primary consumer after load.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | vite.config.ts (test section) |
| Quick run command | `npx vitest run --reporter=verbose src/components/hub/calendar/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIEW-01 | Day view renders time slots with meetings and work blocks | unit | `npx vitest run src/components/hub/calendar/CalendarDayGrid.test.tsx -x` | Wave 0 |
| VIEW-02 | Toggle between day and week view | unit | `npx vitest run src/components/hub/calendar/CalendarHeader.test.tsx -x` | Wave 0 |
| VIEW-03 | Work blocks appear alongside meetings with distinct styling | unit | `npx vitest run src/components/hub/calendar/CalendarEventBlock.test.tsx -x` | Wave 0 |
| VIEW-04 | Work block click navigates to task detail | unit | `npx vitest run src/components/hub/calendar/CalendarEventBlock.test.tsx -x` | Wave 0 |
| LAYOUT | Overlap column assignment produces correct columns | unit | `npx vitest run src/components/hub/calendar/calendarLayout.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/components/hub/calendar/ --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/hub/calendar/calendarLayout.test.ts` -- unit tests for pixel positioning, overlap algorithm, time normalization
- [ ] `src/components/hub/calendar/CalendarDayGrid.test.tsx` -- renders slots, events at correct positions
- [ ] `src/components/hub/calendar/CalendarHeader.test.tsx` -- date nav, view toggle, today button
- [ ] `src/components/hub/calendar/CalendarEventBlock.test.tsx` -- meeting vs work block rendering, click behavior
- [ ] `src/components/hub/calendar/HubCalendar.test.tsx` -- integration: empty state, loading state, error state
- [ ] Update/remove `src/components/hub/__tests__/CalendarPlaceholder.test.tsx` -- replaced by new tests

## Sources

### Primary (HIGH confidence)
- Codebase inspection: HubView.tsx, CalendarPlaceholder.tsx, calendarSlice.ts, schedulingSlice.ts, MiniCalendar.tsx, uiSlice.ts, TaskListItem.tsx, ScheduleBlockOverlay.tsx -- all directly read
- 27-CONTEXT.md -- locked decisions from user discussion
- 27-UI-SPEC.md -- pixel-level visual contract
- STATE.md -- locked architectural decisions (custom Tailwind grid, date-fns only)

### Secondary (MEDIUM confidence)
- date-fns v4.1.0 API -- confirmed installed via `npm ls`, functions well-known from training data
- Google Calendar overlap algorithm -- well-documented pattern, multiple implementations available

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or locked decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all deps already installed, versions verified via npm
- Architecture: HIGH -- component structure follows existing patterns, all integration points verified in codebase
- Pitfalls: HIGH -- derived from direct code inspection (time format mismatch, selector stability from project memory)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- no external dependency changes expected)
