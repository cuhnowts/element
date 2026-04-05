---
id: SEED-001
status: dormant
planted: 2026-04-05
planted_during: v1.6 Clarity / Phase 32
trigger_when: v1.6 milestone complete
scope: Large
---

# SEED-001: Knowledge Engine — LLM-compiled wiki for persistent context management

## Why This Matters

Context management is everything with LLMs. Right now, every research run, every briefing, every agent query re-derives knowledge from raw project state. At 1 month this is tolerable. At 12-36 months it's unsustainable — tokens wasted re-learning what's already known, knowledge lost between sessions, no compounding.

The knowledge engine makes AI interactions compound over time. Every research run, every query, every phase execution deposits structured knowledge back into a wiki. The LLM maintains the wiki — cross-references, summaries, categories, backlinks — so future queries start from compiled knowledge, not raw state.

This is the foundation for the product vision: user defines tasks, AI steps in autonomously. The AI can't step in effectively if it starts from zero context every time.

Inspired by Karpathy's LLM knowledge base pattern (gist: karpathy/442a6bf555914893e9891c11519de94f). His key insight: "The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping." LLMs handle the bookkeeping at near-zero cost.

## When to Surface

**Trigger:** v1.6 milestone complete

This seed should be presented during `/gsd:new-milestone` when the milestone
scope matches any of these conditions:
- Next milestone after v1.6 Clarity
- Any milestone involving AI context, briefing improvements, or research optimization
- Any milestone involving memory systems or persistent agent knowledge

## Scope Estimate

**Large** — Full milestone (v1.7). Requires Rust backend work (ingest pipeline, lint scheduler, search), new directory structure, MCP tool extensions, and frontend rendering. All existing AI consumers (briefings, research, hub chat) become wiki consumers.

## Architecture

**Three-layer system:**

| Layer | What | Who owns it |
|---|---|---|
| **Raw** (`raw/`) | Immutable source docs — research outputs, signals, imports | User + ingest pipeline |
| **Wiki** (`wiki/`) | LLM-compiled markdown — summaries, concepts, comparisons, cross-references | LLM exclusively |
| **Schema** (`schema.md`) | Rules for structure, conventions, workflows | User + LLM co-evolve |

**Directory structure:**
```
.knowledge/
  schema.md          # Rules — structure, conventions, workflows
  index.md           # LLM-maintained catalog (updated on every ingest)
  log.md             # Append-only activity record
  raw/               # Immutable sources (research, signals, imports)
  wiki/              # LLM-compiled articles (concepts, decisions, patterns)
```

**Operations:**
- **Ingest**: read source, extract key info, integrate into existing wiki pages, update cross-references, note contradictions, log activity
- **Query**: search index.md for relevant pages, read them, synthesize answer, optionally refile answer as new wiki page
- **Lint**: find contradictions, stale claims, orphan pages, missing cross-refs, data gaps, suggest new articles
- **Index**: LLM maintains index.md with summaries and metadata, updated on every ingest

**Key files:**
- `index.md` — content-oriented catalog listing every wiki page with summaries, organized by category. The LLM's navigation map. Updated on every ingest.
- `log.md` — append-only chronological record of all ingests, queries, lint ops. Parseable with unix tools.

**MVP**: No vectorization. LLM-maintained index.md is the search engine. The LLM scans the index (~2K tokens at 50-100 articles) and pulls relevant files.

**Future**: Vector search layer added when wiki exceeds ~500 articles. Vectors don't replace the wiki — they help the LLM find relevant articles before reading them. The structured wiki stays.

## Consumers (existing systems that become wiki-powered)

- **Briefings** — query wiki for project state instead of re-deriving from raw DB
- **Research agents** — check wiki before web searching; write findings back to wiki instead of throwaway .planning/research/ files
- **Hub chat** — MCP tools query the wiki for context-rich answers
- **Context manifest** — generated from wiki summaries instead of raw project/task queries
- **Heartbeat** — reads wiki for risk patterns and project health

## Breadcrumbs

Related code and decisions found in the current codebase:

- `src-tauri/src/commands/manifest_commands.rs` — context manifest builder (becomes wiki consumer)
- `src/components/hub/HubChat.tsx` — hub chat (query interface for wiki)
- `src/components/hub/HubCenterPanel.tsx` — briefing rendering (becomes wiki consumer)
- `.planning/research/` — current research output directory (becomes raw/ ingest source)
- `.planning/research/SUMMARY.md` — current synthesis pattern (replaced by wiki compilation)
- Memory: `project_ui_overhaul_v16.md` — captures vision that AI should compound knowledge

## Notes

- The onboarding wizard (backlog 999.7) becomes the initial wiki seeding — user's projects and goals are the first raw sources compiled into the wiki
- The memory system (INT-03 in Future Requirements) merges into this — the knowledge engine IS the memory system
- GSD research agents should be the first to benefit — research recycling into .knowledge/ instead of throwaway .planning/research/ files
- At scale (36 months, dozens of projects), consider per-project wikis with a global cross-project index
