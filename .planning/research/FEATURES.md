# Feature Research

**Domain:** LLM-compiled knowledge wiki + plugin skill/tool registration system
**Researched:** 2026-04-06
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features that define the minimum viable knowledge engine and plugin skill system. Without these, the system does not function.

#### Knowledge Engine Operations

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Ingest: raw source to wiki compilation** | Core value prop -- raw docs go in, structured wiki comes out. Without this, nothing works. | HIGH | LLM reads raw/ source, extracts key info, writes/updates wiki/ articles, updates cross-references, appends to log.md. Must handle multi-file wiki updates (10-15 files per ingest per Karpathy spec). Depends on: hub chat (trigger), plugin-owned directories (.knowledge/). |
| **Query: index scan to article retrieval** | Users need to ask questions and get answers from compiled knowledge. The primary read path. | MEDIUM | LLM reads index.md (~2K tokens), identifies relevant wiki pages, reads them, synthesizes answer. No vectorization at MVP -- index.md IS the search engine. Depends on: index.md maintenance, hub chat integration. |
| **Index: LLM-maintained index.md** | The search engine. Without a maintained index, query cannot find relevant articles. | MEDIUM | Updated on every ingest. Lists all wiki pages with one-line summaries, organized by category. Must stay under ~2K tokens for context window efficiency. Depends on: ingest operation (triggers updates). |
| **Lint: find contradictions, stale content, orphans** | Knowledge decays without maintenance. Lint prevents wiki rot -- the #1 cause of knowledge base abandonment. | MEDIUM | Five checks per Karpathy/CRATE pattern: thin articles, missing concepts, broken wikilinks, duplicate concepts, new article suggestions. Also: stale claims superseded by newer sources, orphan pages lacking inbound links. Depends on: compiled wiki content existing. |
| **log.md: append-only activity record** | Auditability -- users need to know what happened, when, and to which articles. Also enables debugging. | LOW | Append-only. Consistent format: `## [YYYY-MM-DD] operation_type`. Parseable with unix tools. No complexity -- just structured appending. |
| **schema.md: structure and convention rules** | The LLM needs instructions on HOW to compile. Without schema, wiki structure drifts and becomes inconsistent. | LOW | Ships with sensible defaults. Specifies: directory conventions, page naming, frontmatter format, cross-reference protocols, entity dedup rules. User can evolve it. |
| **Three-layer directory structure** | Fundamental architecture: raw/ (immutable sources), wiki/ (LLM-compiled), schema.md (rules). Proven pattern from Karpathy and every implementation. | LOW | `.knowledge/raw/`, `.knowledge/wiki/`, `.knowledge/schema.md`, `.knowledge/index.md`, `.knowledge/log.md`. Depends on: plugin-owned directories feature. |

#### Plugin System Evolution

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Plugin skill registration (hub chat commands)** | Knowledge engine needs to expose ingest/query/lint/index as hub chat commands. Without skill registration, the plugin cannot surface its capabilities. | MEDIUM | Plugin manifest declares `skills[]` array. Each skill has: name, description, input schema, handler reference. Action registry (existing) must accept plugin-contributed entries at load time. Depends on: existing action registry pattern in actionRegistry.ts. |
| **Plugin MCP tool registration** | External agents (Claude Code) need to query/ingest the wiki via MCP. Without tool registration, the knowledge engine is chat-only. | MEDIUM | Plugin manifest declares `mcp_tools[]` array. MCP server (existing, mcp-server/src/index.ts) must discover and register plugin-contributed tools at startup. Depends on: existing MCP server with ListToolsRequestSchema handler. |
| **Plugin-owned directories** | Knowledge engine needs to declare and manage `.knowledge/`. Without this, there is no filesystem contract between the plugin and the host. | LOW | Plugin manifest declares `directories[]` array with path and purpose. Host creates directories on plugin activation, prevents other plugins from writing there. Depends on: existing plugin manifest system (manifest.rs). |

### Differentiators (Competitive Advantage)

Features that set this apart from CRATE, llm-wiki, and other implementations. Not required for v1, but create unique value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Query results filed back as wiki pages** | Valuable synthesis answers compound into the wiki instead of disappearing in chat history. Karpathy explicitly calls this out: "good answers can be filed back as new pages." | LOW | After query, LLM optionally writes the answer as a new wiki/ article and updates index.md. Incremental -- just an ingest of the answer text. |
| **Hub chat as sole interface (no separate UI)** | Consumer app feel per memory feedback_ux_seamless.md. No "wiki viewer" -- just ask questions in chat. Avoids building a second browsing experience. | LOW | All operations triggered via hub chat skills. Results rendered inline as markdown (hub chat already renders markdown). Zero new UI components needed. |
| **Cross-project knowledge scope** | Single `.knowledge/` directory serves all projects. Knowledge compounds globally, not siloed per-project. Unique to Element's multi-project architecture. | LOW | Global `.knowledge/` directory (not per-project). Already specified in seed. Plugin declares one directory at app level rather than per-project. |
| **Existing consumers become wiki-powered** | Briefings, research agents, context manifest, and heartbeat all benefit from compiled knowledge. No other tool has this integration surface. | HIGH | Briefing reads wiki summaries instead of re-deriving from DB. Research agents check wiki before web search, write back to wiki. Context manifest generated from wiki. This is the compounding flywheel. Defer to post-MVP. |
| **Lint as proactive suggestions** | Unlike passive spell-checkers, lint suggests NEW articles to write. Identifies knowledge gaps, not just errors. | LOW | CRATE pattern: lint returns "new article suggestions" alongside error findings. LLM identifies concepts mentioned but lacking dedicated pages. |
| **Batch ingest with deferred compilation** | Ingest multiple raw sources without triggering compilation after each one. Compile once when ready. More token-efficient for bulk imports. | LOW | Ingest writes to raw/ without compiling. Explicit compile command processes all un-compiled sources. CRATE separates ingest from compile for this reason. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Vector database / embeddings search** | "How will it scale past 500 articles?" | Massive complexity for MVP. Index.md handles 50-100 articles easily (~2K tokens). Vectorization adds a dependency (embedding model, vector store), complicates local-first story, and is premature optimization. | LLM-maintained index.md. Add vector layer ONLY when wiki exceeds ~500 articles. The structured wiki stays either way. |
| **Dedicated wiki browser UI** | "I want to see all my wiki pages in a tree view" | Builds a second interface that competes with hub chat. Violates the "consumer app, not developer tool" principle (memory: feedback_ux_seamless.md). Adds maintenance burden for marginal value. | Hub chat query. Users ask "what do I know about X?" and get a synthesized answer with sources. If they want to browse files, they have a terminal and file explorer already. |
| **Real-time wiki sync / collaborative editing** | "What if I edit wiki files manually?" | Wiki is LLM-owned. Manual edits create conflicts and break cross-references. The LLM cannot maintain consistency if humans are also editing compiled output. | Edit raw/ sources (those are user-owned), then re-ingest. Or evolve schema.md to change compilation rules. wiki/ is the LLM's domain. |
| **Plugin runtime / sandboxed execution** | "Plugins should run their own code" | Massive security and complexity surface. Current plugins are declarative manifests with step types (shell/HTTP/filesystem). Adding a plugin runtime means sandboxing, permissions, crash isolation. | Keep plugins declarative. Skills are handled by the host (hub chat invokes Tauri commands). MCP tools are handled by the MCP server. Plugin declares WHAT, host executes HOW. |
| **Per-project knowledge silos** | "Each project should have its own wiki" | Prevents cross-project knowledge transfer. The whole point is compounding -- insights from project A inform project B. | Single global `.knowledge/` directory. Seed notes: "At scale (36 months), consider per-project wikis with a global cross-project index." Not now. |
| **Automatic ingest triggers** | "Ingest should run automatically when files change" | Token cost without user intent. Every file save triggers an LLM call. User loses control over what gets compiled. | Explicit ingest via hub chat command. User decides when and what to ingest. Batch ingest for efficiency. |

## Feature Dependencies

```
[Plugin-owned directories]
    |
    +--required-by--> [Three-layer directory structure (.knowledge/)]
    |                     |
    |                     +--required-by--> [schema.md]
    |                     +--required-by--> [log.md]
    |                     +--required-by--> [Ingest operation]
    |                                           |
    |                                           +--required-by--> [Index maintenance]
    |                                           |                     |
    |                                           |                     +--required-by--> [Query operation]
    |                                           |
    |                                           +--required-by--> [Lint operation]
    |
    +--required-by--> [Plugin skill registration]
    |                     |
    |                     +--required-by--> [Hub chat wiki integration]
    |
    +--required-by--> [Plugin MCP tool registration]
                          |
                          +--required-by--> [External agent wiki access]

[Existing action registry] --extended-by--> [Plugin skill registration]

[Existing MCP server] --extended-by--> [Plugin MCP tool registration]

[Existing plugin manifest] --extended-by--> [Plugin-owned directories]
                           --extended-by--> [Plugin skill registration]
                           --extended-by--> [Plugin MCP tool registration]
```

### Dependency Notes

- **Plugin-owned directories must come first:** Every other feature depends on `.knowledge/` existing. The plugin manifest must declare it, and the host must create it.
- **Plugin skill registration extends existing action registry:** actionRegistry.ts already defines ActionDefinition with name, description, inputSchema, destructive flag, and tauriCommand. Plugin skills must follow this exact interface so hub chat handles them identically to built-in skills.
- **Plugin MCP tool registration extends existing MCP server:** mcp-server/src/index.ts has a hardcoded ListToolsRequestSchema handler. Must become dynamic to accept plugin-contributed tools. The handler pattern (function per tool) is already established.
- **Ingest must exist before Query or Lint:** Query needs index.md to be populated. Lint needs wiki articles to check. Both require at least one successful ingest.
- **Index maintenance is coupled to Ingest:** Every ingest updates index.md. This is not a separate user-facing operation -- it happens as part of ingest. Listed separately because it is a distinct implementation concern.

## MVP Definition

### Launch With (v1.8)

Minimum viable knowledge engine -- validates that LLM-compiled wikis work within Element's architecture.

- [ ] **Plugin-owned directories** -- Manifest declares `directories`, host creates on activation. Foundation for everything.
- [ ] **Plugin skill registration** -- Manifest declares `skills`, action registry accepts plugin contributions. Makes hub chat extensible.
- [ ] **Plugin MCP tool registration** -- Manifest declares `mcp_tools`, MCP server discovers and registers them. Makes external agents extensible.
- [ ] **Knowledge engine plugin scaffold** -- plugin.json with manifest declaring .knowledge/ directory, 4 skills, and 4 MCP tools.
- [ ] **Three-layer directory structure** -- .knowledge/ with raw/, wiki/, schema.md, index.md, log.md. Created on plugin activation.
- [ ] **Default schema.md** -- Ships with sensible defaults for page naming, frontmatter, cross-references.
- [ ] **Ingest operation** -- Raw source in, wiki compilation out, index.md updated, log.md appended.
- [ ] **Query operation** -- Read index.md, find relevant pages, synthesize answer, return via hub chat.
- [ ] **Index operation** -- Rebuild index.md from current wiki/ contents (recovery/manual trigger).
- [ ] **Lint operation** -- Five checks: thin articles, missing concepts, broken wikilinks, duplicates, suggestions.
- [ ] **Hub chat integration** -- All four operations accessible as hub chat skills.

### Add After Validation (v1.8.x)

Features to add once the core loop (ingest -> query -> lint) is proven working.

- [ ] **Query-to-wiki filing** -- Option to save valuable query answers as new wiki pages. Trigger: users asking the same questions repeatedly.
- [ ] **Batch ingest** -- Ingest multiple raw sources, compile once. Trigger: users importing large document sets.
- [ ] **Existing consumers wired to wiki** -- Briefings read wiki summaries, research agents check wiki first. Trigger: wiki has enough content to be useful (~20+ articles).
- [ ] **Lint scheduling** -- Periodic lint runs via existing cron/workflow system. Trigger: wiki exceeds ~50 articles.

### Future Consideration (v2+)

- [ ] **Vector search layer** -- Add when wiki exceeds ~500 articles. Vectors help LLM find articles; structured wiki stays.
- [ ] **Per-project wiki partitions** -- Global index with project-scoped sub-wikis. Only at 36+ months with dozens of projects.
- [ ] **Plugin marketplace skills** -- Third-party plugins register skills and MCP tools. Requires plugin marketplace infrastructure.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Plugin-owned directories | HIGH | LOW | P1 |
| Plugin skill registration | HIGH | MEDIUM | P1 |
| Plugin MCP tool registration | HIGH | MEDIUM | P1 |
| Ingest operation | HIGH | HIGH | P1 |
| Query operation | HIGH | MEDIUM | P1 |
| Index maintenance | HIGH | LOW | P1 |
| Lint operation | MEDIUM | MEDIUM | P1 |
| schema.md defaults | MEDIUM | LOW | P1 |
| log.md activity record | LOW | LOW | P1 |
| Query-to-wiki filing | MEDIUM | LOW | P2 |
| Batch ingest | MEDIUM | LOW | P2 |
| Wiki-powered briefings | HIGH | MEDIUM | P2 |
| Wiki-powered research agents | HIGH | HIGH | P2 |
| Lint scheduling | LOW | LOW | P3 |
| Vector search | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.8 launch
- P2: Should have, add after core loop validated
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | CRATE (Python CLI) | llm-wiki (Node CLI) | rvk7895/llm-knowledge-bases (Claude Skill) | Element Knowledge Engine |
|---------|-------------------|---------------------|---------------------------------------------|--------------------------|
| Ingest | CLI command, single file | CLI command | Claude Code skill | Hub chat skill + MCP tool |
| Compile | Separate from ingest | Combined with ingest | Combined with ingest | Combined with ingest (simpler) |
| Query / Ask | CLI command, stdout | CLI command | Claude Code context | Hub chat with markdown rendering |
| Lint | 5 checks, CLI output | Basic checks | Not implemented | 5 checks, hub chat results |
| Index | LLM-maintained | LLM-maintained | Not implemented | LLM-maintained |
| Integration surface | Standalone CLI | Standalone CLI | Claude Code only | Hub chat + MCP + briefings + research |
| UI | Terminal only | Terminal only | Terminal only | Desktop app with chat interface |
| Multi-project | No | No | Per-project | Global cross-project |
| Plugin extensibility | No | No | No | Plugin-first architecture |
| Local-first | Yes (files) | Yes (files) | Yes (files) | Yes (files + SQLite) |

**Element's edge:** Integration depth. Every competitor is a standalone CLI. Element embeds the knowledge engine into a multi-project orchestration platform where knowledge flows into briefings, research, scheduling, and agent context. The wiki is not a separate tool -- it is memory for the entire system.

## Sources

- [Karpathy LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) -- Authoritative architecture spec (HIGH confidence)
- [VentureBeat: Karpathy LLM Knowledge Base Architecture](https://venturebeat.com/data/karpathy-shares-llm-knowledge-base-architecture-that-bypasses-rag-with-an) -- Pattern context (MEDIUM confidence)
- [DAIR.AI: LLM Knowledge Bases](https://academy.dair.ai/blog/llm-knowledge-bases-karpathy) -- Operation details (MEDIUM confidence)
- [rvk7895/llm-knowledge-bases](https://github.com/rvk7895/llm-knowledge-bases) -- Claude Code implementation reference (MEDIUM confidence)
- [The Claude Customization Stack](https://www.ado.im/posts/claude-customization-stack-mcp-skills-plugins/) -- Skills/MCP/Plugin architecture patterns (MEDIUM confidence)
- [Skills vs MCP vs Plugins](https://openclaw.rocks/blog/mcp-skills-plugins) -- Extensibility pattern comparison (MEDIUM confidence)
- Existing codebase: `src/lib/actionRegistry.ts`, `src-tauri/src/plugins/manifest.rs`, `mcp-server/src/index.ts` -- Direct inspection (HIGH confidence)

---
*Feature research for: LLM-compiled knowledge wiki + plugin skill/tool registration*
*Researched: 2026-04-06*
