# Requirements: Element

**Defined:** 2026-04-03
**Core Value:** The AI agent must reliably orchestrate project work — planning, executing, and monitoring across all projects so the user focuses on decisions, not mechanics.

## v1.5 Requirements

Requirements for v1.5 Time Bounded milestone. Each maps to roadmap phases.

### Calendar Sync

- [ ] **CAL-01**: Google Calendar OAuth sync works reliably with token refresh and 410 handling
- [ ] **CAL-02**: Outlook Calendar OAuth sync works with correct timezone parsing
- [ ] **CAL-03**: Calendar events are wired to the scheduling engine for gap detection
- [ ] **CAL-04**: Calendar sync runs on a background interval with debounced refresh

### Calendar View

- [ ] **VIEW-01**: Hub right column shows a day view with time slots, meetings, and work blocks
- [ ] **VIEW-02**: User can switch between day and week view
- [ ] **VIEW-03**: AI-scheduled work blocks appear alongside external calendar events
- [ ] **VIEW-04**: Clicking a work block navigates to the associated task

### Due Dates

- [ ] **DUE-01**: User can set due dates on tasks and phases via a date picker
- [ ] **DUE-02**: Overdue and upcoming tasks are visually indicated in the goals tree and task views
- [ ] **DUE-03**: Backlog items (999.x phases) are exempt from due date enforcement and alerts

### Calendar MCP Tools

- [ ] **MCP-01**: MCP server exposes tools to read calendar events for a date range
- [ ] **MCP-02**: MCP server exposes tools to create/move work blocks on the calendar
- [ ] **MCP-03**: MCP server exposes tools to query available time slots

### Daily Planning

- [ ] **PLAN-01**: Bot presents a prioritized daily plan on hub load: tasks ranked by importance against available time
- [ ] **PLAN-02**: Bot asks "What should we work on today?" when there's more work than time
- [ ] **PLAN-03**: Bot suggests due dates for tasks without them through conversation
- [ ] **PLAN-04**: Bot can reschedule work when the user reports lost time or new priorities

### Heartbeat

- [ ] **BEAT-01**: Background process periodically evaluates deadline risk (remaining work vs remaining capacity)
- [ ] **BEAT-02**: Heartbeat prefers local LLM (Ollama) for summary, falls back to CLI tool
- [ ] **BEAT-03**: Deadline risks surface as notifications and briefing updates
- [ ] **BEAT-04**: Heartbeat respects backlog exemption — does not alert on 999.x items

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Calendar Enhancements

- **CAL-10**: Push events back to Google/Outlook (write to external calendar)
- **CAL-11**: Recurring event pattern handling in calendar view

### Hub Enhancements

- **HUB-10**: Urgency scoring algorithm (AI-driven priority beyond due dates)
- **HUB-11**: Email signal ingestion into daily briefing
- **HUB-12**: Chat history persistence across app restart (SQLite)

### Agent Enhancements

- **AGENT-10**: Agent learns user patterns and preferences over time (memory system)
- **AGENT-11**: Agent can orchestrate across external tools (GitHub, Jira, Slack) via plugins

### Platform

- **PLAT-01**: Windows support
- **PLAT-02**: Plugin marketplace with paid workflow plugins

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full autonomous rescheduling without confirmation | Users must approve schedule changes — auto-apply causes anxiety (Motion's #1 complaint) |
| LLM-generated schedules | LLM narrates algorithm output, does not generate schedules — unreliable for time math |
| External calendar write-back | Read-only for v1.5 — write-back deferred to avoid sync conflicts |
| Mobile push notifications | Desktop-only app, OS notifications sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (populated by roadmapper) | | |

**Coverage:**
- v1.5 requirements: 22 total
- Mapped to phases: 0
- Unmapped: 22

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after initial definition*
