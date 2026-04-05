# Phase 26: Calendar Sync Foundation - Research

**Researched:** 2026-04-03
**Domain:** Google/Outlook Calendar OAuth sync, incremental sync protocol, scheduling engine integration (Rust/Tauri)
**Confidence:** HIGH

## Summary

Phase 26 is a bug-fix and wiring phase, not a feature-build phase. All infrastructure already exists: OAuth flows, token refresh, event parsing, DB storage, background sync loop, and the scheduling algorithm. The work is fixing three pre-existing bugs (Google 410 handling, Outlook timezone parsing, OAuth invalid_grant detection) and connecting one pipe (calendar_events table to the scheduler's empty vec). No new Rust crates, no new npm packages, no new UI surfaces.

The codebase has two distinct `CalendarEvent` types that must be mapped: `calendar.rs::CalendarEvent` (full DB model with RFC3339 timestamps) and `scheduling::types::CalendarEvent` (lightweight with HH:mm format). The scheduler wiring must convert between them -- query the DB for the date's events, parse their RFC3339 start/end times into HH:mm, and pass them to `find_open_blocks`. This is approximately 15-20 lines of code at `scheduling_commands.rs:97`.

The existing `start_background_sync` already runs every 5 minutes. Per D-04, this should be changed to 15 minutes. The function already handles all the happy-path plumbing (get accounts, refresh tokens, sync events, emit events). The work is adding error recovery paths (410 retry, invalid_grant detection, account disabling).

**Primary recommendation:** Fix bugs in existing functions, wire the scheduler, adjust the timer interval. No new modules or architectural changes needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** When token refresh fails (invalid_grant, revoked access), silently disable sync for that account and show a warning badge on the calendar settings icon. User clicks to see a "Reconnect" button. No popup interruption.
- **D-02:** Detect placeholder OAuth client IDs at connect time and block with a setup guide error explaining how to register an OAuth app and set the env var. Prevents confusing OAuth failures downstream.
- **D-03:** On Google 410 Gone (sync token invalidated), automatically clear the stored sync token and retry as a full sync. Transparent to the user -- they just see updated events.
- **D-04:** Background sync runs on a fixed 15-minute interval. Not configurable in settings.
- **D-05:** Sync triggers beyond the timer: app launch, Hub open/tab focus, after OAuth reconnect, and manual refresh button.
- **D-06:** Transient sync failures (network, API, rate limit) are logged and silently retried on the next interval. No user-visible indicator for transient errors.
- **D-07:** Deleted/cancelled events from Google/Outlook are hard-deleted from the calendar_events table. No soft-delete status tracking.
- **D-08:** Fix the empty vec at `scheduling_commands.rs:97` to query the `calendar_events` table. Just wire the data -- no Meeting-type ScheduleBlocks, no briefing updates, no UI changes.
- **D-09:** The existing `list_calendar_events` command (calendar_commands.rs:488-495) is sufficient for Phase 27's calendar view. No changes needed here.

### Claude's Discretion
- Implementation details for the background timer (tokio::spawn with interval, following existing patterns)
- Specific error codes to detect for invalid_grant vs other OAuth failures
- Outlook timezone header strategy (Prefer: outlook.timezone="UTC" per research)
- Debouncing logic for Hub-open sync trigger to prevent rapid re-syncs

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAL-01 | Google Calendar OAuth sync works reliably with token refresh and 410 handling | Codebase analysis of `sync_google_calendar` (no 410 check), `refresh_google_token` (no invalid_grant detection). Google API docs confirm 410 means clear token + full re-sync. Deleted events arrive with `status: "cancelled"` during incremental sync. |
| CAL-02 | Outlook Calendar OAuth sync works with correct timezone parsing | `parse_outlook_events` has hardcoded `-05:` check (line 282-307). Microsoft Graph docs confirm `Prefer: outlook.timezone="UTC"` header forces UTC response times. Must also add to delta link requests. |
| CAL-03 | Calendar events are wired to the scheduling engine for gap detection | Two different CalendarEvent types identified. `scheduling_commands.rs:97` passes `vec![]`. Need ~15-line conversion function: query `list_events_for_range`, parse RFC3339 to HH:mm, construct `scheduling::types::CalendarEvent`. |
| CAL-04 | Calendar sync runs on a background interval with debounced refresh | `start_background_sync` exists at calendar.rs:764 with 300s interval. Change to 900s. Add sync triggers: app launch (already called in lib.rs:196), Hub focus (frontend event), OAuth reconnect (after connect commands), manual refresh (existing). Debounce with timestamp comparison. |
</phase_requirements>

## Standard Stack

### Core (all existing -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| reqwest | existing in Cargo.toml | HTTP client for Google/Microsoft API calls | Already used throughout calendar.rs |
| rusqlite | existing in Cargo.toml | SQLite database for events, accounts | Project-wide DB layer |
| chrono | existing in Cargo.toml | DateTime parsing, RFC3339/HH:mm conversion | Already used in scheduling_commands.rs |
| tokio | existing in Cargo.toml | Async runtime, timers, spawn | Background sync loop already uses it |
| serde_json | existing in Cargo.toml | API response parsing | Already used for Google/Outlook JSON parsing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tauri_plugin_oauth | existing | OAuth callback server | Already integrated for Google/Outlook connect flows |
| tauri_plugin_notification | existing | OS notification for critical errors | Used by notification system (Phase 20) for badge/warning |

### Alternatives Considered
None. This phase uses only existing dependencies. No new crates or npm packages needed.

## Architecture Patterns

### Recommended Changes (not new structure)
```
src-tauri/src/
  plugins/core/calendar.rs    # Fix: 410 handling, timezone header, invalid_grant detection, deleted event handling
  commands/calendar_commands.rs # Fix: invalid_grant in sync_calendar, add sync trigger helpers
  commands/scheduling_commands.rs # Fix: replace vec![] with real calendar event query
  lib.rs                       # Fix: change interval from 300s to 900s (or let calendar.rs own it)
```

### Pattern 1: CalendarEvent Type Conversion (scheduler wiring)
**What:** The DB stores `calendar.rs::CalendarEvent` with RFC3339 timestamps. The scheduler expects `scheduling::types::CalendarEvent` with HH:mm format. A conversion function bridges them.
**When to use:** In `generate_schedule` when replacing the empty vec.
**Example:**
```rust
// In scheduling_commands.rs, replacing the vec![] at line 97
use crate::plugins::core::calendar as cal_mod;

let db_events = cal_mod::list_events_for_range(
    db.conn(),
    &format!("{}T00:00:00", date),
    &format!("{}T23:59:59", date),
).map_err(|e| e.to_string())?;

let calendar_events: Vec<crate::scheduling::types::CalendarEvent> = db_events
    .iter()
    .filter(|e| !e.all_day) // all-day events don't block specific time slots
    .filter_map(|e| {
        // Parse RFC3339 to HH:mm for the scheduling algorithm
        let start = chrono::DateTime::parse_from_rfc3339(&e.start_time).ok()?;
        let end = chrono::DateTime::parse_from_rfc3339(&e.end_time).ok()?;
        let local_start = start.with_timezone(&chrono::Local);
        let local_end = end.with_timezone(&chrono::Local);
        Some(crate::scheduling::types::CalendarEvent {
            id: e.id.clone(),
            title: e.title.clone(),
            start_time: local_start.format("%H:%M").to_string(),
            end_time: local_end.format("%H:%M").to_string(),
            account_color: None,
        })
    })
    .collect();
```

### Pattern 2: 410 Gone Recovery (Google)
**What:** When sync returns 410, clear stored sync_token, retry as full sync.
**When to use:** In `sync_google_calendar` or its caller.
**Example:**
```rust
// In sync_google_calendar, replace the generic error handling
if resp.status() == reqwest::StatusCode::GONE {
    // 410 Gone: sync token invalidated, need full re-sync
    return Err(CalendarError::SyncTokenExpired);
}
```
Then in the caller (background sync loop or sync_calendar command):
```rust
match sync_result {
    Err(CalendarError::SyncTokenExpired) => {
        // Clear sync token in DB
        let db_lock = db.lock().map_err(|e| CalendarError::DbError(e.to_string()))?;
        update_sync_token(db_lock.conn(), &account.id, None, &now)?;
        drop(db_lock);
        // Retry as full sync (sync_token = None)
        let retry_result = sync_google_calendar(&client, &access_token, "primary", None).await?;
        // Save retry results...
    }
    // ... other error handling
}
```

### Pattern 3: invalid_grant Detection
**What:** Parse the OAuth error response body for `invalid_grant` to distinguish permanent auth failure from transient errors.
**When to use:** In token refresh error paths.
**Example:**
```rust
// In refresh_google_token and refresh_outlook_token
if !resp.status().is_success() {
    let body = resp.text().await.unwrap_or_default();
    // Check for permanent auth failures
    if body.contains("invalid_grant") || body.contains("AADSTS700082") {
        return Err(CalendarError::TokenRevoked(body));
    }
    return Err(CalendarError::OAuthError(format!("Token refresh failed: {}", body)));
}
```

### Pattern 4: Outlook Timezone Fix
**What:** Add `Prefer: outlook.timezone="UTC"` header to all Microsoft Graph calendar requests. Remove the `-05:` hardcoded check.
**When to use:** In `sync_outlook_calendar`.
**Example:**
```rust
// In sync_outlook_calendar, add the timezone header
let resp = client
    .get(&url)
    .bearer_auth(access_token)
    .header("Prefer", "outlook.timezone=\"UTC\"")
    .send()
    .await?;

// In parse_outlook_events, simplify the time parsing:
// Since we requested UTC, all times come back in UTC
let start_time = item.get("start")
    .and_then(|v| v.get("dateTime"))
    .and_then(|v| v.as_str())
    .map(|s| {
        if s.ends_with('Z') { s.to_string() } else { format!("{}Z", s) }
    })?;
```

### Pattern 5: Deleted Event Handling (Google incremental sync)
**What:** Google Calendar incremental sync returns deleted events with `status: "cancelled"`. These must be detected and hard-deleted from the local DB.
**When to use:** After parsing events from sync response, before upserting.
**Example:**
```rust
// After parsing events, separate cancelled from active
let (cancelled, active): (Vec<_>, Vec<_>) = events
    .into_iter()
    .partition(|e| e.status == "cancelled");

// Delete cancelled events from DB
for event in &cancelled {
    conn.execute(
        "DELETE FROM calendar_events WHERE id = ?1 AND account_id = ?2",
        rusqlite::params![event.id, event.account_id],
    )?;
}

// Upsert active events
save_events(conn, &active)?;
```

### Anti-Patterns to Avoid
- **Do NOT add new CalendarError variants unless strictly needed:** The existing variants (OAuthError, ApiError, DbError, CredentialError) cover most cases. Only add `SyncTokenExpired` and `TokenRevoked` for the two new recovery paths.
- **Do NOT hold MutexGuard across await points:** The existing background sync code already carefully scopes its locks. Any new code must follow the same pattern -- lock, extract data, drop lock, then await.
- **Do NOT paginate Google Calendar results in this phase:** The current code does not handle `nextPageToken`. This only matters for users with 300+ events in 30 days. Pagination is deferred -- it is not in the CAL-01 through CAL-04 requirements.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RFC3339 to HH:mm conversion | Manual string splitting | `chrono::DateTime::parse_from_rfc3339` + `.format("%H:%M")` | Handles timezone offsets, UTC Z suffix, fractional seconds |
| OAuth error detection | Pattern-match on HTTP status alone | Parse response body for `invalid_grant` / `AADSTS700082` | Status 400 covers many different errors; the body distinguishes permanent vs transient |
| Background timer | `std::thread::sleep` in a loop | `tokio::time::interval` or existing `tokio::time::sleep` pattern | Already used; works with async runtime, doesn't block threads |
| Debouncing | Custom timestamp tracking | Compare `last_synced_at` from DB before syncing | Already stored per-account; simple `now - last_synced > threshold` check |

## Common Pitfalls

### Pitfall 1: Two CalendarEvent Types with Same Name
**What goes wrong:** `calendar.rs::CalendarEvent` and `scheduling::types::CalendarEvent` are different structs. Using the wrong one causes compile errors or runtime data mismatches.
**Why it happens:** They were built in separate phases for separate purposes. The DB model has 11 fields with RFC3339 timestamps; the scheduler model has 5 fields with HH:mm strings.
**How to avoid:** Always use fully-qualified paths or explicit imports. The conversion function in `generate_schedule` bridges them.
**Warning signs:** Compile error about missing fields, or events appearing at wrong times in the schedule.

### Pitfall 2: Holding MutexGuard Across Await Points
**What goes wrong:** Rust panics or deadlocks if a `std::sync::MutexGuard` is held across an `.await` point in an async function.
**Why it happens:** The DB and CredentialManager use `std::sync::Mutex`. All calendar sync functions are async.
**How to avoid:** Follow the existing pattern: lock, extract data into local variables, drop the lock (explicitly or via scope), then await. The existing `start_background_sync` demonstrates this correctly.
**Warning signs:** Compile warnings about `MutexGuard` not being `Send`, or runtime deadlocks.

### Pitfall 3: Google Cancelled Events Missing Fields
**What goes wrong:** During incremental sync, deleted events arrive with `status: "cancelled"` but only the `id` field is guaranteed. Parsing code that expects `start.dateTime` will skip these events silently, leaving stale data in the DB.
**Why it happens:** Google Calendar API only populates `id` for deleted events (except on the organizer's calendar). The current `parse_google_events` uses `filter_map` which silently drops events missing `start`/`end`.
**How to avoid:** Check for `status: "cancelled"` before attempting to parse start/end times. Cancelled events need to be tracked for deletion, not for upserting.
**Warning signs:** Deleted meetings still appear in the schedule after sync.

### Pitfall 4: Outlook Body Content Header Conflict
**What goes wrong:** The current `sync_outlook_calendar` already sets `Prefer: outlook.body-content-type="text"`. Adding `Prefer: outlook.timezone="UTC"` as a second header may not combine correctly.
**Why it happens:** The `Prefer` header supports multiple preferences in a single header value, comma-separated. Two separate `Prefer` headers may or may not be merged by the HTTP library.
**How to avoid:** Combine into a single header: `Prefer: outlook.timezone="UTC", outlook.body-content-type="text"`.
**Warning signs:** One of the Prefer directives being silently ignored.

### Pitfall 5: Placeholder Client ID Detection Timing
**What goes wrong:** If placeholder detection happens after the OAuth server starts, the localhost server sits listening on a port indefinitely.
**Why it happens:** The `connect_google_calendar` command starts `tauri_plugin_oauth::start_with_config` before any validation.
**How to avoid:** Check for placeholder client ID as the first line of both connect commands, before any OAuth server startup. Return a clear error message with setup instructions.
**Warning signs:** OAuth flow appears to hang after clicking "Connect" with placeholder IDs.

## Code Examples

### Current Bug: Outlook Timezone Parsing (calendar.rs:282-307)
```rust
// CURRENT (buggy) -- hardcoded -05: check
let start_time = item.get("start")
    .and_then(|v| v.get("dateTime"))
    .and_then(|v| v.as_str())
    .map(|s| {
        if s.ends_with('Z') || s.contains('+') || s.contains("-05:") {
            s.to_string()
        } else {
            format!("{}Z", s)  // Wrong: assumes non-offset times are UTC
        }
    })?;
```
The `-05:` check only works for EST/CDT. Any other timezone offset (e.g., `-08:00` PST, `+01:00` CET) falls through to the `else` branch and gets `Z` appended, making it appear as UTC.

### Current Bug: No 410 Handling (calendar.rs:394-401)
```rust
// CURRENT -- treats all non-success as generic error
if !resp.status().is_success() {
    let status = resp.status();
    let body = resp.text().await.unwrap_or_default();
    return Err(CalendarError::ApiError(format!(
        "Google Calendar API returned {}: {}", status, body
    )));
}
// No special handling for 410 Gone
```

### Current Bug: Empty Vec in Scheduler (scheduling_commands.rs:94-97)
```rust
// CURRENT -- placeholder that makes scheduler ignore all meetings
// TODO: Read from calendar_events table once Phase 4 calendar integration is wired up.
let calendar_events: Vec<crate::scheduling::types::CalendarEvent> = vec![];
```

### Existing Background Sync Pattern (calendar.rs:764-899)
The `start_background_sync` function is well-structured with proper lock scoping. Changes needed:
1. Interval: 300s -> 900s (D-04)
2. Token refresh error: detect `invalid_grant`, disable account (D-01)
3. Sync error: detect 410, clear token, retry (D-03)
4. Transient errors: already silently logged, no change needed (D-06)

### Account Disable Pattern (D-01)
New DB operation needed:
```rust
pub fn disable_calendar_account(
    conn: &rusqlite::Connection,
    account_id: &str,
) -> Result<(), CalendarError> {
    conn.execute(
        "UPDATE calendar_accounts SET enabled = 0 WHERE id = ?1",
        rusqlite::params![account_id],
    )?;
    Ok(())
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Prefer: outlook.body-content-type` only | Add `outlook.timezone="UTC"` | Always been best practice | Fixes timezone bug for all non-UTC users |
| Generic API error handling | Specific 410/invalid_grant detection | Google Calendar sync protocol requirement | Enables automatic recovery instead of permanent failure |
| Empty vec for calendar events | DB query with type conversion | Phase 26 fix | Scheduler finally sees real meetings |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust built-in test + vitest |
| Config file | `src-tauri/Cargo.toml` (Rust), `vitest.config.ts` (TS) |
| Quick run command | `cd src-tauri && cargo test calendar` |
| Full suite command | `cd src-tauri && cargo test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAL-01a | 410 response triggers full re-sync | unit | `cd src-tauri && cargo test calendar::tests::test_410_triggers_full_resync` | Wave 0 |
| CAL-01b | invalid_grant disables account | unit | `cd src-tauri && cargo test calendar::tests::test_invalid_grant_disables_account` | Wave 0 |
| CAL-01c | Deleted/cancelled events hard-deleted from DB | unit | `cd src-tauri && cargo test calendar::tests::test_cancelled_events_deleted` | Wave 0 |
| CAL-02a | Outlook timezone header set to UTC | unit | `cd src-tauri && cargo test calendar::tests::test_outlook_utc_header` | Wave 0 |
| CAL-02b | Outlook time parsing without -05: hack | unit | `cd src-tauri && cargo test calendar::tests::test_parse_outlook_events_utc` | Existing tests can be extended |
| CAL-03 | Scheduler uses real calendar events | unit | `cd src-tauri && cargo test scheduling_commands::tests::test_schedule_with_calendar_events` | Wave 0 |
| CAL-04 | Background sync interval is 15 minutes | unit | Manual verification (timer constant check) | N/A |

### Sampling Rate
- **Per task commit:** `cd src-tauri && cargo test calendar scheduling`
- **Per wave merge:** `cd src-tauri && cargo test`
- **Phase gate:** Full Rust test suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `calendar::tests::test_410_triggers_full_resync` -- covers CAL-01a
- [ ] `calendar::tests::test_invalid_grant_disables_account` -- covers CAL-01b
- [ ] `calendar::tests::test_cancelled_events_deleted` -- covers CAL-01c
- [ ] `calendar::tests::test_outlook_utc_times` -- covers CAL-02 (extend existing parse test)
- [ ] `scheduling_commands` test for calendar event wiring -- covers CAL-03 (new test module or integration test)

## Open Questions

1. **Google Calendar pagination (nextPageToken)**
   - What we know: Current code does not handle `nextPageToken`. Only affects users with 300+ events in 30 days.
   - What's unclear: Whether this matters for the current user base.
   - Recommendation: Defer to a follow-up. Not in CAL-01 through CAL-04 scope. Log a warning if `nextPageToken` is present in response.

2. **Microsoft Graph delta link expiration behavior**
   - What we know: Delta links can expire similar to Google sync tokens. The current code stores the delta link as `sync_token`.
   - What's unclear: The exact HTTP status returned (404 vs 410 vs other).
   - Recommendation: Handle any non-success response from a delta link request by clearing the sync token and doing a full re-sync, same as Google 410 pattern. Microsoft docs suggest checking for `@removed` resource entries for deletions.

3. **Frontend sync trigger for Hub open/tab focus**
   - What we know: D-05 requires sync on Hub open/tab focus. The existing `calendar-synced` event pattern means the frontend can call `syncAllCalendars` and the store refreshes.
   - What's unclear: Whether to debounce in frontend (JS) or backend (Rust `last_synced_at` check).
   - Recommendation: Backend debounce via `last_synced_at` check. If last sync was < 2 minutes ago, skip. This keeps the logic centralized and prevents the frontend from needing timer state.

## Sources

### Primary (HIGH confidence)
- Element codebase direct analysis -- `calendar.rs`, `calendar_commands.rs`, `scheduling_commands.rs`, `scheduling/types.rs`, `scheduling/time_blocks.rs`, `credentials/mod.rs`, `lib.rs`
- [Google Calendar Sync Guide](https://developers.google.com/workspace/calendar/api/guides/sync) -- 410 handling, incremental sync protocol, deleted events
- [Google Calendar API Errors](https://developers.google.com/workspace/calendar/api/guides/errors) -- error response formats
- [Microsoft Graph calendarView](https://learn.microsoft.com/en-us/graph/api/user-list-calendarview?view=graph-rest-1.0) -- Prefer header, timezone handling
- [Microsoft Graph event delta](https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0) -- delta link usage, incremental changes
- [Events resource](https://developers.google.com/workspace/calendar/api/v3/reference/events) -- event status field, cancelled events

### Secondary (MEDIUM confidence)
- [Microsoft Graph delta query for events](https://learn.microsoft.com/en-us/graph/delta-query-events) -- delta link expiration behavior
- [calendarView API ignores outlook.timezone](https://learn.microsoft.com/en-us/answers/questions/1382808/calendarview-api-ignores-outlook-timezone) -- confirms Prefer header behavior with calendarView

### Tertiary (LOW confidence)
- Microsoft Graph delta link expiration HTTP status code -- not definitively documented; recommendation is defensive (handle any non-success)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing crate usage verified in Cargo.toml and source
- Architecture: HIGH - all changes are modifications to existing functions at specific line numbers
- Pitfalls: HIGH - all three bugs confirmed by line-level codebase inspection; API behavior verified against official docs

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- Google/Microsoft Calendar APIs change slowly)
