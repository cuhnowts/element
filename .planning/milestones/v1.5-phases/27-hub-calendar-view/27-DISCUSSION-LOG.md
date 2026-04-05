# Phase 27: Hub Calendar View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 27-hub-calendar-view
**Areas discussed:** Time-grid layout, Day/week toggle, Event rendering, Interaction & navigation

---

## Time-Grid Layout

### Time Range

| Option | Description | Selected |
|--------|-------------|----------|
| Working hours (8am-6pm) | Compact view focused on workday with overflow indicator | |
| Full day (6am-10pm) | Shows early morning and evening, more scrolling | |
| 24-hour | Full 24h, always scrollable | |

**User's choice:** User-defined working hours from settings (WorkHoursConfig)
**Notes:** User clarified that the time range should be driven by the working hours already configured in settings, not a hardcoded range.

### Slot Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| 30-minute slots | Standard calendar density, most events on 30-min boundaries | ✓ |
| 15-minute slots | Higher precision, more rows | |
| 1-hour slots | Very compact, sub-hour events share rows | |

**User's choice:** 30-minute slots
**Notes:** None

### All-Day Events

| Option | Description | Selected |
|--------|-------------|----------|
| Banner above the grid | Horizontal banners pinned above time slots (Google Calendar pattern) | ✓ |
| Full-height block in grid | Tall block spanning entire visible time range | |
| You decide | Claude's discretion | |

**User's choice:** Banner above the grid
**Notes:** None

---

## Day/Week Toggle

### Default View

| Option | Description | Selected |
|--------|-------------|----------|
| Day view | Hub is a daily dashboard, matches "what's on today" intent | ✓ |
| Week view | Full week context upfront | |
| Remember last used | Persist last choice across sessions | |

**User's choice:** Day view
**Notes:** None

### Week Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Work week (Mon-Fri) | 5-day grid aligned to working hours | ✓ (default) |
| Full week (Sun-Sat or Mon-Sun) | 7-day grid, shows weekend events | |
| You decide | Claude picks based on available space | |

**User's choice:** Week as decided by user. Work week by default.
**Notes:** User wants this to be configurable in settings, with work week (Mon-Fri) as the default.

### Toggle UI

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented control in header | Small Day/Week toggle next to the date | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Segmented control in header
**Notes:** None

---

## Event Rendering

### Visual Distinction

| Option | Description | Selected |
|--------|-------------|----------|
| Color coding | Solid fill for meetings (account colors), lighter opacity for work blocks (primary accent) | ✓ |
| Icon + color | Both colored, meetings show calendar icon, work blocks show task icon | |
| You decide | Claude's discretion | |

**User's choice:** Color coding
**Notes:** User selected the preview showing solid teal/amber for meetings and lighter indigo for work blocks.

### Block Info

| Option | Description | Selected |
|--------|-------------|----------|
| Title + time range | Title and start-end time, metadata on hover | ✓ |
| Title + time + metadata | Title, time, and one line of metadata visible | |
| You decide | Claude picks based on block height | |

**User's choice:** Title + time range
**Notes:** None

### Overlap Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side columns | Overlapping events split column width (Google Calendar pattern) | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Side-by-side columns
**Notes:** None

---

## Interaction & Navigation

### Click Action

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to task detail | Work block click opens associated task in center panel | ✓ |
| Popover first, then navigate | Click shows popover with "Go to task" button | |

**User's choice:** Navigate to task detail
**Notes:** Meetings show tooltip/popover since they have no internal navigation target.

### Now Line

| Option | Description | Selected |
|--------|-------------|----------|
| Red line at current time | Horizontal red/accent line, auto-scrolls on load | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Red line at current time
**Notes:** None

### Date Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Arrows + Today button in header | < [Today] > in header, MiniCalendar click also navigates | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Arrows + Today button in header
**Notes:** None

### Drag Support

| Option | Description | Selected |
|--------|-------------|----------|
| No drag — view only | View only this phase, interaction in Phase 28-29 | ✓ |
| Basic drag-to-move | Allow moving work blocks by dragging | |

**User's choice:** No drag — view only
**Notes:** None

---

## Claude's Discretion

- Exact pixel heights per 30-min slot
- Overflow indicator design for events outside working hours
- Tooltip/popover styling for meeting details
- Week column minimum width and responsive behavior
- Scroll position management details

## Deferred Ideas

None — discussion stayed within phase scope
