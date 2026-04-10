---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Plugin-First Knowledge
status: Ready to plan
stopped_at: Phase 46 context gathered
last_updated: "2026-04-10T20:00:39.123Z"
progress:
  total_phases: 15
  completed_phases: 5
  total_plans: 8
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** The AI agent must reliably orchestrate project work -- planning, executing, and monitoring across all projects so the user focuses on decisions, not mechanics.
**Current focus:** Phase 44 — mcp-server-wiki-tools

## Current Position

Phase: 44
Plan: Not started

## Rework Context (2026-04-10)

Code audit found Phase 42-43 execution was invalid:

- `dispatch_plugin_skill()` is a stub returning `{"status": "dispatched"}` — never executes handlers
- Knowledge has 4 hardcoded Tauri commands bypassing plugin system entirely
- `KnowledgeEngine` initialized directly in lib.rs, not through PluginHost
- No SkillHandler trait or handler execution path exists
- Frontend plugin wiring (Phase 43) works but depends on backend dispatch actually working

Replan order: 42 (backend dispatch + knowledge as plugin) → 43 (generify confirmation cards) → 44 (MCP bridge)
Prior artifacts archived to `_invalid_prior_execution/` in each phase directory.

## Performance Metrics

**Velocity:**

- Total plans completed: 83+ (v1.0-v1.7)
- Average duration: carried from previous milestones
- Total execution time: carried from previous milestones

**Recent Trend:**

- v1.0: 6 phases in 7 days
- v1.1: 6 phases in 3 days
- v1.2: 5 phases in 1 day
- v1.3: 5 phases in 2 days
- v1.4: 4 phases in 2 days
- v1.5: 7 phases in 2 days
- v1.6: 5 phases in 1 day
- v1.7: 5 phases in 1 day
- Trend: Accelerating

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.8 Roadmap]: Zero new dependencies -- all extensions to existing Rust/TS stack
- [v1.8 Roadmap]: Single dispatch_plugin_skill Tauri command for all plugin skills
- [v1.8 Roadmap]: Operation queue via tokio::mpsc for wiki concurrency safety
- [v1.8 Roadmap]: Source hash tracking in wiki article frontmatter from day one
- [v1.8 Roadmap]: Hub chat is the wiki interface -- no separate wiki browser UI
- [Phase 42]: KnowledgeSkillHandler gets own AiGateway instance (stateless) rather than sharing via Arc to avoid breaking existing command signatures
- [Phase 42]: Two-step dispatch: verify skill in PluginHost (sync), drop lock, then dispatch to SkillHandlerRegistry (async)
- [Phase 43]: Keep buildSystemPrompt as separate exported module for testability
- [Phase 43]: Test HubChat dispatch routing via appendChunk interception rather than pure function extraction
- [Phase 44]: Core plugins use CORE_HANDLERS map for direct dispatch; user plugins use plugin.json + dynamic import

### Pending Todos

None yet.

### Blockers/Concerns

- Research flag: LLM prompt design for ingest operation needs iteration during Phase 42
- Research flag: index.md size budget (2K tokens) needs validation at 50-article scale
- Known security hole: PathBuf::from("/") in plugin_commands.rs must be fixed in Phase 41

## Session Continuity

Last session: 2026-04-10T20:00:39.119Z
Stopped at: Phase 46 context gathered
Resume file: .planning/phases/46-bug-fixes/46-CONTEXT.md
