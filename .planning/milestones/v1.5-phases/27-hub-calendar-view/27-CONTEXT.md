# Phase 27: Hub Calendar View - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the CalendarPlaceholder in the hub's right column with a real time-grid calendar view showing external calendar meetings and AI-scheduled work blocks in one unified view. Day and week views with a toggle. View-only — no drag/create interactions.

</domain>

<decisions>
## Implementation Decisions

### Time-Grid Layout
- **D-01:** Time range driven by user's WorkHoursConfig from settings (start_time/end_time) — not hardcoded. Events outside working hours get a collapsed overflow indicator.
- **D-02:** 30-minute slot granularity. Events render at pixel-accurate positions within slots.
- **D-03:** All-day events render as horizontal banners pinned above the time grid (Google Calendar pattern).

### Day/Week Toggle
- **D-04:** Default to day view on hub load — matches the daily dashboard intent.
- **D-05:** Week view shows work week (Mon-Fri) by default, configurable by user in settings.
- **D-06:** Segmented control (Day | Week) in the calendar panel header bar, next to the date.

### Event Rendering
- **D-07:** External meetings use solid fill with calendar account color (existing CALENDAR_COLORS). AI work blocks use lighter opacity/fill with the primary accent color (indigo). Visually distinct at a glance.
- **D-08:** Each block shows title + time range. Location, attendees, and other metadata available on hover tooltip.
- **D-09:** Overlapping events render side-by-side, splitting column width (Google Calendar pattern).

### Interaction & Navigation
- **D-10:** Clicking a work block navigates to the associated task's detail view (satisfies VIEW-04).
- **D-11:** Clicking an external meeting shows a tooltip/popover with meeting details (no navigation target — external events).
- **D-12:** Red/accent horizontal "now line" at current time, auto-scrolls into view on load.
- **D-13:** Date navigation via `< [Today] >` arrows in the calendar panel header. Left/right moves by day or week depending on current view.
- **D-14:** Sidebar MiniCalendar date click also navigates the hub calendar grid to that date.
- **D-15:** No drag-to-create or drag-to-move in this phase — view only. Interaction belongs in Phase 28-29.

### Claude's Discretion
- Exact pixel heights per 30-min slot
- Overflow indicator design for events outside working hours
- Tooltip/popover styling for meeting details
- Week column minimum width and responsive behavior
- Scroll position management details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Hub Layout
- `src/components/center/HubView.tsx` — 3-column resizable layout, calendar is the right panel (CALENDAR_PANEL_ID)
- `src/components/hub/CalendarPlaceholder.tsx` — The placeholder this phase replaces
- `src/components/hub/MinimizedColumn.tsx` — Column collapse/expand ribbons

### Calendar Data
- `src/stores/calendarSlice.ts` — Zustand store with fetchCalendarEvents(start, end), calendarAccounts, calendarEvents
- `src/lib/types.ts` §171-183 — CalendarEvent interface (id, accountId, title, startTime, endTime, allDay, attendees, location, status)
- `src/stores/schedulingSlice.ts` — todaySchedule (work blocks), generateSchedule, applySchedule

### Existing Calendar UI
- `src/components/sidebar/MiniCalendar.tsx` — Mini calendar with event dots, account color mapping, month navigation, Tauri event listener for "calendar-synced"
- `src/components/sidebar/CalendarScheduleOverlay.tsx` — Schedule block list rendering below mini calendar
- `src/components/ui/calendar.tsx` — shadcn calendar component

### Settings & Configuration
- `src/lib/tauri.ts` §159-161 — getWorkHours/saveWorkHours Tauri commands
- `src-tauri/src/scheduling/time_blocks.rs` §16 — WorkHoursConfig struct (start_time, end_time)
- `src/components/settings/ScheduleSettings.tsx` — Work hours settings UI

### Design System
- `src/components/sidebar/MiniCalendar.tsx` §7-12 — CALENDAR_COLORS array (chart-2 teal, chart-4 amber, chart-1 orange, chart-5 gold)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CalendarSlice` (calendarSlice.ts): Full Zustand store for fetching events by date range — reuse directly
- `schedulingSlice.ts`: todaySchedule array of ScheduleBlock — reuse for work block data
- `CALENDAR_COLORS` (MiniCalendar.tsx): Account color mapping — reuse for meeting block colors
- `WorkHoursConfig`: Already in Rust backend with Tauri commands — read for grid time range
- shadcn/ui ScrollArea, Skeleton, Button components — reuse for calendar chrome
- `"calendar-synced"` Tauri event — listen for real-time refresh like MiniCalendar does

### Established Patterns
- Zustand with selectors for all state access (avoid returning new object/array refs)
- shadcn/ui + Tailwind CSS for all UI components
- Tauri invoke for all backend calls via `src/lib/tauri.ts` api object
- ResizablePanel for column layout (already set up in HubView)
- lucide-react for icons

### Integration Points
- Replace `CalendarPlaceholder` import in `HubView.tsx` with new calendar component
- Read from `calendarSlice` (events) and `schedulingSlice` (work blocks)
- Read `WorkHoursConfig` via `api.getWorkHours()` for grid range
- MiniCalendar date selection should drive the hub calendar's displayed date (new coordination via store)
- Work block click navigates via existing workspace store navigation patterns

</code_context>

<specifics>
## Specific Ideas

- Grid should feel like Google Calendar's time grid — familiar, not novel
- Work blocks should be clearly "ours" (lighter, accent-colored) vs meetings which are "theirs" (solid, account-colored)
- The view is a daily dashboard first — day view is the primary experience, week is secondary context

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-hub-calendar-view*
*Context gathered: 2026-04-03*
