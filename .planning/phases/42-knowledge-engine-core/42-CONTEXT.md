# Phase 42: Knowledge Engine Core - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the core wiki operations for the knowledge engine plugin: ingest raw source documents into a three-layer wiki (.knowledge/raw/, .knowledge/wiki/, .knowledge/index.md), query compiled knowledge with synthesized answers, lint for quality issues, serialize all mutations for concurrency safety, and track source staleness via content hashes.

</domain>

<decisions>
## Implementation Decisions

### Ingest Pipeline
- **D-01:** Each raw source produces **exactly one wiki article**. One-to-one source-to-article mapping for predictable tracking.
- **D-02:** Accepted source formats: **any text-readable file** (.txt, .md, .json, .csv, etc.) **plus URLs** (fetch page content, strip to text, then compile). PDF/binary formats deferred.
- **D-03:** Wiki articles named with **LLM-generated slugs** derived from compiled content (e.g., `rust-error-handling.md`). Human-readable, descriptive.
- **D-04:** Wiki article YAML frontmatter is **rich**: title, sources (with content hashes per WIKI-06), created/updated dates, tags, one-line summary, and related article links. Supports index.md generation and lint checks.

### Query & Synthesis
- **D-05:** Query retrieval uses **LLM reading full index.md** to select relevant articles. No keyword pre-filter — LLM picks semantically. Works up to ~200 articles (vector search deferred per WIKI-07).
- **D-06:** Synthesized answers use **footnote-style references** — numbered citations [1][2] inline, source article list at bottom.
- **D-07:** LLM selects **1-5 articles** per query (LLM decides count, capped at 5 to prevent context bloat).
- **D-08:** Query answers are **returned only, not persisted**. Architecture should make future filing easy (WIKI-08 deferred), but no disk writes on query in this phase.

### Lint
- **D-09:** Implement **five lint categories**: stale sources (hash mismatch), broken wikilinks, thin articles (below content threshold), orphan pages (unreferenced), and contradictions (requires LLM analysis).
- **D-10:** Lint output format is **Claude's discretion** — pick whatever works best across hub chat and MCP surfaces (likely structured JSON with severity levels for machine readability, rendered nicely for humans).

### Concurrency
- **D-11:** Wiki mutations serialized via **single in-process `tokio::Mutex<()>`** guarding all write operations. Simple, no external dependencies — all wiki ops go through the same Tauri process.
- **D-12:** **Single global mutex** for all write types (ingest, lint-fix, etc.). Read operations (query) **bypass the lock** since they don't mutate.

### Claude's Discretion
- **Index.md structure** — How to structure index entries (summaries, tags, source mappings). Should optimize for LLM query retrieval.
- **Re-ingest behavior** — How unchanged sources are detected as no-ops (WIKI-06), how changed sources update existing articles, handling renamed/moved sources.
- **Knowledge directory layout** — .knowledge/ internal structure beyond raw/, wiki/, index.md. Any config, metadata, or lint output storage.
- **LLM prompt strategy** — System prompts for compilation, query synthesis, and lint. Fixed vs configurable. Tone/depth/style of wiki articles.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plugin System (Phase 41 Foundation)
- `src-tauri/src/plugins/manifest.rs` — PluginManifest struct, skill/MCP tool declarations, input/output JSON Schema
- `src-tauri/src/plugins/registry.rs` — PluginRegistry, LoadedPlugin, skill registry
- `src-tauri/src/plugins/mod.rs` — PluginHost with scan_and_load, enable/disable lifecycle
- `src-tauri/src/plugins/core/` — Existing core plugins (calendar, filesystem, http, shell) as reference patterns
- `src-tauri/src/commands/plugin_commands.rs` — Tauri plugin commands

### AI Infrastructure
- `src-tauri/src/ai/provider.rs` — AiProvider trait (complete, complete_stream, chat_stream)
- `src-tauri/src/ai/gateway.rs` — AiGateway for provider resolution (get_default_provider)
- `src-tauri/src/ai/types.rs` — ChatRequest, CompletionRequest, CompletionResponse, ToolDefinition

### Phase 41 Context (Upstream Decisions)
- `.planning/phases/41-plugin-infrastructure-evolution/41-CONTEXT.md` — Plugin skill namespacing (D-03: `knowledge:ingest`), owned directories (D-05), manifest schema v2 (D-09), MCP tool registration (D-11), agent queue dispatch (D-13)

### Requirements
- `.planning/REQUIREMENTS.md` — WIKI-01 through WIKI-06 requirements, out-of-scope decisions (no vector DB, no dedicated UI, no auto-ingest)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AiProvider` trait + `AiGateway`: Use for all LLM calls (ingest compilation, query synthesis, contradiction lint)
- `PluginHost` + `PluginRegistry`: Knowledge engine registers as a core plugin with skills and MCP tools
- Core plugin pattern (calendar.rs, filesystem.rs): Reference for structuring knowledge plugin module
- Agent queue: Existing MCP-to-Tauri bridge for dispatching wiki operations from external agents

### Established Patterns
- Tauri commands as the frontend-to-backend bridge (invoke pattern)
- `Arc<RwLock<PluginRegistry>>` for shared state — similar pattern for wiki mutex
- SQLite for persistent state (DB-backed MCP tool registry from Phase 41)
- Zustand stores on frontend for state management

### Integration Points
- Plugin manifest: Knowledge plugin declares skills (`knowledge:ingest`, `knowledge:query`, `knowledge:lint`) and owned directory (`.knowledge/`)
- Hub chat: Skills surface as available tools via plugin skill registry merge (Phase 43)
- MCP server: Wiki tools registered in DB, callable by external agents (Phase 44)

</code_context>

<specifics>
## Specific Ideas

- User envisions LLM-generated documents eventually filing back into the wiki (WIKI-08 deferred but architecture should not prevent it)
- Contradictions lint should catch incorrect information across articles, not just structural issues — this is the "killer" lint category that justifies LLM involvement
- All five lint categories wanted from day one despite success criteria only requiring "at least one"

</specifics>

<deferred>
## Deferred Ideas

- **WIKI-08:** Query results optionally filed back as new wiki articles — deferred to future requirements
- **WIKI-09:** Batch ingest of multiple raw sources in one operation
- **Vector search:** For wikis exceeding ~200 articles (WIKI-07)
- **PDF/binary ingest:** Only text-readable formats and URLs in this phase

</deferred>

---

*Phase: 42-knowledge-engine-core*
*Context gathered: 2026-04-06*
