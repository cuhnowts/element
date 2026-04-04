# Phase 26: Calendar Sync Foundation - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Make calendar events reliably flow from Google and Outlook into the app and feed them to the scheduling engine. Fix three pre-existing bugs (Google 410 handling, Outlook timezone parsing, OAuth token expiry) and wire calendar data to the scheduler. This is infrastructure/reliability work -- no new UI surfaces.

</domain>

<decisions>
## Implementation Decisions

### OAuth Error Recovery
- **D-01:** When token refresh fails (invalid_grant, revoked access), silently disable sync for that account and show a warning badge on the calendar settings icon. User clicks to see a "Reconnect" button. No popup interruption.
- **D-02:** Detect placeholder OAuth client IDs at connect time and block with a setup guide error explaining how to register an OAuth app and set the env var. Prevents confusing OAuth failures downstream.
- **D-03:** On Google 410 Gone (sync token invalidated), automatically clear the stored sync token and retry as a full sync. Transparent to the user -- they just see updated events.

### Sync Interval & Triggers
- **D-04:** Background sync runs on a fixed 15-minute interval. Not configurable in settings.
- **D-05:** Sync triggers beyond the timer: app launch, Hub open/tab focus, after OAuth reconnect, and manual refresh button.

### Sync Failure UX
- **D-06:** Transient sync failures (network, API, rate limit) are logged and silently retried on the next interval. No user-visible indicator for transient errors.
- **D-07:** Deleted/cancelled events from Google/Outlook are hard-deleted from the calendar_events table. No soft-delete status tracking.

### Scheduler Wiring
- **D-08:** Fix the empty vec at `scheduling_commands.rs:97` to query the `calendar_events` table. Just wire the data -- no Meeting-type ScheduleBlocks, no briefing updates, no UI changes.
- **D-09:** The existing `list_calendar_events` command (calendar_commands.rs:488-495) is sufficient for Phase 27's calendar view. No changes needed here.

### Claude's Discretion
- Implementation details for the background timer (tokio::spawn with interval, following existing patterns)
- Specific error codes to detect for invalid_grant vs other OAuth failures
- Outlook timezone header strategy (Prefer: outlook.timezone="UTC" per research)
- Debouncing logic for Hub-open sync trigger to prevent rapid re-syncs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Calendar Sync Infrastructure
- `src-tauri/src/plugins/core/calendar.rs` -- Core calendar module: data models, OAuth, sync functions, PKCE
- `src-tauri/src/commands/calendar_commands.rs` -- Tauri commands for calendar connect/sync/disconnect/list
- `src-tauri/src/commands/scheduling_commands.rs` -- Scheduling engine with empty vec tech debt at line 97
- `src-tauri/src/scheduling/types.rs` -- CalendarEvent type used by scheduling engine
- `src-tauri/src/scheduling/time_blocks.rs` -- find_open_blocks algorithm that consumes calendar events
- `src-tauri/src/credentials/mod.rs` -- Credential vault for OAuth token storage

### Research
- `.planning/research/SUMMARY.md` -- v1.5 research summary with pitfall analysis
- `.planning/research/PITFALLS.md` -- Detailed pitfall descriptions including OAuth, timezone, 410 bugs
- `.planning/REQUIREMENTS.md` -- CAL-01 through CAL-04 requirements for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `calendar.rs`: Full OAuth flow (PKCE, token exchange, refresh) for both Google and Outlook -- needs bug fixes, not rewrite
- `calendar_commands.rs`: Complete sync_calendar and sync_all_calendars commands -- need error handling improvements
- `CredentialManager`: Existing credential vault with create/get/update/delete for OAuth tokens
- `tauri_plugin_oauth`: Already integrated for localhost OAuth callback handling
- Notification system (Phase 20): Available for badge/warning indicators on sync failures

### Established Patterns
- Tauri commands use `State<'_, Arc<Mutex<Database>>>` for DB access
- Events emitted via `app.emit("calendar-synced", ())` for frontend reactivity
- Zustand stores invalidated by Tauri event listeners (not direct mutation)
- Background tasks use `tokio::spawn` (see existing scheduler initialization pattern)

### Integration Points
- `scheduling_commands.rs:97` -- Replace `vec![]` with real calendar_events DB query
- `calendar.rs` -- Add 410 handling in sync_google_calendar, timezone header in sync_outlook_calendar
- `calendar_commands.rs` -- Add invalid_grant detection in token refresh error paths
- `lib.rs` -- Register background sync timer in app setup (following existing init patterns)

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. Research recommends:
- `Prefer: outlook.timezone="UTC"` header for Outlook API calls
- Clear sync token + full re-sync on 410 Gone
- `invalid_grant` error code detection for token expiry

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 26-calendar-sync-foundation*
*Context gathered: 2026-04-03*
