# Requirements: Element

**Defined:** 2026-04-06
**Core Value:** The AI agent must reliably orchestrate project work -- planning, executing, and monitoring across all projects so the user focuses on decisions, not mechanics.

## v1.8 Requirements

Requirements for v1.8 Knowledge Engine. Each maps to roadmap phases.

### Plugin Infrastructure

- [ ] **PLUG-01**: Plugin can declare MCP tools in its manifest that are callable by hub chat and external agents
- [ ] **PLUG-02**: Plugin can declare named skills (slash-command-like) that appear as hub chat commands
- [ ] **PLUG-03**: Plugin can declare owned directories it creates and manages on the filesystem
- [ ] **PLUG-04**: Plugin lifecycle hooks (on_enable/on_disable) execute setup/teardown logic when plugin state changes
- [ ] **PLUG-05**: Plugin-contributed skills use plugin-prefixed namespacing to prevent collisions

### Knowledge Engine

- [ ] **WIKI-01**: User can ingest a raw source document into the wiki, producing compiled wiki articles with cross-references and an updated index
- [ ] **WIKI-02**: User can query the wiki and receive a synthesized answer drawn from relevant wiki articles
- [ ] **WIKI-03**: LLM-maintained index.md is updated on every ingest, serving as the search engine for query operations
- [ ] **WIKI-04**: User can run a lint operation that identifies contradictions, stale claims, and orphan pages in the wiki
- [ ] **WIKI-05**: Wiki operations are serialized through an operation queue preventing concurrent file corruption
- [ ] **WIKI-06**: Wiki articles track source hashes to detect when compiled knowledge is stale relative to raw sources

### Hub Chat Integration

- [ ] **CHAT-01**: Plugin-contributed skills are dynamically loaded into hub chat's tool registry alongside built-in actions
- [ ] **CHAT-02**: User can ingest documents and query the wiki through hub chat commands
- [ ] **CHAT-03**: Hub chat filters available tools contextually to prevent system prompt bloat as plugins grow

### MCP Server Integration

- [ ] **MCP-01**: External agents can query the wiki through MCP server tools (read-only)
- [ ] **MCP-02**: External agents can trigger wiki ingest through MCP server via the agent queue

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Knowledge Engine Extensions

- **WIKI-07**: Vector search layer for wiki exceeding ~500 articles
- **WIKI-08**: Query results optionally filed back as new wiki articles
- **WIKI-09**: Batch ingest of multiple raw sources in one operation

### Consumer Rewiring

- **INT-01**: AI briefings read from wiki instead of re-deriving from raw DB
- **INT-02**: Research agents check wiki before web searching and write findings back
- **INT-03**: Context manifest generated from wiki summaries instead of raw queries
- **INT-04**: Heartbeat reads wiki for risk patterns and project health

### Plugin Ecosystem

- **PLUG-06**: Plugin manifest versioning with forward-compatible schema
- **PLUG-07**: External (non-core) plugins can be installed from filesystem

## Out of Scope

| Feature | Reason |
|---------|--------|
| Vector database / embeddings | Premature -- LLM index scan works to ~100-200 articles, add vectorization when needed |
| Dedicated wiki browser UI | Hub chat is the interface -- separate UI competes and adds complexity |
| Plugin runtime sandboxing / WASM | Keep plugins declarative, not executable runtimes |
| Auto-ingest triggers | Token waste -- user controls when to ingest |
| Per-project knowledge directories | Global .knowledge/ first, per-project scoping deferred |
| Full consumer rewiring | Briefings/manifest/heartbeat stay as-is, rewire in future milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLUG-01 | Phase 41 | Pending |
| PLUG-02 | Phase 41 | Pending |
| PLUG-03 | Phase 41 | Pending |
| PLUG-04 | Phase 41 | Pending |
| PLUG-05 | Phase 41 | Pending |
| WIKI-01 | Phase 42 | Pending |
| WIKI-02 | Phase 42 | Pending |
| WIKI-03 | Phase 42 | Pending |
| WIKI-04 | Phase 42 | Pending |
| WIKI-05 | Phase 42 | Pending |
| WIKI-06 | Phase 42 | Pending |
| CHAT-01 | Phase 43 | Pending |
| CHAT-02 | Phase 43 | Pending |
| CHAT-03 | Phase 43 | Pending |
| MCP-01 | Phase 44 | Pending |
| MCP-02 | Phase 44 | Pending |

**Coverage:**
- v1.8 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 after roadmap creation*
