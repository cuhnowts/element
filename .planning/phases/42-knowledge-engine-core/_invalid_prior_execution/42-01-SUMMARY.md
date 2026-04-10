---
phase: 42-knowledge-engine-core
plan: 01
subsystem: knowledge
tags: [rust, sha256, yaml, frontmatter, index]

requires: []
provides:
  - KnowledgeEngine struct with tokio::Mutex write lock
  - Shared types: SourceInput, IngestResult, QueryResult, LintReport, KnowledgeError
  - WikiFrontmatter YAML serialize/deserialize with round-trip fidelity
  - SHA-256 content hashing for staleness detection
  - Index.md CRUD operations with alphabetical sorting and tag cloud
  - KnowledgeEngine registered as Tauri managed state
affects: [42-02, 42-03, 43-hub-chat-wiki-integration]

tech-stack:
  added: []
  patterns: [tokio::Mutex for write serialization, YAML frontmatter format, index.md markdown table format]

key-files:
  created:
    - src-tauri/src/knowledge/mod.rs
    - src-tauri/src/knowledge/types.rs
    - src-tauri/src/knowledge/frontmatter.rs
    - src-tauri/src/knowledge/index.rs
  modified:
    - src-tauri/src/lib.rs
---

## What was built

Foundation layer for the knowledge engine: type definitions, YAML frontmatter handling with round-trip fidelity and special character escaping, SHA-256 content hashing, index.md read/write/add/remove operations with alphabetical sorting and tag cloud generation, and the KnowledgeEngine struct with tokio::Mutex write lock for concurrency safety.

## Key decisions

- Used hand-rolled YAML serializer/parser (not serde_yaml) for consistent field ordering and escaping control
- Index.md uses Markdown table format optimized for LLM retrieval per research context
- Tag cloud sorted by frequency descending, then alphabetically
- KnowledgeEngine initialized during Tauri setup with .knowledge/ directory in app data

## Test results

11 tests passing:
- 5 frontmatter tests (hash determinism, round-trip, special chars, article parsing)
- 6 index tests (round-trip, add to empty, replace existing, remove, tag cloud, sorting)

## Self-Check: PASSED
