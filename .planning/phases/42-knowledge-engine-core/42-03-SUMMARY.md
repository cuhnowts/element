---
phase: 42-knowledge-engine-core
plan: 03
subsystem: knowledge
tags: [rust, lint, tauri-commands, concurrency, wikilinks]

requires:
  - phase: 42-02
    provides: ingest pipeline, query pipeline, test helpers
provides:
  - Five-category lint pipeline (stale sources, broken wikilinks, thin articles, orphan pages, LLM contradictions)
  - Four Tauri commands: knowledge_ingest, knowledge_ingest_text, knowledge_query, knowledge_lint
  - Concurrency proof via tokio::join! test demonstrating write lock serialization
affects: [43-hub-chat-wiki-integration]

tech-stack:
  added: []
  patterns: [regex-based wikilink detection, thin-wrapper Tauri command pattern, tokio::join concurrency testing]

key-files:
  created:
    - src-tauri/src/knowledge/lint.rs
    - src-tauri/src/commands/knowledge_commands.rs
  modified:
    - src-tauri/src/knowledge/mod.rs
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/lib.rs
---

## What was built

Lint pipeline with five categories: stale sources (raw file hash vs frontmatter hash), broken wikilinks ([[slug]] and related field pointing to non-existent articles), thin articles (body under 200 non-whitespace chars), orphan pages (unreferenced articles), and LLM-powered contradictions. Four Tauri commands following thin-wrapper pattern with URL detection for ingest. Concurrency test proves two simultaneous engine.ingest() calls serialize through tokio::Mutex and produce consistent index.md.

## Key decisions

- Stale source detection matches raw files by 8-char hash prefix + source name convention
- Thin article threshold: 200 non-whitespace characters
- Orphan detection skipped when only 1 article exists
- Contradiction check uses LLM and is skipped when fewer than 2 articles exist
- Commands follow existing thin-wrapper pattern — no business logic in command layer

## Test results

8 new tests passing (31 total):
- 7 lint tests (stale sources, broken wikilinks, thin articles, orphan pages, contradictions, clean wiki, summary counts)
- 1 concurrency test (two simultaneous ingests produce consistent index with exactly 2 entries)

## Self-Check: PASSED
