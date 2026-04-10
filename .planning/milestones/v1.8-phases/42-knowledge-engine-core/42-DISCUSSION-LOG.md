# Phase 42: Knowledge Engine Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 42-knowledge-engine-core
**Areas discussed:** Ingest pipeline design, Query & synthesis model, Lint categories & severity, Concurrency & operation queue

---

## Ingest Pipeline Design

| Option | Description | Selected |
|--------|-------------|----------|
| One article per source | Each raw source produces exactly one wiki article. Simpler, predictable layout. | ✓ |
| LLM decides article count | LLM can split a large source into multiple focused articles. More granular. | |
| You decide | Claude picks the best approach | |

**User's choice:** One article per source
**Notes:** Recommended option selected for predictable source-to-article mapping.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text and Markdown only | .txt and .md files only | |
| Text, Markdown, and URLs | Also accept URLs with web scraping | ✓ |
| Any text-based format | Accept anything readable as text | ✓ |

**User's choice:** Options 2+3 combined — text, markdown, URLs, and any text-based format
**Notes:** User wanted both URL support and broad text format acceptance.

---

| Option | Description | Selected |
|--------|-------------|----------|
| LLM-generated slug from content | LLM picks descriptive slug based on compiled content | ✓ |
| Source filename as slug | Derive from original source filename | |
| You decide | Claude picks | |

**User's choice:** LLM-generated slug from content

---

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: title, sources, hashes, dates | Just what's needed for staleness detection | |
| Rich: add tags, summary, related articles | LLM generates tags, summary, related articles | ✓ |
| You decide | Claude picks | |

**User's choice:** Rich frontmatter with tags, summary, related articles

---

## Query & Synthesis Model

| Option | Description | Selected |
|--------|-------------|----------|
| LLM reads index.md, picks articles | Pass full index.md to LLM with query. LLM selects articles. | ✓ |
| Keyword search then LLM filter | Grep index.md first, then LLM picks from filtered set. | |
| You decide | Claude picks | |

**User's choice:** LLM reads index.md, picks articles

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline wikilinks | [[article-slug]] woven into answer text | |
| Footnote-style references | Numbered footnotes [1][2] with source list at bottom | ✓ |
| Both: inline + source list | Wikilinks inline plus Sources section at end | |

**User's choice:** Footnote-style references

---

| Option | Description | Selected |
|--------|-------------|----------|
| LLM decides (up to 5) | LLM picks 1-5 most relevant articles | ✓ |
| Fixed: always top 3 | Always retrieve exactly 3 articles | |
| You decide | Claude picks | |

**User's choice:** LLM decides, up to 5

---

| Option | Description | Selected |
|--------|-------------|----------|
| Return only, no persistence | Answer returned to caller, nothing written to disk | ✓ |
| Optionally file as new article | Answer returned AND optionally saved as wiki article | |
| You decide | Claude picks | |

**User's choice:** Return only (save for later — user noted WIKI-08 vision of LLM-generated docs feeding back into wiki)
**Notes:** "the idea there was that llm generated documents get added to the wiki" — architecture should not prevent future filing.

---

## Lint Categories & Severity

| Option | Description | Selected |
|--------|-------------|----------|
| Stale sources | Source hash mismatch — raw source changed but article not re-ingested | ✓ |
| Broken wikilinks | Wikilinks pointing to non-existent articles | ✓ |
| Thin articles | Articles below content threshold | ✓ |
| Orphan pages | Articles not referenced by any other article or index | ✓ |

**User's choice:** All four plus contradictions
**Notes:** "Should also look for incorrect information, anything contradictory" — user added contradiction detection as a fifth category requiring LLM analysis.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Structured JSON with severity levels | Machine-readable, easy to filter | |
| Markdown report | Human-readable grouped by category | |
| You decide | Claude picks best format | ✓ |

**User's choice:** You decide

---

## Concurrency & Operation Queue

| Option | Description | Selected |
|--------|-------------|----------|
| In-process Tokio mutex | Single tokio::Mutex<()> guarding all wiki writes | ✓ |
| File-based lock | Lockfile on disk, survives crashes | |
| SQLite-backed queue | Queue in SQLite, process sequentially | |

**User's choice:** In-process Tokio mutex

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single global mutex | One lock for all write types, reads bypass | ✓ |
| Per-operation-type locks | Separate locks for ingest vs lint vs other writes | |
| You decide | Claude picks | |

**User's choice:** Single global mutex, reads bypass

---

## Claude's Discretion

- Index.md structure (selected for discussion but user cut short — left to Claude)
- Re-ingest behavior (selected for discussion but user cut short — left to Claude)
- Knowledge directory layout (selected for discussion but user cut short — left to Claude)
- LLM prompt strategy (selected for discussion but user cut short — left to Claude)
- Lint output format

## Deferred Ideas

- WIKI-08: Query results filed back as wiki articles (user's long-term vision)
- WIKI-09: Batch ingest
- WIKI-07: Vector search for large wikis
- PDF/binary format support
