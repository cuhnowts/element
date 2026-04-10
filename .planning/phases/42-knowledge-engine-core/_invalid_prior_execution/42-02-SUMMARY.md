---
phase: 42-knowledge-engine-core
plan: 02
subsystem: knowledge
tags: [rust, llm, ingest, query, reqwest, html-strip, citations]

requires:
  - phase: 42-01
    provides: types, frontmatter, index, KnowledgeEngine struct
provides:
  - Ingest pipeline: source resolution, hash, LLM compile, raw storage, index update
  - Query pipeline: index read, LLM article selection, content synthesis with citations
  - URL source handling via reqwest fetch + HTML tag stripping
  - No-op re-ingest detection via content hash comparison
  - Slug collision handling with numeric suffix
  - MockProvider and SequentialMockProvider test helpers
affects: [42-03, 43-hub-chat-wiki-integration]

tech-stack:
  added: []
  patterns: [LLM JSON response parsing, two-step LLM pipeline for query, mock AI providers for testing]

key-files:
  created:
    - src-tauri/src/knowledge/ingest.rs
    - src-tauri/src/knowledge/query.rs
    - src-tauri/src/knowledge/test_helpers.rs
  modified:
    - src-tauri/src/knowledge/mod.rs
---

## What was built

Ingest pipeline: resolves content (file or URL with HTML stripping), computes SHA-256 hash, detects no-op re-ingests, calls LLM for wiki article compilation, stores raw source verbatim, handles slug collisions, writes article with YAML frontmatter, updates index.md. Query pipeline: reads index, uses LLM to select 1-5 relevant articles, reads their content, synthesizes answer with footnote-style [1][2] citations. Write lock serializes ingests; queries are lock-free.

## Key decisions

- URL content is HTML-stripped (removes script/style blocks, tags, decodes entities) before LLM compilation
- Pre-fetched URL content in source.content is used when non-empty (allows Tauri command layer to pre-fetch)
- LLM article selection capped at 5 articles to bound synthesis context
- MockProvider and SequentialMockProvider placed in shared test_helpers module for reuse

## Test results

12 new tests passing (23 total):
- 8 ingest tests (create article, store raw, update index, noop, changed source, slug collision, URL, strip HTML)
- 4 query tests (synthesized answer, empty wiki, footnote citations, 5-article cap)

## Self-Check: PASSED
