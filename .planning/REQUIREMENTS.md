# Requirements: Element

**Defined:** 2026-04-04
**Core Value:** The AI agent must reliably orchestrate project work -- planning, executing, and monitoring across all projects so the user focuses on decisions, not mechanics.

## v1.6 Requirements

Requirements for v1.6 Clarity milestone. Each maps to roadmap phases.

### Hub Layout

- [x] **HUB-01**: User sees a single full-width center view when opening the hub (no horizontal scroll)
- [x] **HUB-02**: User can toggle a goals slide-in panel from the hub toolbar
- [x] **HUB-03**: User can toggle a calendar slide-in panel from the hub toolbar
- [x] **HUB-04**: User can trigger a daily briefing from the hub center view (D-09: action button, not toolbar toggle)
- [x] **HUB-05**: Slide-in panels animate smoothly using CSS transforms (no layout jank)

### Briefing

- [x] **BRIEF-01**: User sees a "Generate Briefing" button instead of auto-generated briefing on hub load
- [x] **BRIEF-02**: Generated briefing displays structured sections (summary, deadlines, blockers, wins)
- [x] **BRIEF-03**: Briefing sections render as visually distinct cards with clear hierarchy
- [x] **BRIEF-04**: Briefing and hub chat are consolidated into one interface with shared context

### Project Detail

- [ ] **PROJ-01**: User sees the project goal prominently displayed as a hero card above phases
- [ ] **PROJ-02**: User can set and edit the project goal directly in the project detail UI
- [ ] **PROJ-03**: Project detail provides a streamlined workspace entry (goal → directory + AI terminal → work)

### Drawer

- [x] **DRAW-01**: User can click to toggle the bottom drawer between fully collapsed and expanded (~450px)
- [x] **DRAW-02**: Agent panel is accessible as an "Element AI" tab in the bottom drawer
- [x] **DRAW-03**: Right sidebar agent panel is removed from the app layout

### Bug Fixes

- [ ] **FIX-01**: Calendar week view shows "Today" label only on the actual current day
- [ ] **FIX-02**: Overdue tasks are detected deterministically (due_date < today and not complete) without LLM
- [ ] **FIX-03**: Workflows section can be fully minimized when not in use

## v1.5 Requirements (Complete)

### Calendar Sync

- [x] **CAL-01**: Google Calendar OAuth sync works reliably with token refresh and 410 handling
- [x] **CAL-02**: Outlook Calendar OAuth sync works with correct timezone parsing
- [x] **CAL-03**: Calendar events are wired to the scheduling engine for gap detection
- [x] **CAL-04**: Calendar sync runs on a background interval with debounced refresh

### Calendar View

- [x] **VIEW-01**: Hub right column shows a day view with time slots, meetings, and work blocks
- [x] **VIEW-02**: User can switch between day and week view
- [x] **VIEW-03**: AI-scheduled work blocks appear alongside external calendar events
- [x] **VIEW-04**: Clicking a work block navigates to the associated task

### Due Dates

- [x] **DUE-01**: User can set due dates on tasks and phases via a date picker
- [x] **DUE-02**: Overdue and upcoming tasks are visually indicated in the goals tree and task views
- [x] **DUE-03**: Backlog items (999.x phases) are exempt from due date enforcement and alerts

### Calendar MCP Tools

- [x] **MCP-01**: MCP server exposes tools to read calendar events for a date range
- [x] **MCP-02**: MCP server exposes tools to create/move work blocks on the calendar
- [x] **MCP-03**: MCP server exposes tools to query available time slots

### Daily Planning

- [x] **PLAN-01**: Bot presents a prioritized daily plan on hub load: tasks ranked by importance against available time
- [x] **PLAN-02**: Bot asks "What should we work on today?" when there's more work than time
- [x] **PLAN-03**: Bot suggests due dates for tasks without them through conversation
- [x] **PLAN-04**: Bot can reschedule work when the user reports lost time or new priorities

### Heartbeat

- [x] **BEAT-01**: Background process periodically evaluates deadline risk (remaining work vs remaining capacity)
- [x] **BEAT-02**: Heartbeat prefers local LLM (Ollama) for summary, falls back to CLI tool
- [x] **BEAT-03**: Deadline risks surface as notifications and briefing updates
- [x] **BEAT-04**: Heartbeat respects backlog exemption -- does not alert on 999.x items

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Calendar Enhancements

- **CAL-10**: Push events back to Google/Outlook (write to external calendar)
- **CAL-11**: Microsoft Graph as alternative calendar source (no OAuth needed)

### Intelligence

- **INT-01**: Hub urgency scoring -- AI-driven priority scoring for tasks and projects
- **INT-02**: Hub email signal ingestion -- email context fed into daily briefing
- **INT-03**: Memory system -- full context model that learns user preferences, habits, and patterns

### Platform

- **PLAT-01**: Windows support
- **PLAT-02**: Plugin marketplace with paid workflow plugins

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Drag-to-resize drawer | Click toggle is sufficient; drag adds complexity without value |
| Animation framework (framer-motion) | CSS transforms + tw-animate-css sufficient; 40KB+ overhead not justified |
| Full autonomous rescheduling without confirmation | Users must approve schedule changes |
| LLM-generated schedules | LLM narrates algorithm output, does not generate schedules |
| Full node-graph visual editor | Structured list covers 90% of use cases at 20% cost |
| Mobile app | Desktop-first, mobile notifications via existing channels |
| Real-time collaboration | Personal work OS, single-user focus |
| Built-in calendar/email clients | Ingest signals via plugins, don't replicate source apps |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DRAW-01 | Phase 31 | Complete |
| DRAW-02 | Phase 31 | Complete |
| DRAW-03 | Phase 31 | Complete |
| HUB-01 | Phase 32 | Complete |
| HUB-02 | Phase 32 | Complete |
| HUB-03 | Phase 32 | Complete |
| HUB-04 | Phase 32 | Complete |
| HUB-05 | Phase 32 | Complete |
| BRIEF-01 | Phase 33 | Complete |
| BRIEF-02 | Phase 33 | Complete |
| BRIEF-03 | Phase 33 | Complete |
| BRIEF-04 | Phase 33 | Complete |
| PROJ-01 | Phase 34 | Pending |
| PROJ-02 | Phase 34 | Pending |
| PROJ-03 | Phase 34 | Pending |
| FIX-01 | Phase 35 | Pending |
| FIX-02 | Phase 35 | Pending |
| FIX-03 | Phase 35 | Pending |

**Coverage:**
- v1.6 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after roadmap creation*
