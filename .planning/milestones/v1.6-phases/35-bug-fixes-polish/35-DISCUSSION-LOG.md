# Phase 35: Bug Fixes & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 35-bug-fixes-polish
**Areas discussed:** Calendar "Today" label, Overdue detection approach, Workflows minimize behavior

---

## Calendar "Today" Label

| Option | Description | Selected |
|--------|-------------|----------|
| Column header label | There's a "Today" text label appearing on each day's column header in week view | |
| "No events today" text | The empty state says "No events today" even for non-today days | |
| CalendarHeader button | The "Today" nav button in the header bar behaves incorrectly in week view | |
| Other | User provided screenshot showing the calendar view | ✓ |

**User's choice:** Provided screenshot of calendar view showing the issue

| Option | Description | Selected |
|--------|-------------|----------|
| Wrong day highlighted | The blue circle / background highlight lands on the wrong day in week view | |
| Every day highlighted | All day columns in week view get the "today" styling instead of just one | ✓ |
| You decide | Audit where Today-related bugs exist | |

**User's choice:** Every day highlighted
**Notes:** All day columns in week view receive today styling (blue circle, bg-card background) instead of only the actual current day

---

## Overdue Detection Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Briefing is the source | Overdue items surfaced only through LLM-generated briefing text | |
| Heartbeat summary narration | LLM narrates risk summaries — overdue should bypass LLM entirely | |
| You decide | Audit where LLM touches overdue and replace all instances | |
| Other | User explained Phase 33 dependency | ✓ |

**User's choice:** This will be solved by an earlier phase — Phase 33's structured JSON briefing output will feed overdue detection deterministically
**Notes:** Phase 33 (Briefing Rework) introduces scored JSON structure that Phase 35 should consume for overdue detection

---

## Workflows Minimize Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible header (Recommended) | Clickable header with chevron toggle, localStorage persistence | ✓ |
| Remove entirely when empty | Don't show when no workflows exist | |
| You decide | Use whatever fits existing sidebar patterns | |

**User's choice:** Collapsible header with chevron toggle and localStorage persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsed by default | Start minimized — workflows secondary to themes/projects | ✓ |
| Expanded by default | Start open, only collapses when user minimizes | |
| You decide | Pick the best default | |

**User's choice:** Collapsed by default

---

## Claude's Discretion

- Exact timezone normalization strategy for isToday fix
- Whether to refactor shared date comparison utilities

## Deferred Ideas

None — discussion stayed within phase scope
