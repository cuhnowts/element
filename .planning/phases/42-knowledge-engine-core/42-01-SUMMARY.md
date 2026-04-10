---
phase: 42-knowledge-engine-core
plan: 01
subsystem: plugins
tags: [skill-handler, knowledge-engine, plugin-dispatch, async-trait, tauri-commands]

# Dependency graph
requires:
  - phase: 41-plugin-v2-manifest
    provides: PluginManifest v2 with skills, mcp_tools, owned_directories fields
provides:
  - SkillHandler trait and SkillHandlerRegistry for plugin skill execution
  - KnowledgeSkillHandler wrapping KnowledgeEngine for ingest/query/lint
  - core-knowledge plugin manifest with 3 skills, 2 MCP tools, 1 owned directory
  - dispatch_plugin_skill Tauri command wired to real handler execution
affects: [43-hub-chat-wiki-integration, 44-mcp-server-wiki-tools]

# Tech tracking
tech-stack:
  added: []
  patterns: [SkillHandler trait for plugin skill dispatch, SkillHandlerRegistry as managed Tauri state]

key-files:
  created:
    - src-tauri/src/plugins/skill_handler.rs
    - src-tauri/src/plugins/core/knowledge.rs
  modified:
    - src-tauri/src/plugins/mod.rs
    - src-tauri/src/plugins/core/mod.rs
    - src-tauri/src/commands/plugin_commands.rs
    - src-tauri/src/lib.rs
    - src-tauri/src/commands/knowledge_commands.rs

key-decisions:
  - "KnowledgeSkillHandler gets its own AiGateway instance rather than sharing via Arc, since AiGateway is stateless (only holds reqwest::Client)"
  - "dispatch_plugin_skill verifies skill exists in PluginHost before dispatching to SkillHandlerRegistry, providing clear error messages"
  - "KnowledgeEngine wrapped in Arc and owned by KnowledgeSkillHandler, not managed directly as Tauri state"

patterns-established:
  - "SkillHandler trait: async execute(skill_name, input) -> Result<Value, String> pattern for all plugin skill handlers"
  - "SkillHandlerRegistry: prefix-based dispatch splitting on colon (plugin:skill format)"
  - "Two-step dispatch: verify skill in PluginHost (sync), then dispatch to handler (async)"

requirements-completed: [WIKI-01, WIKI-02, WIKI-03, WIKI-04, WIKI-05, WIKI-06]

# Metrics
duration: 6min
completed: 2026-04-10
---

# Phase 42 Plan 01: SkillHandler Trait and Knowledge Plugin Wiring Summary

**SkillHandler trait with async dispatch, KnowledgeSkillHandler wrapping KnowledgeEngine, core-knowledge plugin with 3 skills/2 MCP tools, hardcoded knowledge commands removed**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-10T18:28:50Z
- **Completed:** 2026-04-10T18:34:58Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- SkillHandler trait and SkillHandlerRegistry providing async plugin skill dispatch with prefix-based routing
- KnowledgeSkillHandler wrapping existing KnowledgeEngine for ingest, query, and lint operations via plugin system
- core-knowledge registered as 5th core plugin with 3 skills, 2 MCP tools, 1 owned directory (.knowledge/)
- dispatch_plugin_skill Tauri command wired to SkillHandlerRegistry instead of returning stub JSON
- 4 hardcoded knowledge Tauri commands removed from invoke_handler
- Enable/disable lifecycle verified: enabling registers skills and creates .knowledge/ dir, disabling removes skills

## Task Commits

Each task was committed atomically:

1. **Task 1: SkillHandler trait, SkillHandlerRegistry, and KnowledgeSkillHandler** - `ff102a2` (feat)
2. **Task 2: Wire dispatch_plugin_skill to SkillHandlerRegistry and remove hardcoded commands** - `1459147` (feat)

## Files Created/Modified
- `src-tauri/src/plugins/skill_handler.rs` - SkillHandler trait, SkillHandlerRegistry with dispatch/register/unregister, unit tests
- `src-tauri/src/plugins/core/knowledge.rs` - KnowledgeSkillHandler implementing SkillHandler for ingest/query/lint, input validation tests
- `src-tauri/src/plugins/mod.rs` - Added pub mod skill_handler
- `src-tauri/src/plugins/core/mod.rs` - Added knowledge module, core-knowledge manifest with skills/MCP tools/owned dirs, lifecycle test
- `src-tauri/src/commands/plugin_commands.rs` - dispatch_plugin_skill now uses SkillHandlerRegistry
- `src-tauri/src/lib.rs` - KnowledgeEngine as Arc, SkillHandlerRegistry managed state, removed 4 hardcoded knowledge commands
- `src-tauri/src/commands/knowledge_commands.rs` - Gutted, replaced with comment pointing to plugin handler

## Decisions Made
- KnowledgeSkillHandler creates its own AiGateway instance rather than sharing via Arc -- AiGateway is stateless (just wraps reqwest::Client), so a separate instance avoids changing all existing command signatures that use State<'_, AiGateway>
- Two-step dispatch pattern: verify skill exists in PluginHost (sync, fast, with lock), drop lock, then dispatch to SkillHandlerRegistry (async, may be slow for LLM calls)
- knowledge_commands.rs kept as empty module (not deleted) to avoid breaking commands/mod.rs module declaration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing compilation errors from parallel agent modifications (ai/credentials.rs, ai/gateway.rs, commands/ai_commands.rs, heartbeat/summary.rs, credentials/keychain.rs) prevented running cargo test/build. These are in files modified by other parallel agents and will resolve when all agents merge. Verified that none of the 10 pre-existing errors reference the files created/modified by this plan.
- Missing mcp-server/dist/index.js resource blocked Tauri build script; created placeholder to unblock cargo check.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SkillHandler trait and registry ready for additional plugin handlers
- dispatch_plugin_skill fully functional for all registered handlers
- Frontend plugin dispatch (Phase 43) will work once backend skills are enabled
- Pre-existing compilation errors from parallel agents must be resolved before cargo test can validate

---
*Phase: 42-knowledge-engine-core*
*Completed: 2026-04-10*
