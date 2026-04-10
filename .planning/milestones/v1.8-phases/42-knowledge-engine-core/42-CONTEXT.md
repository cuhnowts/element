# Phase 42: Knowledge Plugin Implementation (REWORK) - Context

**Gathered:** 2026-04-06, **Updated:** 2026-04-10
**Status:** Needs replanning

## REWORK REASON — READ FIRST

The knowledge engine was previously built as a **hardcoded Rust module**, not as a plugin through PluginHost. A code audit on 2026-04-10 found:

1. **4 hardcoded Tauri commands** in `src-tauri/src/lib.rs` invoke_handler: `knowledge_ingest`, `knowledge_ingest_text`, `knowledge_query`, `knowledge_lint` — these bypass the plugin dispatch system entirely
2. **`dispatch_plugin_skill()` is a stub** — returns `{"status": "dispatched"}` but never executes any handler (`src-tauri/src/plugins/mod.rs` lines ~288-299)
3. **No `plugin.json` manifest** exists for knowledge — it's not in the plugins directory
4. **`KnowledgeEngine` is initialized directly** in `lib.rs` setup, not through `PluginHost`
5. **No `SkillHandler` trait or handler registry** exists — the skill dispatch has no execution path

The Rust knowledge engine code itself (ingest, query, lint) works correctly. The issue is purely the wiring — it needs to route through the plugin system, not around it.

**Prior execution artifacts archived to `_invalid_prior_execution/`** — do not reference old plans or summaries.

<domain>
## Phase Boundary

Make the existing knowledge engine a true drop-in plugin: create a `plugin.json` manifest declaring skills and directories, implement the `SkillHandler` trait so `dispatch_plugin_skill` actually executes handlers, wire `KnowledgeSkillHandler` to wrap the existing `KnowledgeEngine`, register through `PluginHost`, and remove the 4 hardcoded Tauri commands.

The underlying Rust knowledge engine code (ingest pipeline, query synthesis, lint) is reusable as-is. This phase is about wiring, not rewriting.

</domain>

<decisions>
## Implementation Decisions

### From Original Context (still valid)
- **D-01:** Each raw source produces exactly one wiki article
- **D-02:** Accepted source formats: text-readable files plus URLs
- **D-03:** Wiki articles named with LLM-generated slugs
- **D-04:** Rich YAML frontmatter on wiki articles
- **D-05:** Query retrieval via LLM reading full index.md
- **D-06:** Footnote-style references in synthesized answers
- **D-07:** LLM selects 1-5 articles per query
- **D-08:** Query answers returned only, not persisted
- **D-09:** Five lint categories (stale, broken links, thin, orphan, contradictions)
- **D-10:** Lint output format at Claude's discretion
- **D-11:** Wiki mutations serialized via tokio::Mutex
- **D-12:** Single global mutex for writes, reads bypass lock

### Rework Decisions (new)
- **D-13:** `dispatch_plugin_skill` must resolve to a real handler and execute it — not return a stub
- **D-14:** A `SkillHandler` trait (or equivalent) is needed so plugins can register executable skill handlers
- **D-15:** `KnowledgeSkillHandler` wraps the existing `KnowledgeEngine` — no rewrite of engine internals
- **D-16:** The 4 hardcoded knowledge Tauri commands must be removed after dispatch works end-to-end
- **D-17:** Knowledge plugin registers as a core plugin (like calendar, shell, http, filesystem) via PluginHost

</decisions>

<what_exists>
## What Already Exists in Codebase

### Knowledge Engine (works, keep as-is)
- `src-tauri/src/knowledge/mod.rs` — KnowledgeEngine with ingest, query, lint operations
- `src-tauri/src/knowledge/types.rs` — IngestResult, QueryResult, LintResult types
- `src-tauri/src/knowledge/frontmatter.rs`, `index.rs`, `ingest.rs`, `query.rs`, `lint.rs` — internals
- `src-tauri/src/commands/knowledge_commands.rs` — 4 hardcoded commands (TO BE REMOVED)

### Plugin Infrastructure (Phase 41, works)
- `src-tauri/src/plugins/manifest.rs` — PluginManifest with skills, mcp_tools, owned_directories
- `src-tauri/src/plugins/registry.rs` — PluginRegistry, SkillRegistry, McpToolRegistry
- `src-tauri/src/plugins/mod.rs` — PluginHost with scan_and_load, enable/disable lifecycle
- `src-tauri/src/plugins/core/` — Core plugins (calendar, filesystem, http, shell) as reference
- `src-tauri/src/commands/plugin_commands.rs` — `dispatch_plugin_skill` (STUB), `list_plugin_skills`

### Frontend Plugin Wiring (Phase 43, partially works)
- `src/lib/pluginToolRegistry.ts` — PluginToolDefinition, getPluginToolDefinitions(), dispatchPluginSkill()
- `src/hooks/usePluginTools.ts` — React hook for fetching/dispatching plugin skills
- `src/components/hub/HubChat.tsx` — Dynamic prompt assembly, plugin dispatch routing (works if backend dispatch works)
- `src/components/hub/ActionConfirmCard.tsx` — Has wiki-specific hardcoded entries (Phase 43 issue)

### AI Infrastructure
- `src-tauri/src/ai/provider.rs` — AiProvider trait
- `src-tauri/src/ai/gateway.rs` — AiGateway for provider resolution

</what_exists>

<canonical_refs>
## Canonical References

- `src-tauri/src/plugins/mod.rs` — PluginHost, dispatch_skill (THE STUB to fix)
- `src-tauri/src/plugins/registry.rs` — SkillRegistry (has register/unregister but no handler execution)
- `src-tauri/src/plugins/core/mod.rs` — Where core plugins are registered
- `src-tauri/src/commands/plugin_commands.rs` — dispatch_plugin_skill command
- `src-tauri/src/knowledge/mod.rs` — KnowledgeEngine to wrap
- `src-tauri/src/lib.rs` — App setup (hardcoded knowledge init + invoke_handler registration)
- `.planning/REQUIREMENTS.md` — WIKI-01 through WIKI-06

</canonical_refs>

<deferred>
## Deferred Ideas

- **WIKI-08:** Query results filed back as wiki articles
- **WIKI-09:** Batch ingest
- **Vector search:** For wikis exceeding ~200 articles
- **PDF/binary ingest:** Only text-readable formats and URLs

</deferred>

---

*Phase: 42-knowledge-engine-core*
*Context updated: 2026-04-10 — rework audit findings*
