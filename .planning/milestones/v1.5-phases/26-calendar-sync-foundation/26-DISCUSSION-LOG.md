# Phase 26: Calendar Sync Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 26-calendar-sync-foundation
**Areas discussed:** OAuth error recovery, Sync interval & triggers, Sync failure UX, Scheduler wiring scope

---

## OAuth Error Recovery

### Token refresh failure response

| Option | Description | Selected |
|--------|-------------|----------|
| Silent disable + badge | Mark account as sync-disabled, show warning badge on calendar settings icon. User clicks to see "Reconnect" button. No popup. | ✓ |
| Notification prompt | Send system notification saying "Calendar disconnected -- click to reconnect." More visible but potentially annoying. | |
| Inline banner in Hub | Show dismissible warning banner at top of Hub. Very visible, can't be missed. | |

**User's choice:** Silent disable + badge
**Notes:** Non-intrusive approach preferred

### Placeholder OAuth client ID detection

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, block with setup guide | If client ID is placeholder string, show error explaining how to register OAuth app and set env var. | ✓ |
| No, let it fail naturally | Attempt OAuth flow anyway, get generic error from Google/Microsoft. | |
| You decide | Claude picks approach. | |

**User's choice:** Yes, block with setup guide
**Notes:** Prevents confusing downstream failures

### Google 410 Gone handling

| Option | Description | Selected |
|--------|-------------|----------|
| Auto full re-sync | Clear stored sync token and silently retry as full sync. Transparent to user. | ✓ |
| Notify then re-sync | Show brief notification that full re-sync is happening, then proceed. | |

**User's choice:** Auto full re-sync
**Notes:** None

---

## Sync Interval & Triggers

### Background sync interval

| Option | Description | Selected |
|--------|-------------|----------|
| 15 minutes | Balance between freshness and API quota. Research recommended. | ✓ |
| 5 minutes | Near-real-time. Higher API usage but within limits. | |
| 30 minutes | Conservative. Events could appear up to 30 min late. | |

**User's choice:** 15 minutes
**Notes:** None

### Additional sync triggers

| Option | Description | Selected |
|--------|-------------|----------|
| App launch | Sync all calendars when app starts. | ✓ |
| Manual refresh button | User can click sync button in calendar settings. | ✓ |
| Hub open / tab focus | Sync when user navigates to Hub. | ✓ |
| After OAuth reconnect | Auto-sync after re-authenticating a broken connection. | ✓ |

**User's choice:** All four selected
**Notes:** None

### Timer configurability

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed at 15 min | Simpler, no settings UI needed. | ✓ |
| Configurable | Add dropdown in settings (5/15/30 min). | |

**User's choice:** Fixed at 15 min
**Notes:** None

---

## Sync Failure UX

### Transient failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Silent retry + log | Log error, retry next interval. No user indicator for transient errors. | ✓ |
| Badge after N failures | Silent for first 2-3 failures, then show warning badge. | |
| Always notify | Notification on every sync failure. | |

**User's choice:** Silent retry + log
**Notes:** None

### Deleted/cancelled event handling

| Option | Description | Selected |
|--------|-------------|----------|
| Hard delete | Remove cancelled events from calendar_events table. Simpler queries. | ✓ |
| Soft delete with status | Keep row with 'cancelled' status. Audit trail but complicates queries. | |
| You decide | Claude picks based on codebase patterns. | |

**User's choice:** Hard delete
**Notes:** None

---

## Scheduler Wiring Scope

### Integration depth

| Option | Description | Selected |
|--------|-------------|----------|
| Just wire the data | Fix empty vec at scheduling_commands.rs:97 to query calendar_events. No UI changes. | ✓ |
| Wire + meeting blocks | Also generate Meeting-type ScheduleBlocks from calendar events. | |
| Wire + daily briefing | Wire data AND update AI briefing to mention calendar conflicts. | |

**User's choice:** Just wire the data
**Notes:** Minimal scope -- downstream phases handle UI and briefing

### list_calendar_events query

| Option | Description | Selected |
|--------|-------------|----------|
| Already exists -- move on | Existing command at calendar_commands.rs:488-495 is sufficient for Phase 27. | ✓ |
| Verify and improve it | Read implementation to check edge cases for Phase 27's needs. | |

**User's choice:** Already exists -- move on
**Notes:** None

---

## Claude's Discretion

- Background timer implementation details (tokio pattern)
- Specific OAuth error code detection
- Outlook timezone header strategy
- Hub-open sync debouncing logic

## Deferred Ideas

None -- discussion stayed within phase scope
