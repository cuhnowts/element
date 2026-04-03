# Pitfalls Research

**Domain:** AI scheduling assistant + calendar sync + heartbeat for Tauri/React desktop app
**Researched:** 2026-04-02
**Confidence:** HIGH (verified against codebase + official API docs + community reports)

## Critical Pitfalls

### Pitfall 1: Google OAuth Refresh Tokens Expire After 7 Days in Testing Mode

**What goes wrong:**
Google Cloud projects with OAuth consent screen set to "Testing" publish status automatically revoke refresh tokens after 7 days. The app silently loses calendar access and sync stops working. Users see no error until they open the calendar view and find stale data.

**Why it happens:**
This is a Google policy, not a bug. The current codebase uses `option_env!("GOOGLE_CLIENT_ID")` with placeholder fallbacks (`calendar.rs:9-16`), which means development builds always use testing-mode credentials. Even with real credentials, if the Google Cloud Console project stays in "Testing" mode, tokens expire weekly.

**How to avoid:**
1. Publish the OAuth consent screen to "Production" status (requires Google verification for sensitive scopes like `calendar.readonly`).
2. If staying in Testing mode during development, implement a proactive token refresh that detects `invalid_grant` errors and triggers re-authentication with a user-facing notification.
3. Store `token_issued_at` alongside the refresh token and warn the user 24 hours before the 7-day expiry.
4. On `invalid_grant`, surface a clear "Reconnect your Google Calendar" action in the hub -- never silently fail.

**Warning signs:**
- Calendar sync works for a week after connecting, then silently stops.
- `invalid_grant` errors in logs after day 7.
- Users report "calendar was working, now it's empty."

**Phase to address:**
Calendar sync fix phase (first phase). Must be resolved before any downstream feature depends on calendar data.

---

### Pitfall 2: Microsoft Graph Outlook Timezone Handling Is Already Broken in the Codebase

**What goes wrong:**
The existing `parse_outlook_events` function (`calendar.rs:282-307`) has a critical timezone bug: it checks for `-05:` as the only timezone offset, then blindly appends `Z` (UTC) to all other times. Microsoft Graph returns times in the **calendar's timezone** (not UTC) unless you request `Prefer: outlook.timezone="UTC"`. A user in PST (-08:00) would have all their meetings displayed 8 hours off.

**Why it happens:**
The original implementation assumed Microsoft Graph returns UTC, but it returns times in the event's timezone. The `-05:` check was likely a quick fix for one developer's timezone (EST/CDT) during initial development.

**How to avoid:**
1. Set the `Prefer: outlook.timezone="UTC"` header on all Microsoft Graph calendar requests -- this forces UTC response times regardless of user timezone.
2. Alternatively, read the `start.timeZone` and `end.timeZone` fields from the response and convert properly.
3. Remove the hardcoded `-05:` check entirely.
4. All-day events from Microsoft Graph are a separate problem: they return midnight-to-midnight in the **organizer's** timezone, but the organizer timezone is not in the response body. Use the `Prefer: outlook.timezone` header to normalize.

**Warning signs:**
- Events appear at wrong times for any user not in UTC-5.
- All-day events span the wrong calendar day.
- Meeting conflicts are missed because times are offset.

**Phase to address:**
Calendar sync fix phase (first phase). This is a pre-existing bug that must be fixed before the scheduling algorithm consumes calendar events.

---

### Pitfall 3: Calendar Events Not Wired to Scheduler (Known Tech Debt)

**What goes wrong:**
The scheduling algorithm (`scheduling_commands.rs:94-97`) passes an empty `calendar_events` vec to `find_open_blocks`. The scheduler treats the entire work day as open time, double-booking work blocks on top of actual meetings. This is already documented as tech debt in PROJECT.md.

**Why it happens:**
Calendar integration and scheduling were built in separate phases. The scheduler was built first with a placeholder for calendar events that was never connected.

**How to avoid:**
1. Wire `calendar_events` table data into `generate_schedule` as the first integration task.
2. Add an integration test that creates calendar events and verifies the scheduler respects them.
3. Never ship the calendar view or daily planning skill until this integration is verified end-to-end.

**Warning signs:**
- Work blocks overlap with meetings in the schedule view.
- AI suggests "you have 8 hours free today" when the user has 5 hours of meetings.

**Phase to address:**
Must be completed in the calendar sync phase, before any scheduling or daily planning features are built.

---

### Pitfall 4: No Sync Token Invalidation Handling (410 Gone)

**What goes wrong:**
Google Calendar API invalidates sync tokens periodically and responds with `410 Gone` when an expired sync token is used. The current `sync_google_calendar` function (`calendar.rs:362-410`) checks `resp.status().is_success()` but has no special handling for 410. A 410 response causes the sync to fail permanently until the user manually removes and re-adds the account.

**Why it happens:**
Incremental sync was implemented (the code stores and uses `sync_token`) but the required error-recovery path was not. Google documents this as a required part of their sync protocol.

**How to avoid:**
1. On 410 response, clear the stored `sync_token` for that account.
2. Automatically retry with a full sync (no sync token, with `timeMin`/`timeMax` parameters).
3. Log the full-sync-required event but do not surface it to the user -- it should be transparent.
4. Microsoft Graph has an equivalent: delta links can expire, returning a `410` or `404`. Same pattern applies.

**Warning signs:**
- Calendar sync fails with "API returned 410" in logs.
- Calendar data becomes permanently stale after token invalidation.
- Users must disconnect and reconnect calendar accounts to recover.

**Phase to address:**
Calendar sync fix phase (first phase). Critical for reliable background sync.

---

### Pitfall 5: LLM Cannot Reliably Optimize Multi-Day Schedules

**What goes wrong:**
Using an LLM to algorithmically schedule tasks across a week or month produces inconsistent, suboptimal, and sometimes contradictory results. The LLM might schedule 3 hours of deep work at 4:30 PM, put a due-tomorrow task on Thursday, or suggest impossible schedules that violate constraints.

**Why it happens:**
LLMs are text prediction engines, not constraint solvers. Even a simple 5-task scheduling problem across a week has millions of possible orderings. LLMs handle this through pattern matching rather than systematic optimization, leading to missed constraints and inconsistencies across separate LLM calls.

**How to avoid:**
1. Use the LLM for **conversational input** only: "What should we prioritize today?" and "This deadline moved, how should we adjust?"
2. Use **deterministic algorithms** for actual scheduling: priority sorting, deadline-first assignment, time-block fitting. The existing `assign_tasks_to_blocks` function is the right pattern.
3. Let the LLM **review and narrate** the algorithmically-generated schedule rather than generate it.
4. For the daily planning conversation, the LLM should present the algorithm's output conversationally and let the user adjust, not generate the schedule from scratch.

**Warning signs:**
- AI suggests schedules that violate due dates or overlap with meetings.
- Different prompts for the same day produce wildly different schedules.
- Users stop trusting the scheduling suggestions.

**Phase to address:**
Daily planning skill phase. The architecture decision (LLM as conversational layer, algorithm as scheduler) must be locked in before any planning skill code is written.

---

### Pitfall 6: Heartbeat LLM Calls Drain System Resources on Desktop

**What goes wrong:**
A periodic heartbeat that calls an LLM (especially a local model like Ollama) every N minutes consumes significant CPU, memory, and potentially GPU resources. If the user is in a video call or compiling code, the heartbeat check causes noticeable system lag. Local LLMs (7B-13B models) can spike to 4-8GB RAM and saturate CPU during inference.

**Why it happens:**
Server-side heartbeats are cheap (API call to a remote model). Desktop heartbeats with local LLM preference are fundamentally different -- the inference runs on the same machine the user is working on.

**How to avoid:**
1. **System load gating**: Check CPU/memory usage before triggering heartbeat. Skip if system is under load (compile, video call, etc.).
2. **Adaptive intervals**: Start at 30-60 minutes, not 5-10. Increase frequency only near deadlines.
3. **Local LLM size cap**: Use the smallest model that works (a 1-3B model, not 7B+). Quantized models (Q4_K_M) reduce memory by 60-75%.
4. **Graceful degradation**: If local LLM is unavailable or system is busy, fall back to CLI/API provider silently.
5. **User control**: Let users set heartbeat frequency or disable it entirely. Never run inference without user awareness.
6. **Use Tauri events, not polling**: The existing codebase uses Tauri's event-driven architecture. The heartbeat timer should live in Rust (tokio interval) and emit events to the frontend, not poll from JavaScript.

**Warning signs:**
- Users report fan noise or system slowdown at regular intervals.
- Heartbeat checks take 30+ seconds on older hardware.
- Activity Monitor shows Element using 4GB+ RAM.

**Phase to address:**
Heartbeat phase. Must be designed with resource awareness from the start -- bolting on resource limits after the fact is harder.

---

### Pitfall 7: Auto-Rescheduling Destroys User Trust

**What goes wrong:**
When the AI automatically moves work blocks, reorders task priorities, or changes due dates without explicit user consent, users feel loss of control. They open the app to find their carefully arranged day reshuffled. Even when the AI's rescheduling is objectively better, unsanctioned changes feel like a violation.

**Why it happens:**
Developers optimize for "correct scheduling" rather than "user autonomy." The assumption is that if the AI produces a better schedule, users will appreciate it. In practice, users value predictability and control over optimization.

**How to avoid:**
1. **Never auto-apply schedule changes.** Always present changes as suggestions: "Your 2pm meeting was cancelled. Want me to move the design review into that slot?"
2. **Show diffs**: When suggesting reschedules, show what changed and why. "Moved X from 3pm to 1pm because Y is due tomorrow."
3. **Distinguish user-pinned vs. AI-suggested blocks**: Let users pin blocks that should never be moved. The AI only reshuffles unpinned blocks.
4. **Batch suggestions**: Collect multiple changes and present them together rather than interrupting with each change.
5. **Undo support**: Every AI-suggested change that the user accepts should be undoable.

**Warning signs:**
- Users express frustration about "things moving around."
- Users stop checking the AI's suggestions.
- Users manually recreate schedules the AI reshuffled.

**Phase to address:**
Schedule negotiation phase. But the UI pattern (suggest, don't auto-apply) must be established in the daily planning skill phase.

---

### Pitfall 8: Due Date Enforcement Without Escape Valves Creates Anxiety

**What goes wrong:**
If every task and phase requires a due date and the system constantly flags overdue items, users feel nagged. Tasks that are aspirational or low-priority get the same urgency treatment as genuinely time-sensitive work. Users start ignoring due date warnings entirely (alert fatigue) or gaming the system by setting far-future dates.

**Why it happens:**
Time-bounded systems assume all work has deadlines. In reality, personal project management has a mix of hard deadlines (client deliverable Friday), soft targets (finish refactor this month), and aspirational goals (learn Rust someday).

**How to avoid:**
1. **The backlog exemption** (already planned) is essential -- ship it alongside due date enforcement, not after.
2. **Due date types**: Distinguish "hard deadline" (external commitment) from "target date" (self-imposed goal). Different visual treatment and different escalation behavior.
3. **Snooze, don't nag**: When a target date passes, offer to snooze it ("push to next week?") rather than flagging it red.
4. **AI suggests, user confirms**: When the AI suggests due dates conversationally, make it easy to say "no date for this one" or "backlog it."
5. **Overdue != failure**: The language matters. "This is past its target date, want to reschedule?" not "OVERDUE: Task X."

**Warning signs:**
- Users set all due dates to December 31st.
- Users report feeling stressed by the app.
- Backlog items accumulate overdue warnings.

**Phase to address:**
Due date enforcement phase. The backlog exemption and due date types must ship in the same phase, not as a follow-up.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store OAuth tokens in SQLite instead of keychain | Simpler implementation | Tokens accessible if DB file is copied; violates platform security model | Never -- the existing `SecretStore` trait already solves this correctly |
| Skip Microsoft `Prefer: outlook.timezone` header | Fewer API concepts to understand | Every Outlook event is potentially hours off | Never -- the existing code already has this bug |
| Use LLM for schedule generation instead of algorithm | Impressive demo, less code | Inconsistent, slow, expensive per-invocation | Only for conversational review, never for actual block assignment |
| Heartbeat at fixed short interval (5 min) | Responsive deadline warnings | Constant resource drain, user frustration | Never for local LLM; acceptable for lightweight API-only checks |
| Store calendar events without timezone metadata | Simpler data model | Cannot correctly display events in user's timezone or handle DST transitions | Never -- always store as UTC with original timezone info |
| Auto-apply schedule changes without confirmation | Fewer user interactions | Users lose trust, feel loss of control | Never for schedule-altering changes; acceptable for cosmetic updates |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Calendar OAuth | Not handling `invalid_grant` on refresh -- app silently loses access | Catch `invalid_grant`, clear stored tokens, prompt user to re-authenticate with toast notification |
| Google Calendar Sync | Ignoring 410 Gone on sync token expiry -- sync breaks permanently | On 410, clear sync token and restart with full sync automatically |
| Google Calendar OAuth | Using `prompt=consent` on every auth -- user sees consent screen repeatedly | Only use `prompt=consent` on first auth or when re-auth is needed; store and reuse refresh token |
| Microsoft Graph Calendar | Appending `Z` to non-UTC times -- events display at wrong times | Set `Prefer: outlook.timezone="UTC"` header, or read `timeZone` field from response |
| Microsoft Graph Calendar | Ignoring delta link expiration -- same as Google 410 problem | Handle expired delta links by falling back to full sync |
| Google Calendar API | Not handling pagination (`nextPageToken`) for users with many events | Loop until no `nextPageToken` in response; the current code does not paginate |
| Both Calendar APIs | Treating all-day events like timed events -- scheduling algorithm treats them as 24-hour blocks | Filter all-day events separately; they should mark a day as "has all-day event" but not block specific time slots |
| Local LLM (Ollama) | Assuming Ollama is always running -- heartbeat fails if user hasn't started it | Check Ollama availability before each heartbeat call; fall back to CLI provider gracefully |
| MCP Calendar Tools | Write tools that modify calendar without confirmation -- user discovers unexpected events in Google/Outlook | All calendar write operations (block time, move events) must require explicit user approval through the existing MCP approval flow |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full calendar sync on every app launch | 2-5 second startup delay, API rate limit hits | Use sync tokens for incremental sync; only full-sync on first connect or 410 | Users with 500+ events or multiple calendar accounts |
| LLM heartbeat context includes full task list | Heartbeat takes 30+ seconds, uses excessive tokens | Summarize: only include tasks due within 7 days, overdue items, and today's schedule | Users with 100+ active tasks across projects |
| Rendering all calendar events in the week view | UI jank when scrolling, slow initial render | Virtualize the event list; only render events visible in viewport | Users with 20+ events per day (common in corporate environments) |
| Re-generating schedule from scratch on every change | 1-2 second delay per user interaction | Diff-based updates: when one block moves, recalculate only affected slots | Schedules with 15+ blocks per day |
| Polling calendar API for changes | Wastes API quota, delayed updates | Use push notifications (Google: webhook, Microsoft: subscriptions) or sync on app-focus | Sync intervals under 5 minutes |
| Storing full event JSON in SQLite | Database bloat, slow queries | Store only the fields you use (id, title, start, end, all_day, status); discard body/attachments | After 6 months of synced history |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Logging OAuth tokens in debug output | Token theft from log files | Never log tokens; log only token type and expiry timestamp |
| Storing refresh tokens in SQLite `calendar_accounts` table | Token theft if DB file is exfiltrated | Use the existing `SecretStore` (keychain) for all tokens; store only a credential_id reference in SQLite |
| Placeholder OAuth client IDs in production builds | Auth flow fails or uses wrong OAuth app | Add a build-time check that rejects placeholder IDs in release builds; `option_env!` fallback should panic in release |
| Local LLM heartbeat sending task data to cloud API on fallback | User's private task data sent to API provider without awareness | Clearly indicate when heartbeat is using cloud vs. local; let user opt out of cloud fallback |
| MCP calendar write tools without scope restrictions | AI could delete/modify real calendar events | Calendar write MCP tools should only manage Element-created events (identifiable by a tag/prefix), never modify user's real meetings |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Calendar view shows only Element work blocks, not real meetings | User must check two calendars; the whole point is unified view | Overlay synced calendar events with Element work blocks in the same view |
| AI daily planning asks too many questions before showing a plan | User wanted a quick "here's your day" and got an interview | Lead with the generated schedule, then ask "want to adjust anything?" |
| Heartbeat notifications interrupt focus work | User is deep in code, gets a "you're behind on X" notification | Batch heartbeat insights; show them when user returns to Element, not as OS notifications during work |
| Schedule shows precise minute-level blocks (9:00-9:47) | Feels robotic and inflexible | Round to 15-minute increments; leave buffer between blocks |
| No visual distinction between meetings and work blocks | User can't tell what's a real meeting vs. suggested work time | Different colors, opacity, or border styles for meetings (solid) vs. work blocks (dashed/lighter) |
| Due date reminders use same urgency for all task types | Everything feels urgent, nothing feels urgent | Tiered urgency: hard deadlines get strong visual treatment, target dates get subtle indicators |
| Calendar write-back creates duplicate events | User sees the same block in both Element and Google Calendar | Either write back OR show in Element, not both. If writing back, mark as Element-managed and hide from Element's sync import |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Calendar sync:** Often missing 410/expired-token recovery -- verify by invalidating a sync token and confirming automatic full-sync recovery
- [ ] **Calendar sync:** Often missing pagination for users with many events -- verify with a test account that has 300+ events in 30 days
- [ ] **OAuth flow:** Often missing re-auth flow when refresh token is permanently revoked -- verify by revoking token in Google/Microsoft account settings and confirming the app recovers gracefully
- [ ] **Timezone handling:** Often missing DST transition handling -- verify events created during DST change week display at correct times
- [ ] **Scheduling algorithm:** Often missing all-day event handling -- verify that all-day events don't create a 24-hour "busy" block that eliminates the entire work day
- [ ] **Heartbeat:** Often missing system load awareness -- verify heartbeat skips when CPU usage is above 80% or a meeting is in progress
- [ ] **Daily planning:** Often missing "nothing to do today" state -- verify the AI handles days with no tasks or no available time gracefully
- [ ] **Due dates:** Often missing bulk operations -- verify user can set/clear due dates for an entire phase's tasks at once, not one by one
- [ ] **Calendar view:** Often missing recurring event rendering -- verify weekly standup appears on each day, not just the first occurrence
- [ ] **Schedule negotiation:** Often missing undo -- verify user can revert the last accepted AI suggestion

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Timezone bug shipped (events at wrong times) | MEDIUM | Add migration to re-sync all events with correct timezone handling; notify affected users |
| OAuth tokens expired silently | LOW | Detect on next sync attempt; show "reconnect" prompt; no data loss since events are in provider |
| LLM generated bad schedule and user accepted | LOW | Undo the acceptance; revert to previous schedule state. Requires storing schedule history |
| Heartbeat resource drain reported | LOW | Ship config update that increases interval and adds system load check; no data impact |
| Auto-rescheduling lost user's manual arrangement | HIGH | Requires schedule history/undo. If not built, user must manually recreate. This is why "suggest, don't auto-apply" is critical |
| Sync token invalidation cascades (multiple accounts) | MEDIUM | Full re-sync all accounts; may hit rate limits. Stagger re-syncs with exponential backoff |
| Calendar write-back created duplicate events | MEDIUM | Must identify and delete Element-managed events in external calendar; requires a reliable event tagging scheme |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Google OAuth 7-day token expiry | Calendar sync fix | Token survives 8+ days in testing; production mode publish verified |
| Outlook timezone bug | Calendar sync fix | Events from multiple timezones display at correct local times |
| Calendar events not wired to scheduler | Calendar sync fix | `generate_schedule` with 3 meetings shows 3 fewer hours of available time |
| No 410 Gone handling | Calendar sync fix | Invalidate sync token in DB, trigger sync, verify automatic recovery |
| LLM schedule generation unreliability | Daily planning skill | LLM narrates algorithm output; does not generate schedule independently |
| Heartbeat resource drain | Heartbeat | CPU stays under 10% increase during heartbeat; system load gating works |
| Auto-rescheduling trust loss | Schedule negotiation | All schedule changes presented as suggestions with accept/reject UI |
| Due date anxiety | Due date enforcement | Backlog exemption and date-type distinction ship in same phase |
| Calendar view rendering | Hub calendar view | Week view with 20+ events/day renders without jank (< 16ms frame time) |
| MCP calendar write safety | Calendar MCP tools | All write operations require approval; only Element-managed events are modifiable |

## Sources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2) -- token lifecycle and refresh behavior
- [Google Calendar API Sync Guide](https://developers.google.com/workspace/calendar/api/guides/sync) -- incremental sync and 410 handling
- [Google Calendar API Error Handling](https://developers.google.com/workspace/calendar/api/guides/errors) -- error response formats
- [Microsoft Graph Throttling Limits](https://learn.microsoft.com/en-us/graph/throttling-limits) -- rate limits per endpoint (4 req/s per mailbox for calendar)
- [Microsoft Graph Throttling Guidance](https://learn.microsoft.com/en-us/graph/throttling) -- Retry-After, exponential backoff, delta queries
- [Microsoft Graph All-Day Events Timezone Issue](https://learn.microsoft.com/en-us/answers/questions/5760696/microsoft-graph-all-day-events-return-incorrect-ut) -- organizer timezone not in response
- [Google OAuth Testing Mode Token Expiry](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked) -- 7-day refresh token expiry in testing mode
- [LLMs Can't Optimize Schedules (Timefold)](https://timefold.ai/blog/llms-cant-optimize-schedules-but-ai-can) -- why LLMs fail at constraint-based scheduling
- [Tauri Background Tasks Discussion](https://github.com/tauri-apps/tauri/issues/14117) -- event-driven vs. polling for desktop apps
- Codebase analysis: `calendar.rs:282-307` (Outlook timezone bug), `scheduling_commands.rs:94-97` (empty calendar events vec), `calendar.rs:9-16` (placeholder OAuth IDs)

---
*Pitfalls research for: AI scheduling assistant + calendar sync + heartbeat for Tauri/React desktop app*
*Researched: 2026-04-02*
