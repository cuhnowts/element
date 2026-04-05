# Phase 30: Heartbeat & Schedule Negotiation - Research

**Researched:** 2026-04-03
**Domain:** Background deadline monitoring, deterministic risk calculation, LLM-powered summaries, conversational rescheduling
**Confidence:** HIGH

## Summary

This phase adds a background heartbeat process that periodically evaluates deadline risk across all projects, surfaces risks through notifications and briefing updates, and enables single-task rescheduling through hub chat. The core architecture splits into three layers: (1) a deterministic risk calculator that compares remaining estimated_minutes against available calendar capacity before due dates, (2) an LLM summary layer that narrates risk findings with Ollama preferred and CLI fallback, and (3) a chat-based negotiation flow for single-task moves using the existing hub chat and scheduling infrastructure.

The codebase already provides every building block needed. The scheduling engine (`time_blocks.rs`, `assignment.rs`) computes open blocks from work hours and calendar events. The AI gateway dispatches to Ollama, CLI, and API providers. The notification system has priority, category, action_url, and OS-level critical alerts. The background timer pattern is established in `start_background_sync` (tokio interval loop) and `spawn_manifest_rebuilder` (debounced channel). No new crates are needed -- `tokio::time::interval` handles the timer, and `chrono` handles all date math.

**Primary recommendation:** Build the heartbeat as a standalone Rust module (`src-tauri/src/heartbeat/`) with a `tokio::interval`-based background loop spawned from `lib.rs::setup`, following the exact pattern of `start_background_sync`. The risk calculation is pure deterministic math (no LLM). The LLM layer only formats the summary narrative. Schedule negotiation reuses the existing hub chat bot skill pattern from Phase 25.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Heartbeat runs every 30 minutes by default, configurable by user in settings
- **D-02:** Risk detection is deterministic math: remaining estimated_minutes of pending tasks vs available calendar gaps before due date. No LLM needed for detection itself
- **D-03:** Heartbeat checks all projects, not just the active one -- deadlines are cross-project
- **D-04:** Tasks approaching deadlines without time estimates are flagged separately: "Task X is due in 2 days but has no time estimate"
- **D-05:** Backlog items (999.x phases) are ignored by the heartbeat -- no false alarms on intentionally unscheduled work
- **D-06:** Deadline risks surface through two channels: notification (immediate awareness) AND daily briefing update (next-session context)
- **D-07:** LLM summary format is structured with narrative: data-first risk assessment with actionable suggestion
- **D-08:** Risk notifications fire once per risk event. If conditions worsen (another day passes), that's a NEW risk event with updated urgency -- no daily nagging
- **D-09:** Clicking a risk notification opens hub chat with risk context pre-loaded, ready for schedule negotiation
- **D-10:** Negotiation initiated through natural language in hub chat
- **D-11:** Bot presents before/after summary in chat: shows what moves and what gets displaced
- **D-12:** Heartbeat risk notifications include a suggested fix pre-loaded into chat
- **D-13:** Scope is single task moves only. Full day replanning is out of scope for this phase
- **D-14:** All schedule changes follow suggest-never-auto-apply pattern
- **D-15:** Ollama availability checked at each heartbeat tick via OllamaProvider.test_connection() (2s timeout)
- **D-16:** When Ollama unavailable, fall back to configured CLI tool with identical output format
- **D-17:** When neither Ollama nor CLI is configured, heartbeat still runs with deterministic template output
- **D-18:** User can configure a dedicated heartbeat AI provider in settings -- separate from main AI provider

### Claude's Discretion
- Implementation of the background timer (tokio interval, Tauri background task, etc.)
- Exact format of the deterministic fallback template
- How to parse natural language reschedule intent (bot skill pattern from Phase 25)
- Notification priority levels for different risk severities

### Deferred Ideas (OUT OF SCOPE)
- Full day replan ("replan my afternoon")
- Visual diff on calendar view showing proposed changes as ghost blocks
- Phase-level due dates propagating to heartbeat risk calculations
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BEAT-01 | Background process periodically evaluates deadline risk (remaining work vs remaining capacity) | Heartbeat module with `tokio::interval` loop (30min default). Risk calculator uses `find_open_blocks` for capacity, queries tasks with due dates for demand. Pure math, no LLM. |
| BEAT-02 | Heartbeat prefers local LLM (Ollama) for summary, falls back to CLI tool | `OllamaProvider.test_connection()` with 2s timeout at each tick. Fall through: Ollama -> heartbeat-specific provider -> CLI tool -> deterministic template. AiGateway already supports all providers. |
| BEAT-03 | Deadline risks surface as notifications and briefing updates | `create_notification` with category "deadline-risk", action_url pointing to hub chat. Briefing integration via manifest state update or heartbeat-findings cache. |
| BEAT-04 | Heartbeat respects backlog exemption -- does not alert on 999.x items | Filter tasks by joining on phases table, excluding phases with name matching `999.` prefix or sort_order >= 999. Existing pattern in `planning_sync.rs` uses regex for 999.x detection. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tokio | 1.x (already in Cargo.toml) | Background interval timer, async runtime | Already the project's async runtime. `tokio::time::interval` is the standard way to run periodic tasks |
| chrono | 0.4 (already in Cargo.toml) | Date math for deadline risk calculation | Already used throughout scheduling and models |
| reqwest | 0.12 (already in Cargo.toml) | Ollama HTTP API health check | Already used by OllamaProvider |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| serde/serde_json | 1.x (already in Cargo.toml) | Serialize risk assessment results for frontend events | Already used everywhere |
| tauri | ~2.10 (already in Cargo.toml) | App state access, event emission from background task | Already the application framework |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tokio::time::interval | tokio-cron-scheduler (already in deps) | Cron is heavier for a simple fixed-interval task. Interval is simpler and matches calendar sync pattern |
| Manual provider selection | New AiGateway method | Heartbeat needs its own provider resolution chain (Ollama -> heartbeat provider -> CLI -> template), not the default provider |

**Installation:**
```bash
# No new dependencies needed. All crates already in Cargo.toml.
```

## Architecture Patterns

### Recommended Project Structure
```
src-tauri/src/
├── heartbeat/
│   ├── mod.rs           # Module exports, spawn_heartbeat() entry point
│   ├── risk.rs          # Deterministic risk calculation (pure functions)
│   ├── summary.rs       # LLM summary generation with provider fallback chain
│   └── types.rs         # DeadlineRisk, RiskAssessment, HeartbeatConfig structs
├── ai/                  # Existing -- no changes needed
├── scheduling/          # Existing -- reuse find_open_blocks, TaskWithPriority
├── models/
│   └── notification.rs  # Existing -- reuse create_notification
└── commands/
    └── heartbeat_commands.rs  # Tauri commands: get/set heartbeat config, manual trigger
```

### Pattern 1: Background Timer (following `start_background_sync`)
**What:** A `tokio::interval` loop spawned from `lib.rs::setup` that runs every N minutes
**When to use:** Periodic background work that needs app state access
**Example:**
```rust
// Source: src-tauri/src/plugins/core/calendar.rs:765-795 (established pattern)
pub fn spawn_heartbeat(app_handle: tauri::AppHandle) {
    use std::sync::Arc;
    use tauri::{Emitter, Manager};

    tauri::async_runtime::spawn(async move {
        // Read interval from settings, default 30 min
        let interval_mins = get_heartbeat_interval(&app_handle).unwrap_or(30);
        let mut interval = tokio::time::interval(
            std::time::Duration::from_secs(interval_mins * 60)
        );
        interval.tick().await; // skip immediate first tick

        loop {
            interval.tick().await;
            if let Err(e) = run_heartbeat_tick(&app_handle).await {
                eprintln!("Heartbeat tick failed: {}", e);
            }
        }
    });
}
```

### Pattern 2: Risk Calculation (pure deterministic functions)
**What:** Calculate remaining work vs remaining capacity for each task with a due date
**When to use:** Core heartbeat logic -- no LLM, no side effects
**Example:**
```rust
// Pure function: no DB access, no IO
pub fn assess_deadline_risks(
    tasks: &[TaskWithDueDate],
    daily_capacity: &[(NaiveDate, i32)],  // date -> available_minutes
    today: NaiveDate,
) -> Vec<DeadlineRisk> {
    tasks.iter().filter_map(|task| {
        let due = task.due_date?;
        if due < today { return Some(DeadlineRisk::Overdue(task)); }

        let days_remaining = (due - today).num_days();
        let capacity: i32 = daily_capacity.iter()
            .filter(|(date, _)| *date >= today && *date <= due)
            .map(|(_, mins)| mins)
            .sum();

        let needed = task.estimated_minutes.unwrap_or(0);
        if needed == 0 {
            return Some(DeadlineRisk::NoEstimate { task, days_remaining });
        }
        if needed > capacity {
            return Some(DeadlineRisk::AtRisk { task, needed, capacity, days_remaining });
        }
        None
    }).collect()
}
```

### Pattern 3: Provider Fallback Chain (heartbeat-specific)
**What:** Try Ollama first, then heartbeat-specific provider, then CLI, then deterministic template
**When to use:** Generating human-readable risk summaries
**Example:**
```rust
async fn generate_risk_summary(
    risks: &[DeadlineRisk],
    app_handle: &AppHandle,
) -> String {
    // 1. Try Ollama (test_connection with 2s timeout)
    if let Some(summary) = try_ollama_summary(risks, app_handle).await {
        return summary;
    }
    // 2. Try heartbeat-specific provider from app_settings
    if let Some(summary) = try_heartbeat_provider_summary(risks, app_handle).await {
        return summary;
    }
    // 3. Try CLI tool
    if let Some(summary) = try_cli_summary(risks, app_handle).await {
        return summary;
    }
    // 4. Deterministic template fallback (always works)
    build_deterministic_summary(risks)
}
```

### Pattern 4: Risk Event Deduplication (D-08)
**What:** Track which risk events have been notified to avoid nagging
**When to use:** Each heartbeat tick, before creating notifications
**Example:**
```rust
// Use app_settings or a dedicated table to track last-notified risk state per task
// Key: "heartbeat_risk_{task_id}", Value: "{risk_level}_{date}"
// A NEW risk event means: risk level worsened OR a new day passed
fn is_new_risk_event(
    db: &Database,
    task_id: &str,
    current_risk: &DeadlineRisk,
    today: NaiveDate,
) -> bool {
    let key = format!("heartbeat_risk_{}", task_id);
    match db.get_app_setting(&key) {
        Ok(Some(prev)) => {
            let current_fingerprint = format!("{}_{}", current_risk.severity(), today);
            prev != current_fingerprint
        }
        _ => true, // Never notified before
    }
}
```

### Anti-Patterns to Avoid
- **LLM for risk detection:** The risk calculation MUST be deterministic math. LLM is ONLY for narrating the results. Never let the LLM decide whether something is "at risk."
- **Blocking the main thread with heartbeat:** The heartbeat runs in a spawned tokio task. DB lock acquisition must be scoped (lock, extract data, drop lock) -- never hold the lock across an await point.
- **Auto-applying schedule changes:** All changes follow suggest-never-auto-apply. The heartbeat suggests, the user confirms through chat.
- **Alerting on backlog items:** Tasks in 999.x phases must be filtered before risk assessment. This is a hard filter, not a soft priority reduction.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background timer | Custom thread + sleep loop | `tokio::time::interval` | Handles drift, cancellation, and integrates with async runtime |
| Ollama health check | Custom HTTP ping | `OllamaProvider::test_connection()` | Already implements 2s timeout, handles connect errors gracefully |
| Notification creation | Manual SQL + event emit | `Database::create_notification()` + existing notification commands | Already handles pruning, OS-level alerts for critical priority, event emission |
| Open time block calculation | Manual calendar gap math | `find_open_blocks()` from `scheduling/time_blocks.rs` | Already handles buffer minutes, work hours, event overlap merging |
| Task scoring/priority | Custom priority logic | `score_task()` from `scheduling/assignment.rs` | Already weights priority + due date urgency consistently |
| AI provider dispatch | Manual if/else chain | `AiGateway` methods + `AiProvider` trait | Already handles Ollama, CLI, API providers with streaming |

**Key insight:** This phase is primarily a composition of existing subsystems (scheduling engine + AI gateway + notification system) connected by a new background timer. The only genuinely new logic is the risk calculation math and the deduplication tracking.

## Common Pitfalls

### Pitfall 1: DB Lock Held Across Await
**What goes wrong:** Heartbeat acquires DB mutex, then calls an async LLM provider while holding the lock. All other DB operations block for seconds.
**Why it happens:** Natural to write `let db = state.lock(); let risks = calculate(db); let summary = provider.complete(request).await;` -- but the lock is held across the await.
**How to avoid:** Scope DB access in blocks. Extract all needed data, drop the lock, then do async work. Established pattern in `start_background_sync` and `generate_briefing`.
**Warning signs:** Frontend becomes unresponsive during heartbeat ticks.

### Pitfall 2: Capacity Calculation Only Checks Today
**What goes wrong:** Heartbeat computes available time for today only, missing that a task due Friday has 3 more workdays of capacity.
**Why it happens:** Reusing `generate_schedule(date)` which is designed for single-day scheduling.
**How to avoid:** The risk calculator must iterate from today through the due date, computing `find_open_blocks` for each workday. Sum total available minutes across all days. Check each day is a work day using `WorkHoursConfig.work_days`.
**Warning signs:** Tasks due next week flagged as at-risk when they have plenty of time across multiple days.

### Pitfall 3: Calendar Events Not Available for Future Days
**What goes wrong:** The heartbeat can only calculate capacity for days where calendar events have been synced. Future days may have no synced events yet.
**Why it happens:** Calendar sync may only fetch events for a limited window. Phase 26 calendar sync details are upstream.
**How to avoid:** When no calendar events exist for a future day, treat the day as fully open (work hours only). This is optimistic but avoids false alarms. Document this assumption.
**Warning signs:** Risk calculation gives different results than what the calendar view shows.

### Pitfall 4: Backlog Filter Missing Edge Cases
**What goes wrong:** Tasks in 999.x phases still trigger heartbeat alerts.
**Why it happens:** Phase name matching is fragile. Phases might be named "999.1 - Backlog Ideas" or have sort_order values that don't clearly indicate backlog.
**How to avoid:** Use phase name prefix matching (`name LIKE '999.%'` or `name LIKE '999 %'`). The existing `planning_sync.rs` uses regex `^### Phase 999` for this. Also filter tasks with no phase assignment IF they have no due date (they're inherently unscheduled).
**Warning signs:** User sees notifications for backlog items they explicitly parked.

### Pitfall 5: Notification Storm on First Run
**What goes wrong:** First heartbeat tick finds 20 at-risk tasks and creates 20 notifications at once.
**Why it happens:** No deduplication state exists yet, so everything is "new."
**How to avoid:** On the very first heartbeat run (no previous risk fingerprints), cap notifications at 3-5 most urgent and summarize the rest ("...and 15 more tasks at risk"). Set risk fingerprints for all assessed tasks so subsequent ticks are incremental.
**Warning signs:** Notification panel flooded, user overwhelmed, turns off heartbeat.

### Pitfall 6: Heartbeat Interval Not Reconfigurable Without Restart
**What goes wrong:** User changes interval from 30 to 15 minutes in settings, but the running `tokio::interval` still fires every 30 minutes.
**Why it happens:** `tokio::time::interval` is created once with a fixed duration.
**How to avoid:** Re-read interval setting at each tick and recreate the interval if changed, OR use `tokio::time::sleep` in a loop instead of `interval` so each iteration reads the current setting.
**Warning signs:** User changes setting, nothing changes until app restart.

## Code Examples

### Risk Assessment Data Flow
```rust
// Source: Composed from existing codebase patterns

/// Single heartbeat tick -- called every N minutes
async fn run_heartbeat_tick(app_handle: &AppHandle) -> Result<(), String> {
    let db_state = app_handle.try_state::<Arc<Mutex<Database>>>()
        .ok_or("No DB state")?;

    // 1. Extract all needed data (scoped lock)
    let (tasks, work_hours, calendar_events_by_date) = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        let tasks = get_tasks_with_due_dates_excluding_backlog(&db)?;
        let work_hours = read_work_hours_from_db(&db)?;
        let events = get_calendar_events_for_range(&db, today, max_due_date)?;
        (tasks, work_hours, events)
    };
    // Lock is dropped here

    // 2. Calculate capacity per day (pure math)
    let daily_capacity = calculate_daily_capacity(
        &work_hours,
        &calendar_events_by_date,
        today,
        max_due_date,
    );

    // 3. Assess risks (pure math)
    let risks = assess_deadline_risks(&tasks, &daily_capacity, today);

    if risks.is_empty() {
        return Ok(());
    }

    // 4. Generate summary (async -- Ollama/CLI/template)
    let summary = generate_risk_summary(&risks, app_handle).await;

    // 5. Create notifications for new risk events (scoped lock)
    {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        for risk in &risks {
            if is_new_risk_event(&db, risk) {
                create_risk_notification(&db, risk, &summary)?;
                update_risk_fingerprint(&db, risk)?;
            }
        }
    }

    // 6. Emit heartbeat event for frontend awareness
    let _ = app_handle.emit("heartbeat-risks-updated", &risks);

    Ok(())
}
```

### Backlog Exclusion Query
```rust
// Source: Follows planning_sync.rs backlog detection pattern

fn get_tasks_with_due_dates_excluding_backlog(db: &Database) -> Result<Vec<TaskWithDueDate>, String> {
    let mut stmt = db.conn().prepare(
        "SELECT t.id, t.title, t.due_date, t.estimated_minutes, t.status, t.project_id, p.name as phase_name
         FROM tasks t
         LEFT JOIN phases p ON t.phase_id = p.id
         WHERE t.status != 'complete'
           AND t.due_date IS NOT NULL
           AND (p.name IS NULL OR (p.name NOT LIKE '999.%' AND p.name NOT LIKE '999 %'))"
    ).map_err(|e| e.to_string())?;
    // ... map rows to TaskWithDueDate
}
```

### Deterministic Fallback Template (D-17)
```rust
fn build_deterministic_summary(risks: &[DeadlineRisk]) -> String {
    let mut lines = Vec::new();
    for risk in risks {
        match risk {
            DeadlineRisk::AtRisk { task, needed, capacity, days_remaining } => {
                lines.push(format!(
                    "{}: {}h needed, {}h available, due in {} day{}.",
                    task.title,
                    needed / 60,
                    capacity / 60,
                    days_remaining,
                    if *days_remaining == 1 { "" } else { "s" }
                ));
            }
            DeadlineRisk::NoEstimate { task, days_remaining } => {
                lines.push(format!(
                    "{}: due in {} day{} but has no time estimate.",
                    task.title,
                    days_remaining,
                    if *days_remaining == 1 { "" } else { "s" }
                ));
            }
            DeadlineRisk::Overdue(task) => {
                lines.push(format!("{}: overdue.", task.title));
            }
        }
    }
    lines.join("\n")
}
```

### Notification with Action URL (D-09)
```rust
// Source: models/notification.rs pattern + D-09 decision
fn create_risk_notification(
    db: &Database,
    risk: &DeadlineRisk,
    summary: &str,
) -> Result<(), String> {
    let (title, priority) = match risk.severity() {
        RiskSeverity::Critical => ("Deadline at risk", "critical"),
        RiskSeverity::Warning => ("Deadline warning", "high"),
        RiskSeverity::Info => ("Missing estimate", "normal"),
    };

    let suggestion = risk.suggested_fix().unwrap_or_default();
    // action_url encodes the pre-loaded chat context
    let action_url = format!(
        "/hub?chat_context={}",
        urlencoding::encode(&suggestion)
    );

    db.create_notification(CreateNotificationInput {
        title: title.to_string(),
        body: summary.to_string(),
        priority: priority.to_string(),
        category: Some("deadline-risk".to_string()),
        project_id: Some(risk.project_id().to_string()),
        action_url: Some(action_url),
    }).map_err(|e| e.to_string())?;

    Ok(())
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cron-based scheduler for background tasks | tokio::time::interval for simple periodic tasks | Already in codebase | Calendar sync uses interval loop, not cron. Heartbeat should follow same pattern |
| Single AI provider for all features | Per-feature provider configuration | v1.4 (D-18 decision) | Heartbeat gets its own provider setting, separate from main AI |

**Deprecated/outdated:**
- None relevant. All crate versions in Cargo.toml are current.

## Open Questions

1. **Calendar event availability for future dates**
   - What we know: Calendar sync (Phase 26) fetches events from Google/Outlook. The sync window is likely limited.
   - What's unclear: How far ahead does the sync fetch? Can we rely on events existing for dates 7+ days out?
   - Recommendation: Treat missing calendar data as "fully open day" (optimistic). Document this assumption. If Phase 26 provides a sync window config, use it.

2. **Heartbeat provider as separate setting vs separate ai_providers row**
   - What we know: D-18 says user can configure a dedicated heartbeat AI provider. The ai_providers table stores providers with is_default flag.
   - What's unclear: Should this be a new app_setting key ("heartbeat_provider_id") pointing to an ai_providers row, or a completely separate config?
   - Recommendation: Use app_setting key "heartbeat_provider_id" that references an existing ai_providers row ID. Simplest approach, reuses existing infrastructure.

3. **Briefing integration mechanism (D-06)**
   - What we know: Daily briefing is generated by `generate_briefing` from a manifest string. Heartbeat risks should appear in the briefing.
   - What's unclear: Should heartbeat write risk data into the manifest cache, or should the briefing system query heartbeat results?
   - Recommendation: Store latest risk assessment in a managed state (`HeartbeatState`) and have the briefing system prompt include risk data when available. The manifest rebuilder already runs on a debounced trigger.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust built-in `#[cfg(test)]` + `#[test]` |
| Config file | None needed (Cargo built-in) |
| Quick run command | `cargo test -p element --lib heartbeat` |
| Full suite command | `cargo test -p element --lib` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BEAT-01 | Risk calculation: remaining work vs capacity | unit | `cargo test -p element --lib heartbeat::risk::tests -x` | No -- Wave 0 |
| BEAT-01 | Multi-day capacity aggregation | unit | `cargo test -p element --lib heartbeat::risk::tests::multi_day -x` | No -- Wave 0 |
| BEAT-02 | Provider fallback chain (Ollama -> CLI -> template) | unit | `cargo test -p element --lib heartbeat::summary::tests -x` | No -- Wave 0 |
| BEAT-03 | Notification creation with correct category/action_url | unit | `cargo test -p element --lib heartbeat::tests::notification -x` | No -- Wave 0 |
| BEAT-03 | Risk event deduplication (no nagging) | unit | `cargo test -p element --lib heartbeat::tests::dedup -x` | No -- Wave 0 |
| BEAT-04 | Backlog exclusion (999.x phases filtered) | unit | `cargo test -p element --lib heartbeat::risk::tests::backlog -x` | No -- Wave 0 |
| BEAT-04 | Tasks with no phase but no due date are excluded | unit | `cargo test -p element --lib heartbeat::risk::tests::no_phase -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cargo test -p element --lib heartbeat`
- **Per wave merge:** `cargo test -p element --lib`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/heartbeat/risk.rs` -- unit tests for risk calculation (BEAT-01, BEAT-04)
- [ ] `src-tauri/src/heartbeat/summary.rs` -- unit tests for fallback chain (BEAT-02)
- [ ] `src-tauri/src/heartbeat/mod.rs` -- integration tests for notification creation and dedup (BEAT-03)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src-tauri/src/plugins/core/calendar.rs:765-795` -- background timer pattern
- Codebase analysis: `src-tauri/src/commands/manifest_commands.rs` -- streaming LLM + debounced background pattern
- Codebase analysis: `src-tauri/src/ai/ollama.rs` -- OllamaProvider with test_connection()
- Codebase analysis: `src-tauri/src/scheduling/time_blocks.rs` -- find_open_blocks() for capacity calculation
- Codebase analysis: `src-tauri/src/scheduling/assignment.rs` -- score_task() and task assignment
- Codebase analysis: `src-tauri/src/models/notification.rs` -- notification CRUD with priority/category/action_url
- Codebase analysis: `src-tauri/src/models/planning_sync.rs` -- backlog (999.x) detection pattern
- Codebase analysis: `src-tauri/src/lib.rs` -- app setup, state management, background task spawning
- Codebase analysis: `src-tauri/src/engine/scheduler.rs` -- tokio-cron-scheduler pattern (reference, not used for heartbeat)

### Secondary (MEDIUM confidence)
- tokio documentation for `tokio::time::interval` behavior (tick drift, missed ticks)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all crates already in Cargo.toml, no new dependencies
- Architecture: HIGH -- follows established patterns from calendar sync and manifest rebuilder
- Pitfalls: HIGH -- derived from direct codebase analysis of lock scoping, data flow patterns
- Risk calculation: HIGH -- deterministic math with well-understood inputs (estimated_minutes, due_date, open_blocks)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- no external API dependencies, all local code)
