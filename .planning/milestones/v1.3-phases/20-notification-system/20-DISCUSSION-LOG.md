# Phase 20: Notification System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 20-notification-system
**Areas discussed:** Notification center UI, Priority taxonomy & triggers, Notification persistence, Agent API surface

---

## Notification Center UI

### Where should the notification center live?

| Option | Description | Selected |
|--------|-------------|----------|
| Bell icon in titlebar | Bell + unread badge in top bar, dropdown popover for history. Discord/Slack/GitHub pattern. | ✓ |
| Dedicated sidebar section | Notification list as collapsible sidebar section. Persistent but takes space. | |
| Slide-out drawer | Full-height panel from right edge. More room but heavier interaction. | |

**User's choice:** Bell icon in titlebar
**Notes:** User confirmed the ASCII mockup showing bell + badge in titlebar with dropdown popover.

### Should notifications be actionable?

| Option | Description | Selected |
|--------|-------------|----------|
| Deep-link navigation | Click navigates to relevant project/phase/task | ✓ |
| Dismiss-only | Informational only, read and dismiss | |
| You decide | Claude picks | |

**User's choice:** Deep-link navigation

### Bulk actions in dropdown?

| Option | Description | Selected |
|--------|-------------|----------|
| Mark-all-read + clear | Standard actions at top of popover | ✓ |
| Individual dismiss only | Per-notification buttons only | |
| You decide | Claude picks | |

**User's choice:** Yes, mark-all-read + clear

### Filter/tabs or flat list?

| Option | Description | Selected |
|--------|-------------|----------|
| Flat chronological list | Reverse-chronological with priority badges. Lightweight. | ✓ |
| Tabbed by priority | Critical / All tabs. More complex. | |
| You decide | Claude picks | |

**User's choice:** Flat chronological list

---

## Priority Taxonomy & Triggers

### How should priority tiers map to notification channels?

| Option | Description | Selected |
|--------|-------------|----------|
| Critical = OS + in-app | Critical: OS-native + toast + history. Informational: toast + history. Silent: history only. | ✓ |
| All tiers get OS notifications | Every notification triggers OS-native. Only badge differs. | |
| You decide | Claude picks | |

**User's choice:** Critical = OS + in-app (tiered channel mapping)

### Wire real triggers now or API only?

| Option | Description | Selected |
|--------|-------------|----------|
| API only, agent triggers later | Build pipeline with test triggers. Phase 21 wires real events. Per NOTIF-03. | ✓ |
| Wire existing events now | Connect workflow/sync events now. Immediate value but overlaps Phase 21. | |
| You decide | Claude picks | |

**User's choice:** API only, agent triggers later

### User notification preferences?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer preferences | Ship with defaults. Preferences are future enhancement. | ✓ |
| Basic toggle in settings | Simple on/off for OS notifications. | |
| You decide | Claude picks | |

**User's choice:** Defer preferences to later

---

## Notification Persistence

### Where should history be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite table | New `notifications` table in element.db. Survives restarts, queryable, local-first. | ✓ |
| Zustand only (in-memory) | Lost on restart. Simpler but no cross-session history. | |
| You decide | Claude picks | |

**User's choice:** SQLite table
**Notes:** User confirmed the schema preview (id, title, body, priority, category, project_id, action_url, read, created_at).

### How much history to retain?

| Option | Description | Selected |
|--------|-------------|----------|
| Last 100 notifications | Cap at 100, auto-prune oldest | ✓ |
| Time-based (30 days) | Keep all within 30 days | |
| No limit | Keep everything, manual clear | |
| You decide | Claude picks | |

**User's choice:** Last 100 notifications

---

## Agent API Surface

### How should the notification system be invoked internally?

| Option | Description | Selected |
|--------|-------------|----------|
| Tauri event bus | Backend emits typed events (`notification:create`). Decoupled. Consistent with existing patterns. | ✓ |
| Direct Rust commands | Agent calls `create_notification` directly. Tighter coupling. | |
| You decide | Claude picks | |

**User's choice:** Tauri event bus
**Notes:** User confirmed the code preview showing `app.emit("notification:create", NotificationPayload {...})` pattern.

### Frontend-originated notifications?

| Option | Description | Selected |
|--------|-------------|----------|
| Both: events + Rust commands | Backend uses events, frontend can also invoke Rust command. | ✓ |
| Backend events only | Only backend creates notifications. Frontend listens only. | |
| You decide | Claude picks | |

**User's choice:** Both: events + Rust commands

### Notification coalescing?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer coalescing | Individual notifications for v1. Add grouping later if needed. | ✓ |
| Basic coalescing by category | Group same-category within time window. | |
| You decide | Claude picks | |

**User's choice:** Defer coalescing

---

## Claude's Discretion

- OS notification permission handling
- Popover dimensions and scroll behavior
- Notification ID generation strategy
- Sonner toast duration
- Internal event payload struct naming

## Deferred Ideas

- Notification preferences UI (mute/disable) — future phase
- Coalescing/grouping — future enhancement
- Priority filter/tabs in popover — future enhancement
