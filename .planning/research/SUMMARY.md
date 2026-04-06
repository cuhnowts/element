# Project Research Summary

**Project:** Element v1.8 — Knowledge Engine + Plugin Skill/MCP Registration
**Domain:** LLM-compiled wiki plugin for Tauri 2.x desktop app with plugin extensibility infrastructure
**Researched:** 2026-04-06
**Confidence:** HIGH

## Executive Summary

v1.8 is an infrastructure milestone dressed as a feature. The user-visible deliverable is a knowledge wiki — ingest raw sources, query compiled knowledge, lint for staleness — but the underlying engineering challenge is evolving the plugin system to support declarative skill and MCP tool registration. The Karpathy LLM-wiki pattern is well-validated: three-layer filesystem structure (raw/, wiki/, index.md), LLM-as-compiler rather than search engine, no vector database until 500+ articles. Element's competitive edge is integration depth — the wiki is not a standalone CLI but memory for the entire orchestration platform, flowing into hub chat, briefings, research agents, and Claude Code via MCP.

The recommended approach is fully additive: zero new Cargo crates, zero new npm packages. The existing stack (Tauri 2.x, tokio, serde, reqwest, MCP SDK, Zustand) handles everything. The core architectural change is evolving the static `ACTION_REGISTRY` array and the hardcoded MCP server tool list into dynamic registries that merge plugin-declared skills and tools at runtime. A single `dispatch_plugin_skill` Tauri command routes all plugin skill invocations, avoiding one command per skill. The knowledge engine itself ships as a fifth core plugin alongside shell, http, filesystem, and calendar.

The top risks are correctness risks, not technology risks. Concurrent wiki file access can silently corrupt index.md — the only navigation mechanism. Stale wiki content (sources updated after compilation) is worse than no wiki because the LLM trusts compiled knowledge and propagates errors downstream. Skill namespace collisions between plugins produce silent wrong behavior. All three must be designed out in Phase 1, before wiki operations ship. A known security hole (`PathBuf::from("/")` in plugin_commands.rs granting unbounded filesystem access) must be closed as part of the plugin infrastructure work.

## Key Findings

### Recommended Stack

No new dependencies are required. The existing stack handles all v1.8 needs. The work is extending existing Rust structs (PluginManifest with `#[serde(default)]` fields), making TypeScript registries dynamic (actionRegistry.ts `loadDynamicTools()`), and adding a small set of new Rust files (~7 new files, ~9 modified files). This is a structural refactor that enables the plugin extensibility vision without changing any technology choices.

**Core technologies:**
- `tokio::fs` (existing): All `.knowledge/` file I/O — async reads/writes, no new crates needed
- `serde` + `serde_json` (existing): PluginManifest extensions — `#[serde(default)]` ensures existing plugin.json files parse unchanged
- `reqwest` via AiGateway (existing): LLM API calls for ingest/compile/lint — already wired, no changes
- `@modelcontextprotocol/sdk` (existing): Dynamic MCP tool registration — merge plugin tools into existing ListToolsRequestSchema handler
- `node:fs` in mcp-server (existing): Plugin manifest discovery at startup — MCP server reads plugin.json files directly

### Expected Features

**Must have (table stakes — v1.8 launch):**
- Plugin-owned directories — filesystem contract between plugin and host; foundation for everything else
- Plugin skill registration — extends action registry; makes hub chat extensible by plugins
- Plugin MCP tool registration — extends MCP server; makes external agents extensible
- Three-layer `.knowledge/` directory structure — raw/, wiki/, schema.md, index.md, log.md
- Ingest operation — raw source in, compiled wiki articles out, index.md updated, log.md appended
- Query operation — index.md scan, relevant page retrieval, LLM synthesis, hub chat response
- Index operation — rebuild index.md from current wiki/ contents (recovery and manual trigger)
- Lint operation — five checks: thin articles, missing concepts, broken wikilinks, duplicates, new article suggestions
- Hub chat integration — all four operations accessible as hub chat skills

**Should have (add after core loop validated — v1.8.x):**
- Query-to-wiki filing — save valuable query answers as new wiki pages
- Batch ingest — multiple sources, compile once (more token-efficient for bulk imports)
- Wiki-powered briefings and research agents — the compounding flywheel, deferred until ~20 articles exist
- Lint scheduling — periodic lint runs via existing cron/workflow system

**Defer (v2+):**
- Vector search layer — only when wiki exceeds ~500 articles
- Per-project wiki partitions — at 36+ month scale with dozens of projects
- Plugin marketplace skill registration — requires marketplace infrastructure first

### Architecture Approach

The design principle is "plugin-registered skills, unified registry." Plugins declare capabilities in plugin.json (skills[], mcp_tools[], owned_directories[]). At load time, the host creates declared directories, the action registry merges plugin skills, and the MCP server incorporates plugin MCP tools. All plugin skill invocations route through a single `dispatch_plugin_skill` Tauri command to a SkillRouter, which delegates to the owning plugin's handler. Hub chat wiki_query calls LLM for synthesis; MCP wiki_query returns raw content (external agents reason themselves). Write operations from MCP go through the existing `.element/agent-queue/` pattern to prevent concurrent file corruption. The Rust backend is the source of truth for plugin state — the frontend queries backend on mount rather than managing its own plugin state.

**Major components:**
1. **PluginManifest** (extend existing) — add `skills`, `mcp_tools`, `owned_directories` fields with `#[serde(default)]`; add `#[serde(other)]` Unknown variant to PluginCapability enum
2. **SkillRouter** (new Rust module) — central dispatch mapping skill names to plugin handlers; exposes `dispatch_plugin_skill` and `list_plugin_skills` Tauri commands
3. **DirectoryManager** (new Rust, small) — creates plugin-owned directories on activation; scopes filesystem access to declared paths (fixes existing security hole)
4. **KnowledgePlugin** (new core Rust plugin) — implements wiki_ingest, wiki_query, wiki_lint, wiki_status via AiGateway; registered alongside shell/http/filesystem/calendar
5. **Dynamic ActionRegistry** (extend TypeScript) — `loadDynamicTools()` merges static ACTION_REGISTRY + plugin skills on HubChat mount
6. **MCP Server plugin-tools.ts** (new TypeScript module) — loads plugin manifests at MCP server startup, registers mcp_tools dynamically in ListToolsRequestSchema handler

### Critical Pitfalls

1. **Concurrent wiki file access corrupts index.md** — Multiple Tauri commands writing index.md simultaneously silently corrupts the only navigation mechanism. Prevention: serialize all mutation operations through a `tokio::mpsc` channel; atomic writes via `.tmp` then `rename()`; MCP server has read-only access to `.knowledge/`, writes go through `.element/agent-queue/`. Must be designed in Phase 1 before any wiki operations exist.

2. **Plugin manifest backward compatibility** — Strict `PluginCapability` enum without `#[serde(other)]` breaks existing plugins when new capability variants are added. Prevention: add `Unknown` catch-all variant; `#[serde(default)]` on all new manifest fields; version the manifest schema. Must be solved before any manifest extension ships.

3. **Stale wiki content poisons downstream consumers** — Sources updated after compilation create confidently-wrong knowledge. Prevention: store content hashes of raw sources in wiki article frontmatter; lint checks hash drift; log.md records which raw files contributed to each article. Source tracking is the integrity mechanism, not an enhancement.

4. **Skill namespace collisions cause silent wrong behavior** — Two plugins registering the same skill name means the wrong plugin handles the call. Prevention: namespace all skills by plugin name (`knowledge.query`, `calendar.search`); reserve `core.*` namespace for built-ins; validate uniqueness at load time with explicit error on collision.

5. **Hot-reload ghost skills from missing lifecycle hooks** — Plugin reload via file watcher updates PluginRegistry but leaves stale skills registered. Ghost tools cause LLM tool-call errors. Prevention: add `on_load`/`on_unload`/`on_reload` lifecycle hooks; `deregister_by_plugin()` atomically removes all registrations before re-registering new version; emit `skills-changed` event to frontend.

## Implications for Roadmap

Based on the dependency graph from FEATURES.md and the build order from ARCHITECTURE.md, five phases emerge. The ordering is non-negotiable — each phase is a hard dependency for the next.

### Phase 1: Plugin Infrastructure Evolution

**Rationale:** Every other feature depends on the plugin manifest knowing about skills, MCP tools, and owned directories. SkillRouter and DirectoryManager must exist before the knowledge engine can register anything. Pitfalls 2, 4, and 9 (manifest compat, namespace collisions, ghost skills) must be solved here before they become structural debt. The filesystem security hole must be fixed alongside the new scoping work.

**Delivers:** Backward-compatible PluginManifest extension (three new fields, `#[serde(default)]`, `Unknown` capability variant); DirectoryManager (creates declared dirs, scopes fs access to declared paths); SkillRouter with `dispatch_plugin_skill` and `list_plugin_skills` Tauri commands; plugin lifecycle hooks (on_load/on_unload/on_reload); skill namespace enforcement with collision detection.

**Addresses features:** Plugin-owned directories, plugin skill registration, plugin MCP tool registration

**Avoids pitfalls:** #2 (manifest compat), #4 (namespace collision), #6 (filesystem permission scope — fix `PathBuf::from("/")` hole), #9 (ghost skills on hot-reload)

### Phase 2: Knowledge Engine Core Plugin

**Rationale:** With plugin infrastructure in place, the knowledge engine registers as a core plugin. The three-layer directory structure, all four operations, and the concurrent-access serialization pattern all live here. Source hash tracking must be built into ingest from day one, not retrofitted — it is the fundamental integrity mechanism.

**Delivers:** `src-tauri/src/plugins/core/knowledge.rs` with wiki_ingest, wiki_query, wiki_lint, wiki_status; three-layer `.knowledge/` directory created on activation; default schema.md; `tokio::mpsc` operation queue for serialized mutations; source hash tracking in wiki article YAML frontmatter; input validation for raw sources (file size, content type, binary detection); log.md with rotation policy.

**Addresses features:** Three-layer directory structure, ingest, query, index, lint, schema.md, log.md

**Avoids pitfalls:** #1 (concurrent file access via operation queue + atomic writes), #3 (stale content via source hashing), #8 (silent ingest failures via pre-validation), #10 (log.md growth via rotation), #11 (schema.md as injection vector — user-only edits at MVP), #12 (cross-project leakage via project tags in frontmatter)

### Phase 3: Hub Chat Integration

**Rationale:** Hub chat is the primary user interface for all wiki operations. Dynamic tool loading must replace the static ACTION_REGISTRY reference in HubChat.tsx. This phase delivers the end-to-end "user asks a question → LLM calls wiki_query → answer returned" flow that validates the core loop.

**Delivers:** `loadDynamicTools()` in actionRegistry.ts; HubChat.tsx using dynamic tool list on mount; `useActionDispatch` routing plugin skills through `dispatch_plugin_skill`; end-to-end hub chat wiki query and ingest flows working.

**Addresses features:** Hub chat integration, all four operations accessible as hub chat skills

**Avoids pitfalls:** #7 (system prompt bloat — implement tool filtering by intent, cap max tool count per request at ~20)

### Phase 4: MCP Server Integration

**Rationale:** MCP integration depends on Phase 2 (knowledge plugin working) but is lower user priority than hub chat. External agents (Claude Code) gain wiki access here. MCP wiki_query returns raw content rather than LLM-synthesized answers — external agents reason over content themselves.

**Delivers:** `mcp-server/src/tools/plugin-tools.ts` with dynamic manifest loading at startup; wiki_query (read-only, returns raw page content); wiki_ingest via agent-queue (prevents concurrent writes to `.knowledge/`); plugin tool registration in MCP server's ListToolsRequestSchema handler.

**Addresses features:** Plugin MCP tool registration, external agent wiki access

**Avoids pitfalls:** #1 (concurrent file access via read-only MCP + agent-queue writes), #5 (index.md abstraction layer — query interface designed for future vector swap)

### Phase 5: Post-Validation Enhancements

**Rationale:** Only build these after the core loop (ingest → query → lint) is proven working with real content. Query-to-wiki filing and batch ingest are low-cost additions that compound the wiki's value. Wiki-powered briefings and research agents require the wiki to have enough content (~20+ articles) to be useful.

**Delivers:** Query-to-wiki filing (option to save query answers as wiki pages); batch ingest (compile once for multiple sources); briefing integration with wiki summaries; research agent wiki-first lookup before web search.

**Addresses features:** Query-to-wiki filing, batch ingest, wiki-powered briefings/research agents (v1.8.x)

### Phase Ordering Rationale

- Plugin infrastructure (Phase 1) is a strict prerequisite — the knowledge engine cannot declare directories or register skills without SkillRouter, DirectoryManager, and lifecycle hooks existing.
- Knowledge engine (Phase 2) must be functional and tested before any UI or MCP integration — there is nothing to wire up otherwise.
- Hub chat (Phase 3) and MCP (Phase 4) can be parallelized if staffing allows, but hub chat is higher user priority and should ship first to validate the core loop.
- Post-validation enhancements (Phase 5) are explicitly gated on real-world usage showing ingest → query → lint works end-to-end.
- Pitfalls #1, #2, #4, and #9 are Phase 1 concerns. Implementing the knowledge engine before solving them creates structural issues that are expensive to retroactively fix.

### Research Flags

Phases with well-documented patterns (skip additional research — research is complete):
- **Phase 1:** Plugin manifest extension patterns fully analyzed from codebase. SkillRouter architecture specified in ARCHITECTURE.md. All integration points traced.
- **Phase 2:** Karpathy pattern well-documented across multiple sources. All four operations fully specified. AiGateway integration pattern already exists.
- **Phase 3:** Hub chat data flow fully mapped. actionRegistry.ts change is mechanical and specified precisely.
- **Phase 4:** MCP server architecture understood. Agent-queue pattern is existing infrastructure.

Phases that may need targeted investigation during implementation:
- **Phase 2 (LLM prompt design):** The exact prompt engineering for ingest (multi-file wiki updates, cross-reference maintenance, deduplication) is not specified. This is a tuning concern, not an architecture concern, but expect iteration on prompt structure.
- **Phase 5 (briefing integration):** How wiki summaries slot into the briefing generation pipeline needs investigation when that phase begins. Defer until core loop is validated.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Full codebase analysis of all integration points; zero new dependencies confirmed by direct inspection of Cargo.toml and package.json; all extension points identified |
| Features | HIGH | Karpathy pattern documented across multiple sources; MVP scope is tight and matches SEED-001; existing codebase confirms all integration points (actionRegistry.ts, mcp-server/index.ts) |
| Architecture | HIGH | Based on direct codebase analysis of manifest.rs, actionRegistry.ts, HubChat.tsx, mcp-server/index.ts; all data flows traced end-to-end; no speculative components |
| Pitfalls | HIGH | Critical pitfalls verified against actual code — `PathBuf::from("/")` hole found by direct inspection of plugin_commands.rs line 201; PluginCapability enum strict variant list confirmed in manifest.rs; hot-reload lifecycle gap confirmed in mod.rs |

**Overall confidence:** HIGH

### Gaps to Address

- **LLM prompt design for wiki operations:** Research specifies WHAT each operation does but not the exact prompt structure. Ingest is particularly complex — the prompt must handle updating existing pages, maintaining cross-references, and deduplicating against existing content. Design and test prompts during Phase 2 implementation; budget time for iteration.
- **Operation queue latency:** The serialized mutation queue is the correct pattern, but its impact on ingest latency for large sources (>50KB) is unknown. Monitor during Phase 2 and add Tauri event progress emissions (`emit("knowledge-progress", ...)`) if needed to avoid UI appearing frozen.
- **index.md size budget:** The 2K token budget assumes one-line entries per article. The exact format determines how many articles fit before hitting the scaling ceiling. Define the format precisely in schema.md during Phase 2 and validate at 50-article scale before shipping.
- **MCP write acknowledgment semantics:** The agent-queue pattern for MCP wiki_ingest returns an acknowledgment immediately while the Rust backend processes asynchronously. Whether Claude Code can work with async acknowledgment (fire-and-forget) or needs to poll for a result needs validation during Phase 4.

## Sources

### Primary (HIGH confidence)

- Codebase analysis: `src-tauri/src/plugins/manifest.rs`, `registry.rs`, `core/mod.rs`, `plugin_commands.rs` — plugin system current state, including `PathBuf::from("/")` security hole
- Codebase analysis: `src/lib/actionRegistry.ts`, `src/hooks/useActionDispatch.ts`, `src/components/hub/HubChat.tsx` — hub chat tool dispatch flow, static ACTION_REGISTRY
- Codebase analysis: `mcp-server/src/index.ts` — 23 hardcoded tools, stdio transport, switch dispatch pattern
- Codebase analysis: `src-tauri/Cargo.toml`, `package.json`, `mcp-server/package.json` — confirmed zero new dependencies needed
- SEED-001-knowledge-engine.md — three-layer architecture, operations, MVP scope, no-vectorization decision
- PROJECT.md — v1.8 milestone scope and active requirements

### Secondary (MEDIUM confidence)

- [Karpathy LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — authoritative architecture pattern, index.md design, lint concept
- [VentureBeat: Karpathy LLM Knowledge Base Architecture](https://venturebeat.com/data/karpathy-shares-llm-knowledge-base-architecture-that-bypasses-rag-with-an) — scaling limits at ~100-200 articles
- [DAIR.AI: LLM Knowledge Bases](https://academy.dair.ai/blog/llm-knowledge-bases-karpathy) — operation details and compilation patterns
- [rvk7895/llm-knowledge-bases](https://github.com/rvk7895/llm-knowledge-bases) — Claude Code implementation reference for comparison
- [The Claude Customization Stack](https://www.ado.im/posts/claude-customization-stack-mcp-skills-plugins/) — skills/MCP/plugin architecture patterns
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) — tool registration, output schemas, authentication
- [Multi-Agent System Reliability: Failure Patterns](https://www.getmaxim.ai/articles/multi-agent-system-reliability-failure-patterns-root-causes-and-production-validation-strategies/) — concurrent state modification, serialization patterns

### Tertiary (LOW confidence)

- [LogRocket: The LLM Context Problem in 2026](https://blog.logrocket.com/llm-context-problem/) — context poisoning, staleness at 100K+ tokens
- [DEV Community: Compile Your Knowledge](https://dev.to/rotiferdev/compile-your-knowledge-dont-search-it-what-llm-knowledge-bases-reveal-about-agent-memory-32pg) — source provenance, content hashing for staleness detection
- [ArjanCodes: Plugin Architecture Best Practices](https://arjancodes.com/blog/best-practices-for-decoupling-software-using-plugins/) — lifecycle management, registration patterns
- [Elastic: Current State of MCP](https://www.elastic.co/search-labs/blog/mcp-current-state) — over-permissioning risks, authentication gaps

---
*Research completed: 2026-04-06*
*Ready for roadmap: yes*
