---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Daily Hub
status: planning
stopped_at: Phase 25 UI-SPEC approved
last_updated: "2026-04-01T11:02:43.097Z"
last_activity: 2026-03-31 -- Roadmap created for v1.4 Daily Hub
progress:
  total_phases: 10
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** The AI agent must reliably orchestrate project work -- planning, executing, and monitoring across all projects so the user focuses on decisions, not mechanics.
**Current focus:** Phase 22 -- Hub Shell and Goals Tree

## Current Position

Phase: 22 of 25 (Hub Shell and Goals Tree)
Plan: 1 of 3 complete in current phase
Status: Executing
Last activity: 2026-04-01 -- Completed 22-01-PLAN.md (activeView routing and hub foundation)

Progress: [███░░░░░░░] 33%

## Performance Metrics

**Velocity:**

- Total plans completed: 60 (v1.0: 29, v1.1: 17, v1.2: 10, v1.3: 16)
- Average duration: carried from previous milestones
- Total execution time: carried from previous milestones

**Recent Trend:**

- v1.0: 6 phases in 7 days
- v1.1: 6 phases in 3 days
- v1.2: 5 phases in 1 day
- v1.3: 5 phases in 2 days
- Trend: Accelerating

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.4 roadmap]: Hub shell + goals tree first (zero AI deps) before briefing/chat
- [v1.4 roadmap]: Hub chat uses AI gateway directly, not MCP sidecar file-based queue
- [v1.4 roadmap]: Context manifest is in-memory only, never written to disk
- [v1.4 roadmap]: Columns are minimizable/expandable with restore buttons
- [v1.4 roadmap]: Bot skills and MCP write tools combined into single phase (interactive + background)
- [v1.4 research]: Agent lifecycle must be lifted from AgentPanel to AppLayout before hub features
- [v1.4 research]: CenterPanel needs explicit activeView state, not TodayView fallback
- [Phase 22]: activeView defaults to hub on every launch (not persisted) -- D-07
- [Phase 22]: CenterPanel uses switch(activeView) not cascading if/else -- TodayView removed
- [Phase 22]: Workflow callers set activeView at call site since useWorkflowStore is separate store

### Pending Todos

None yet.

### Blockers/Concerns

- CenterPanel routing change is high-recovery-cost if done wrong (research flagged)
- Action JSON parsing robustness varies by AI provider (research flagged for Phase 25)
- xterm.js memory growth with multiple terminals (~34MB per instance, dispose() leaks)

## Session Continuity

Last session: 2026-04-01T23:46:35Z
Stopped at: Completed 22-01-PLAN.md
Resume file: .planning/phases/22-hub-shell-and-goals-tree/22-02-PLAN.md
