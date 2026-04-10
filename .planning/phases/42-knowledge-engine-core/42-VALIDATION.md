---
phase: 42
slug: knowledge-engine-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
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
| 42-01-01 | 01 | 1 | WIKI-01 | unit | `cd src-tauri && cargo test knowledge::ingest::tests -x` | ❌ W0 | ⬜ pending |
| 42-01-02 | 01 | 1 | WIKI-02 | unit | `cd src-tauri && cargo test knowledge::query::tests -x` | ❌ W0 | ⬜ pending |
| 42-01-03 | 01 | 1 | WIKI-03 | unit | `cd src-tauri && cargo test knowledge::index::tests -x` | ❌ W0 | ⬜ pending |
| 42-01-04 | 01 | 1 | WIKI-04 | unit | `cd src-tauri && cargo test knowledge::lint::tests -x` | ❌ W0 | ⬜ pending |
| 42-01-05 | 01 | 1 | WIKI-05 | unit | `cd src-tauri && cargo test knowledge::tests::test_concurrent -x` | ❌ W0 | ⬜ pending |
| 42-01-06 | 01 | 1 | WIKI-06 | unit | `cd src-tauri && cargo test knowledge::ingest::tests::test_noop_reingest -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/knowledge/mod.rs` — KnowledgeEngine struct with tests
- [ ] `src-tauri/src/knowledge/ingest.rs` — ingest pipeline with tests
- [ ] `src-tauri/src/knowledge/query.rs` — query pipeline with tests
- [ ] `src-tauri/src/knowledge/lint.rs` — lint categories with tests
- [ ] `src-tauri/src/knowledge/frontmatter.rs` — parse/serialize with tests
- [ ] `src-tauri/src/knowledge/index.rs` — index operations with tests
- [ ] `src-tauri/src/knowledge/types.rs` — shared types

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plugin enable/disable lifecycle | SC-2 | Requires plugin system integration | Enable knowledge plugin, verify skills registered; disable, verify removed |

---

## Testing Strategy for LLM-Dependent Operations

LLM calls (ingest compilation, query synthesis, contradiction lint) cannot be deterministically tested. Strategy:
1. **Mock the AiProvider trait** — create a `MockProvider` that returns canned responses for unit tests
2. **Test file I/O independently** — frontmatter parsing, index updating, hash computation are all testable without LLM
3. **Test pipeline orchestration** — verify that ingest calls the provider, writes files, updates index in correct order
4. **Concurrency test** — spawn multiple ingest tasks, verify no file corruption

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
