---
phase: 30-heartbeat-schedule-negotiation
plan: 02
subsystem: heartbeat-runtime
tags: [heartbeat, notifications, deduplication, briefing-integration, tauri-commands]
dependency_graph:
  requires: [heartbeat/types, heartbeat/risk, heartbeat/summary, scheduling/time_blocks, ai/gateway, notifications]
  provides: [heartbeat/spawn, heartbeat/state, heartbeat/commands, briefing/risk-channel]
  affects: [frontend risk display (plan 03), daily briefing, notification bell]
tech_stack:
  added: []
  patterns: [sleep-per-tick reconfiguration, scoped DB locks across async boundary, fingerprint deduplication, storm cap]
key_files:
  created:
    - src-tauri/src/commands/heartbeat_commands.rs
  modified:
    - src-tauri/src/heartbeat/mod.rs
    - src-tauri/src/commands/manifest_commands.rs
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/lib.rs
decisions:
  - "Sleep-per-tick pattern (not tokio::interval) for live interval reconfiguration"
  - "First-run storm cap at 5 individual notifications with overflow summary"
  - "Risk fingerprint stored in app_settings with heartbeat_risk_ prefix for deduplication"
  - "Briefing risk summary prepended to manifest (not separate LLM call) for D-06"
  - "Calendar events converted from RFC3339 to HH:mm using same pattern as scheduling_commands"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-04"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 6
---

# Phase 30 Plan 02: Heartbeat Runtime Wiring Summary

Background heartbeat timer with sleep-per-tick reconfiguration, deduplicated deadline-risk notifications via app_settings fingerprints, HeartbeatState for briefing integration, 4 Tauri commands for frontend control, and daily briefing risk summary prepending.

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Background heartbeat loop, notification creation, deduplication, HeartbeatState, and unit tests | 12d0439 | heartbeat/mod.rs |
| 2 | Tauri commands, lib.rs wiring, briefing integration, and command registration | 758ab1a | heartbeat_commands.rs, manifest_commands.rs, lib.rs, commands/mod.rs |

## What Was Built

### Task 1: Background Heartbeat Loop
- `HeartbeatState` struct with `latest_assessment: Arc<Mutex<Option<RiskAssessment>>>` and `running: Arc<AtomicBool>`
- `spawn_heartbeat()` entry point: reads enabled flag, sets running state, spawns tokio loop
- `run_heartbeat_tick()`: scoped DB locks (never held across await), calls risk calculation + summary generation
- `get_tasks_with_due_dates_excluding_backlog()`: SQL query filtering `999.%` and `999 ` phase names
- `get_calendar_events_for_range()`: reuses `list_events_for_range` with RFC3339-to-HH:mm conversion
- `read_work_hours_config()`: reads from app_settings with sensible defaults
- `is_new_risk_event()` + `fingerprint_changed()`: deduplication via `heartbeat_risk_{task_id}` keys in app_settings
- `build_notification_input()`: pure helper creating notifications with category `deadline-risk`, priority mapped from severity, `hub://chat?context=risk&task_id={id}` action URL, and appended suggested fix
- Storm cap: `new_count < 5` gate on individual notifications, overflow summary notification for excess
- 6 unit tests: critical/warning/info priority mapping, suggested fix inclusion, fingerprint comparison logic, storm cap verification

### Task 2: Tauri Commands and Briefing Integration
- `get_heartbeat_config`: reads enabled/interval/provider_id from app_settings
- `set_heartbeat_config`: writes config to app_settings
- `trigger_heartbeat`: manual tick invocation for "check now" button
- `get_heartbeat_status`: returns running flag + latest_assessment as JSON
- `HeartbeatState` managed in app setup (after manifest state, before file watchers)
- `spawn_heartbeat` called after calendar sync in setup closure
- `generate_briefing` updated: reads `heartbeat_state.latest_assessment`, prepends `## Deadline Risk Alert` section to manifest when risks exist (D-06 second channel)
- Briefing system prompt updated to instruct LLM to lead with risk summary when present
- All 4 commands registered in `invoke_handler`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Calendar events schema mismatch**
- **Found during:** Task 1
- **Issue:** Plan assumed `calendar_events` table had `date` and `account_color` columns; actual schema uses RFC3339 `start_time`/`end_time` without a date column
- **Fix:** Rewrote `get_calendar_events_for_range` to use existing `list_events_for_range` function (same pattern as scheduling_commands.rs), converting RFC3339 to local HH:mm format
- **Files modified:** src-tauri/src/heartbeat/mod.rs
- **Commit:** 12d0439

**2. [Rule 3 - Blocking] generate_risk_summary signature mismatch**
- **Found during:** Task 1
- **Issue:** Plan interfaces showed `generate_risk_summary(risks, app_handle)` but actual implementation takes `(risks, db: Arc<Mutex<Database>>)`
- **Fix:** Used actual signature `generate_risk_summary(&risks, db_arc.clone()).await` in run_heartbeat_tick
- **Files modified:** src-tauri/src/heartbeat/mod.rs
- **Commit:** 12d0439

## Verification

```
cargo check --lib: compiles clean (warnings only, all pre-existing)
cargo test --lib heartbeat: 22 passed (16 from Plan 01 + 6 new), 0 failed
```

## Known Stubs

None. All functions are fully implemented with real DB queries, notification creation, and provider fallback chains.

## Self-Check: PASSED
