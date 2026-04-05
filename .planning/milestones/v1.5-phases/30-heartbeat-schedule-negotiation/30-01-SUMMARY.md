---
phase: 30-heartbeat-schedule-negotiation
plan: 01
subsystem: heartbeat-core
tags: [heartbeat, risk-detection, llm-fallback, deterministic-scheduling]
dependency_graph:
  requires: [scheduling/time_blocks, ai/ollama, ai/gateway]
  provides: [heartbeat/types, heartbeat/risk, heartbeat/summary]
  affects: [future heartbeat timer (plan 02), frontend risk display (plan 03)]
tech_stack:
  added: []
  patterns: [pure-function risk math, provider fallback chain, scoped DB locks]
key_files:
  created:
    - src-tauri/src/heartbeat/mod.rs
    - src-tauri/src/heartbeat/types.rs
    - src-tauri/src/heartbeat/risk.rs
    - src-tauri/src/heartbeat/summary.rs
  modified:
    - src-tauri/src/lib.rs
decisions:
  - "RiskSeverity derives Ord for sorting (Critical < Warning < Info)"
  - "Ollama defaults to llama3.2:3b model for heartbeat summaries"
  - "format_hours helper shows whole numbers without decimals"
metrics:
  duration: "~6 minutes"
  completed: "2026-04-04"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 16
---

# Phase 30 Plan 01: Heartbeat Core Types & Risk Calculation Summary

Deterministic deadline risk calculator with DeadlineRisk enum (Overdue/AtRisk/NoEstimate), multi-day capacity aggregation via find_open_blocks, backlog filtering, and LLM summary fallback chain (Ollama -> heartbeat provider -> CLI -> deterministic template).

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Heartbeat types and deterministic risk calculation | 06966fb | types.rs, risk.rs, mod.rs |
| 2 | LLM summary generation with provider fallback chain | 8ec2eb9 | summary.rs |

## What Was Built

### Task 1: Types and Risk Calculation
- `TaskWithDueDate` struct with project context, due date, estimate, and backlog flag
- `DeadlineRisk` enum: Overdue, AtRisk (with needed/available minutes), NoEstimate (with days remaining)
- `RiskSeverity` enum: Critical (overdue or <=1 day), Warning (<=3 days), Info (>3 days)
- `HeartbeatConfig` struct for timer settings and provider configuration
- `DeadlineRisk` impl: severity(), task(), task_id(), project_id(), suggested_fix(), risk_fingerprint()
- `calculate_daily_capacity()`: iterates date range, skips non-work days, sums open blocks per day
- `assess_deadline_risks()`: filters backlog tasks, classifies each task, sorts by severity then urgency
- 10 unit tests covering at-risk detection, overdue, no-estimate, backlog filtering, sorting, capacity with/without events, weekend skipping

### Task 2: LLM Summary with Fallback Chain
- `build_deterministic_summary()`: formats each risk into a human-readable line (always works, no LLM needed)
- `build_risk_prompt()`: structures risk data into an LLM system prompt for narrative summary
- `generate_risk_summary()`: implements D-15/D-16/D-17 fallback chain
  1. Ollama (test_connection with 2s timeout, 3s overall timeout)
  2. Heartbeat-specific provider (from heartbeat_provider_id app setting)
  3. CLI provider (from AiGateway)
  4. Deterministic template (always succeeds)
- DB lock scoped: reads settings under lock, drops lock before async provider calls
- 6 unit tests covering all three risk variants, singular day grammar, multiple risks, and prompt structure

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

```
cargo test --lib heartbeat -- 16 passed, 0 failed
cargo check -- compiles clean (pre-existing warnings only)
```

## Known Stubs

None. All functions are fully implemented. The async `generate_risk_summary` function has real provider resolution logic; it will be integration-tested in Plan 02 when the background timer is wired.

## Self-Check: PASSED
