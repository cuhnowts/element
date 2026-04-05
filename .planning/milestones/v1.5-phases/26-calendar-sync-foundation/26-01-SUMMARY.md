---
phase: 26-calendar-sync-foundation
plan: 01
subsystem: api
tags: [oauth, google-calendar, outlook, reqwest, rusqlite, background-sync]

# Dependency graph
requires: []
provides:
  - CalendarError::SyncTokenExpired and CalendarError::TokenRevoked error variants
  - 410 Gone recovery with automatic full re-sync in sync_google_calendar
  - invalid_grant detection in both Google and Outlook token refresh
  - Cancelled event parsing and hard-deletion from DB
  - Outlook UTC timezone header and fixed time parsing
  - Placeholder client ID guards on connect commands
  - disable_calendar_account and delete_events_by_ids DB helpers
  - Background sync with full error recovery (410, token revoke, cancelled events)
affects: [calendar-mcp-tools, hub-calendar-view, daily-planning-skill]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Specific error variant matching before generic error handling (410 before !is_success)"
    - "Cancelled event partition pattern: separate cancelled from active before DB ops"
    - "Placeholder guard pattern: check env-embedded constants before starting OAuth server"

key-files:
  created: []
  modified:
    - src-tauri/src/plugins/core/calendar.rs
    - src-tauri/src/commands/calendar_commands.rs

key-decisions:
  - "D-01: TokenRevoked disables account silently and emits calendar-account-disabled event"
  - "D-02: Placeholder client IDs blocked at connect time before OAuth server starts"
  - "D-03: Google 410 Gone returns SyncTokenExpired, caller clears token and retries"
  - "D-04: Background sync interval changed from 300s to 900s (15 minutes)"
  - "D-07: Cancelled events hard-deleted via partition + delete_events_by_ids"

patterns-established:
  - "Error variant escalation: SyncTokenExpired and TokenRevoked are specific variants that callers match before the generic Err(e) arm"
  - "Cancelled event partition: all sync paths (foreground, background, sync_all) use the same partition pattern"

requirements-completed: [CAL-01, CAL-02]

# Metrics
duration: 7min
completed: 2026-04-04
---

# Phase 26 Plan 01: Calendar Sync Bug Fixes Summary

**Six calendar sync bugs fixed: Google 410 recovery, Outlook UTC timezone header, invalid_grant detection for both providers, cancelled event hard-deletion, and placeholder OAuth credential guards**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-04T12:31:03Z
- **Completed:** 2026-04-04T12:38:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- All three pre-existing calendar sync bugs fixed (Google 410, Outlook timezone, OAuth invalid_grant)
- Cancelled/deleted events from Google incremental sync are now detected and hard-deleted from DB
- Placeholder OAuth client IDs are caught before the OAuth server starts, with setup instructions
- Background sync has matching error recovery for all new error types (410, token revoke, cancelled events)
- 4 new unit tests covering cancelled events, Outlook UTC parsing, account disable, and event deletion
- All 27 calendar tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix calendar.rs -- error variants, 410 handling, timezone, invalid_grant, cancelled events** - `d0571ab` (fix)
2. **Task 2: Harden calendar_commands.rs -- placeholder guards, 410 retry, account disable on token revoke** - `3503fc6` (fix)

## Files Created/Modified
- `src-tauri/src/plugins/core/calendar.rs` - Added SyncTokenExpired/TokenRevoked error variants, 410 handling, Outlook UTC timezone header, invalid_grant detection in both refresh functions, cancelled event parsing, disable_calendar_account and delete_events_by_ids helpers, background sync error recovery, 4 new tests
- `src-tauri/src/commands/calendar_commands.rs` - Added placeholder client ID guards, SyncTokenExpired retry logic, TokenRevoked account disable, cancelled event partition in all sync paths

## Decisions Made
- Used `rfind('-')` with `pos > 10` to distinguish date-separator dashes from timezone offset dashes in Outlook time parsing (replaces the buggy `-05:` hardcoded check)
- Combined `outlook.timezone="UTC"` and `outlook.body-content-type="text"` into a single Prefer header per Pitfall 4
- Background sync clears token on SyncTokenExpired but does not immediately retry (waits for next 15-min interval) to avoid thundering-herd

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Pre-existing `proc macro panicked` error from `tauri::generate_context!()` because the `dist/` directory doesn't exist in the worktree. Created empty `dist/` to unblock compilation and test execution. This is not a code issue -- it's a build environment artifact.

## Known Stubs
None - all functions are fully implemented with real logic.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- calendar.rs and calendar_commands.rs are hardened with full error recovery
- Ready for Plan 02 (scheduler wiring) which will connect calendar_events to the scheduling engine
- The `delete_events_by_ids` and `disable_calendar_account` helpers are available for any future sync code

---
*Phase: 26-calendar-sync-foundation*
*Completed: 2026-04-04*
