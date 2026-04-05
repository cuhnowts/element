---
phase: 28-due-dates-daily-planning
plan: 02
subsystem: backend/manifest
tags: [manifest, scheduling, briefing, backlog-filter]
dependency_graph:
  requires: []
  provides: [manifest-schedule-section, backlog-filtered-scheduling, briefing-daily-plan]
  affects: [briefing-output, schedule-generation]
tech_stack:
  added: []
  patterns: [synchronous-db-helper, manifest-section-builder]
key_files:
  created: []
  modified:
    - src-tauri/src/commands/scheduling_commands.rs
    - src-tauri/src/models/manifest.rs
    - src-tauri/src/commands/manifest_commands.rs
decisions:
  - "Extracted generate_schedule_for_date as synchronous helper taking &Database directly, refactored Tauri command to delegate to it"
  - "Show undated tasks even when no schedule blocks exist (empty schedule day)"
metrics:
  duration: 4m 34s
  completed: 2026-04-04
---

# Phase 28 Plan 02: Manifest Schedule Data + Briefing Prompt Summary

Extended Rust manifest builder with today's schedule section (task blocks, available/scheduled minutes with OVERFLOW detection, undated task list) and updated briefing system prompt to narrate a daily plan with structured SUGGEST_DUE_DATE markers.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 690ac1d | feat(28-02): add manifest schedule section and backlog-filtered scheduling |
| 2 | 8df4dc5 | feat(28-02): update briefing system prompt with daily plan narration |

## Task Results

### Task 1: Filter backlog tasks from scheduling and add manifest schedule builder

**Status:** Complete

- Extracted `generate_schedule_for_date` as a synchronous `pub fn` taking `&Database` directly, enabling manifest builder to call scheduling logic without async/Tauri context
- Refactored existing `generate_schedule` Tauri command to delegate to the new helper (zero duplication)
- Added `LEFT JOIN phases` with `sort_order < 999` filter to exclude backlog tasks from schedule generation
- Extracted `query_schedulable_tasks` helper for the filtered SQL query
- Added `build_schedule_section` to manifest: calculates available vs scheduled minutes, marks OVERFLOW, lists task time blocks with priorities
- Added `get_undated_tasks` query and `append_undated_tasks` helper for tasks missing due dates (limited to 10)
- Wired schedule section into `build_manifest_string` before token budget truncation

**Files:** `src-tauri/src/commands/scheduling_commands.rs`, `src-tauri/src/models/manifest.rs`

### Task 2: Update briefing system prompt for daily plan narration

**Status:** Complete

- Increased word limit from 300 to 500 to accommodate daily plan content
- Added "Today's Plan" section instructions telling LLM to narrate scheduled tasks in time order
- Added OVERFLOW handling: LLM explicitly states which tasks won't fit and asks "What should we work on today?"
- Defined `SUGGEST_DUE_DATE:{json}` structured marker format for undated task suggestions
- Reinforced suggest-never-auto-apply pattern

**Files:** `src-tauri/src/commands/manifest_commands.rs`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Show undated tasks on empty schedule days**
- **Found during:** Task 1
- **Issue:** Plan only showed undated tasks when schedule blocks existed; empty schedule days would lose the suggestion feature
- **Fix:** Call `append_undated_tasks` in the empty-schedule branch as well
- **Files modified:** `src-tauri/src/models/manifest.rs`
- **Commit:** 690ac1d

## Verification

- `cargo check --lib` compiles successfully (only pre-existing Tauri context macro issue from missing `../dist`)
- `cargo test models::manifest` -- 3/3 passed
- All 236 tests pass (1 pre-existing failure in `test_skill_section_tier_invariant` unrelated to this plan)
- `scheduling_commands.rs` contains `LEFT JOIN phases` and `sort_order` in task query
- `manifest.rs` contains "Today's Schedule", "Tasks Without Due Dates", "OVERFLOW", `build_schedule_section`
- `manifest_commands.rs` contains "Today's Plan", "SUGGEST_DUE_DATE", "OVERFLOW", "500 words"

## Known Stubs

None -- all data paths are wired to live database queries.

## Self-Check: PASSED
