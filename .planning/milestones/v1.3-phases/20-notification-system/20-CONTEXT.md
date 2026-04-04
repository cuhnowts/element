# Phase 20: Notification System - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the full notification pipeline: OS-native desktop notifications for critical events, an in-app notification center with history and priority tiers, and an event-driven API that the Phase 21 central agent can invoke. Phase 20 builds the infrastructure; Phase 21 wires real event triggers through it.

</domain>

<decisions>
## Implementation Decisions

### Notification Center UI
- **D-01:** Bell icon with unread badge in the titlebar, clicking opens a dropdown/popover with notification history (reverse-chronological flat list)
- **D-02:** Notification items are actionable — clicking navigates to the relevant project/phase/task (deep-link navigation)
- **D-03:** Bulk actions at the top of the popover: "Mark all as read" and "Clear all"
- **D-04:** Flat chronological list with color-coded priority badges — no tabs or filters for v1

### Priority Taxonomy & Triggers
- **D-05:** Three tiers with channel mapping:
  - **Critical** = OS-native notification + in-app toast (Sonner) + history — for blocked phases, execution errors, verification needed
  - **Informational** = in-app toast + history — for phase completion, plan ready, sync complete
  - **Silent** = history only — for background task started, auto-execute skipped, routine state changes
- **D-06:** Phase 20 builds the notification API with test/demo triggers only. Real event wiring deferred to Phase 21 agent per NOTIF-03
- **D-07:** User notification preferences (muting, disabling OS notifications) deferred to a future phase

### Notification Persistence
- **D-08:** SQLite `notifications` table in existing element.db — columns: id, title, body, priority, category, project_id, action_url, read, created_at
- **D-09:** Cap at 100 notifications, auto-prune oldest when limit hit
- **D-10:** Zustand slice caches active notification set in memory, SQLite is source of truth

### Agent API Surface
- **D-11:** Primary invocation via Tauri event bus — backend components emit `notification:create` events with typed `NotificationPayload` struct
- **D-12:** Frontend also has access via `invoke('create_notification', ...)` Rust command for UI-originated notifications
- **D-13:** Rust command handles persistence (SQLite write) regardless of notification source (event or invoke)
- **D-14:** Notification coalescing/grouping deferred — individual notifications for v1

### Claude's Discretion
- OS notification permission handling (request at startup, fallback to in-app-only if denied)
- Exact popover dimensions and scroll behavior
- Notification ID generation strategy (UUID vs incremental)
- Sonner toast duration for informational notifications
- Internal event payload struct field naming

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research Documents
- `.planning/research/ARCHITECTURE.md` — Notification bridge architecture, Rust-side notification flow, event system design
- `.planning/research/STACK.md` — `tauri-plugin-notification 2.x` evaluation, permission handling, tier-to-channel mapping
- `.planning/research/FEATURES.md` — Notification feature spec, dependency graph, notification + action context pattern
- `.planning/research/SUMMARY.md` — Research synthesis including notification phase scope and dependencies

### Requirements
- `.planning/REQUIREMENTS.md` — NOTIF-01, NOTIF-02, NOTIF-03 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/sonner.tsx`: Sonner toast component already configured with theme-aware styling and icon variants (success/info/warning/error/loading) — use for informational in-app toasts
- `src/hooks/useTauriEvents.ts`: Existing Tauri event listener hook — extend pattern for notification events
- shadcn/ui popover component available for the bell dropdown

### Established Patterns
- Tauri event system (`app.emit()` on Rust side, `listen()` on frontend) for backend-to-frontend communication
- Zustand slices for frontend state management
- SQLite via Tauri commands for persistence (existing pattern in element.db)
- shadcn/ui components with Tailwind CSS for all UI

### Integration Points
- Titlebar area: bell icon + badge needs to be added to the app's top bar
- `src-tauri/Cargo.toml`: add `tauri-plugin-notification` dependency
- `src-tauri/src/lib.rs`: register notification plugin in Tauri setup
- Existing database module: add notifications table migration
- Zustand store: add `notificationSlice` alongside existing slices

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The preview mockup showing bell icon with badge count in the titlebar was confirmed as the desired layout.

</specifics>

<deferred>
## Deferred Ideas

- Notification preferences UI (mute tiers, disable OS notifications) — future phase
- Notification coalescing/grouping — future enhancement if agent gets chatty
- Filter/tab by priority tier in the popover — future enhancement

</deferred>

---

*Phase: 20-notification-system*
*Context gathered: 2026-03-29*
