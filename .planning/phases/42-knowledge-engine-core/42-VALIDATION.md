---
phase: 42
slug: knowledge-engine-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust built-in `#[test]` + `#[tokio::test]` |
| **Config file** | `src-tauri/Cargo.toml` ([dev-dependencies]: tempfile) |
| **Quick run command** | `cd src-tauri && cargo test knowledge --lib` |
| **Full suite command** | `cd src-tauri && cargo test --lib` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd src-tauri && cargo test knowledge --lib`
- **After every plan wave:** Run `cd src-tauri && cargo test --lib`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 42-01-01 | 01 | 1 | WIKI-01 | unit | `cd src-tauri && cargo test knowledge::ingest::tests` | W0 | pending |
| 42-01-02 | 01 | 1 | WIKI-03 | unit | `cd src-tauri && cargo test knowledge::index::tests` | W0 | pending |
| 42-01-03 | 01 | 1 | WIKI-06 | unit | `cd src-tauri && cargo test knowledge::ingest::tests::test_noop_reingest` | W0 | pending |
| 42-02-01 | 02 | 2 | WIKI-02 | unit | `cd src-tauri && cargo test knowledge::query::tests` | W0 | pending |
| 42-03-01 | 03 | 3 | WIKI-04 | unit | `cd src-tauri && cargo test knowledge::lint::tests` | W0 | pending |
| 42-03-02 | 03 | 3 | WIKI-05 | unit | `cd src-tauri && cargo test knowledge::tests::test_concurrent` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/knowledge/mod.rs` — KnowledgeEngine struct with test scaffolding
- [ ] `src-tauri/src/knowledge/ingest.rs` — ingest pipeline with test stubs
- [ ] `src-tauri/src/knowledge/query.rs` — query pipeline with test stubs
- [ ] `src-tauri/src/knowledge/lint.rs` — lint categories with test stubs
- [ ] `src-tauri/src/knowledge/frontmatter.rs` — parse/serialize with tests
- [ ] `src-tauri/src/knowledge/index.rs` — index operations with tests
- [ ] `src-tauri/src/knowledge/types.rs` — shared types
- [ ] Add `tempfile` to `[dev-dependencies]` if not present

*Test stubs use MockProvider returning canned LLM responses.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LLM compilation quality | WIKI-01 | Output quality depends on model/prompt | Ingest a sample doc, verify article is well-structured and covers source content |
| Query answer relevance | WIKI-02 | Answer quality depends on model/prompt | Ask a question about ingested content, verify answer cites correct articles |
| Contradiction detection accuracy | WIKI-04 | False positive/negative rates vary by model | Ingest contradictory sources, verify lint flags them |

---

## Testing Strategy for LLM-Dependent Operations

1. **Mock the AiProvider trait** — `MockProvider` returns canned responses for unit tests
2. **Test file I/O independently** — frontmatter parsing, index updating, hash computation are deterministic
3. **Test pipeline orchestration** — verify ingest calls provider, writes files, updates index in correct order
4. **Concurrency test** — spawn multiple ingest tasks, verify no file corruption (Plan 03, Task 2)

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
