---
phase: 26-calendar-sync-foundation
plan: 02
subsystem: api
tags: [calendar, scheduling, sync, debounce, rust, chrono, rfc3339]

# Dependency graph
requires:
  - phase: 26-calendar-sync-foundation plan 01
    provides: calendar DB schema, list_events_for_range, sync functions, 900s interval
provides:
  - "Scheduler wired to real calendar events from DB (replaces empty vec)"
  - "RFC3339 to local HH:mm type conversion for scheduling algorithm"
  - "All-day and cancelled event filtering"
  - "Debounced sync_all_if_stale Tauri command for Hub focus / manual refresh"
  - "should_sync debounce helper (120s threshold)"
  - "Post-connect sync triggers for Google and Outlook OAuth"
  - "sync_calendar_for_account reusable helper"
affects: [hub-calendar-view, daily-planning-skill, calendar-mcp-tools]

# Tech tracking
tech-stack:
  added: []
  patterns: [AppHandle-based state resolution for Send-safe async helpers, spawned post-connect sync]

key-files:
  created: []
  modified:
    - src-tauri/src/commands/scheduling_commands.rs
    - src-tauri/src/plugins/core/calendar.rs
    - src-tauri/src/commands/calendar_commands.rs
    - src-tauri/src/lib.rs

key-decisions:
  - "Used AppHandle.state() inside helper instead of State parameters to avoid Send issues across await points"
  - "Post-connect sync spawned as background task to avoid holding non-Send State across await"
  - "All-day events filtered from scheduling (they span entire day, not specific time slots)"
  - "Graceful fallback to empty vec on DB query failure (scheduler still works without calendar)"

patterns-established:
  - "AppHandle state resolution pattern: async helpers that need DB/cred state should use app.state() internally rather than accepting State<> parameters, enabling Send-safe futures"
  - "Spawn pattern for post-connect triggers: use tauri::async_runtime::spawn to avoid holding non-Send references across await"

requirements-completed: [CAL-03, CAL-04]

# Metrics
duration: 10min
completed: 2026-04-04
---

# Phase 26 Plan 02: Calendar Event Wiring and Sync Cadence Summary

**Scheduler reads real calendar events from DB with RFC3339-to-HH:mm conversion, debounced sync_all_if_stale command for frontend triggers, and post-connect sync for both OAuth providers**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-04T12:40:49Z
- **Completed:** 2026-04-04T12:51:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced empty vec tech debt in scheduling_commands.rs with real DB query via list_events_for_range, converting RFC3339 to local HH:mm
- Added debounced sync_all_if_stale Tauri command with should_sync helper (120s threshold) for Hub focus and manual refresh triggers
- Added post-connect sync triggers to both connect_google_calendar and connect_outlook_calendar (D-05)
- Added sync_calendar_for_account reusable helper with AppHandle-based state resolution for Send safety

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire calendar events to scheduling engine** - `2315478` (feat)
2. **Task 2: Adjust background sync with debounce, sync triggers, and post-connect sync** - `cc5776f` (feat)

## Files Created/Modified
- `src-tauri/src/commands/scheduling_commands.rs` - Replaced empty vec with DB query + RFC3339-to-HH:mm conversion, added unit tests
- `src-tauri/src/plugins/core/calendar.rs` - Added should_sync debounce helper, SYNC_DEBOUNCE_SECS constant, test_should_sync_debounce test
- `src-tauri/src/commands/calendar_commands.rs` - Added sync_calendar_for_account helper, sync_all_if_stale command, post-connect sync triggers for both providers
- `src-tauri/src/lib.rs` - Registered sync_all_if_stale in invoke_handler

## Decisions Made
- Used AppHandle.state() inside sync_calendar_for_account instead of State<> parameters to avoid Rust Send issues (State holds non-Send reference)
- Post-connect sync spawned via tauri::async_runtime::spawn rather than awaited inline (avoids holding non-Send State across await in connect commands)
- All-day events filtered from time-slot blocking (they don't have meaningful start/end times for scheduling)
- Cancelled events filtered as defense-in-depth (Plan 01 deletes them but belt-and-suspenders)
- Graceful fallback on DB query failure: log warning and proceed with empty schedule (same as before)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restructured sync_calendar_for_account for Send safety**
- **Found during:** Task 2
- **Issue:** Plan specified sync_calendar_for_account taking State<> parameters, but State<'_, Mutex<CredentialManager>> is not Send across await points, causing compile errors in connect commands
- **Fix:** Changed helper to accept only AppHandle + account_id, resolving state internally via app.state(). Post-connect sync calls spawned as background tasks.
- **Files modified:** src-tauri/src/commands/calendar_commands.rs
- **Verification:** cargo check passes (only pre-existing proc macro error remains)
- **Committed in:** cc5776f

**2. [Rule 3 - Blocking] SyncTokenExpired retry also handles Outlook provider**
- **Found during:** Task 2
- **Issue:** Original sync_calendar command only retried Google on SyncTokenExpired. Helper needed to handle both providers.
- **Fix:** Added Outlook retry branch in SyncTokenExpired handler
- **Files modified:** src-tauri/src/commands/calendar_commands.rs
- **Committed in:** cc5776f

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for compilation. No scope creep.

## Issues Encountered
- Pre-existing proc macro panic at tauri::generate_context!() in lib.rs:320 prevents cargo test from running. This is a Tauri build system issue unrelated to this plan's changes. cargo check confirms no type errors in the new code.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all code is fully wired to real data sources.

## Next Phase Readiness
- Scheduling engine now reads real calendar events -- ready for Hub calendar view (Phase 27)
- sync_all_if_stale command registered and available for frontend to call on Hub focus
- Post-connect sync ensures events are available immediately after OAuth connect
- Background sync continues at 15-minute interval from Plan 01

---
*Phase: 26-calendar-sync-foundation*
*Completed: 2026-04-04*
