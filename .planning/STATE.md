---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Daily Hub
status: Ready to plan
stopped_at: Completed 25-03-PLAN.md
last_updated: "2026-04-02T11:02:49.844Z"
progress:
  total_phases: 10
  completed_phases: 3
  total_plans: 12
  completed_plans: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** The AI agent must reliably orchestrate project work -- planning, executing, and monitoring across all projects so the user focuses on decisions, not mechanics.
**Current focus:** Phase 25 — bot-skills-and-mcp-write-tools

## Current Position

Phase: 999.4
Plan: Not started

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
- [Phase 22]: Used panelRef prop and onResize callback (react-resizable-panels v4 API) instead of ref/onCollapse/onExpand
- [Phase 22]: Phase/project progress derived from task statuses at render time (no stored status field on Phase)
- [Phase 24]: Chat streaming uses hub-chat-stream-* events to avoid collision with existing ai-stream-* channel
- [Phase 24]: AtomicBool with SeqCst for cancel flag -- simple, no mutex on hot path
- [Phase 23]: Manifest uses project+phase level only (no individual tasks) for token efficiency
- [Phase 23]: Briefing system prompt is time-aware (morning/afternoon/evening)
- [Phase 23]: Debounce uses tokio mpsc channel with try_send (non-blocking) in mutation commands
- [Phase 24]: useHubChatStore fully standalone from useAgentStore (D-12)
- [Phase 23]: Standalone Zustand store for briefing (useBriefingStore), not AppStore slice
- [Phase 23]: BriefingPanel wired into HubCenterPanel (not CenterPanel) since hub routes through HubView
- [Phase 25]: Registry uses flat array with find-by-name lookup for 9 bot skill definitions
- [Phase 25]: Shell metacharacter regex rejects all injection vectors before allowlist matching
- [Phase 25]: MCP write handlers emit data-changed notifications via agent queue for UI refresh
- [Phase 25]: Phase status is informational only (derived from task completion, no DB column)
- [Phase 25]: Extended MULTI_WORD_PREFIXES to include cargo/docker/kubectl for correct custom allowlist matching
- [Phase 25]: Extended ChatRequest with tools field to enable tool_use in hub chat path (chat_stream)
- [Phase 25]: Tool_use events sent through same event_sender channel, frontend parses JSON vs text

### Pending Todos

None yet.

### Blockers/Concerns

- CenterPanel routing change is high-recovery-cost if done wrong (research flagged)
- Action JSON parsing robustness varies by AI provider (research flagged for Phase 25)
- xterm.js memory growth with multiple terminals (~34MB per instance, dispose() leaks)

## Session Continuity

Last session: 2026-04-02T10:56:30.732Z
Stopped at: Completed 25-03-PLAN.md
Resume file: None
