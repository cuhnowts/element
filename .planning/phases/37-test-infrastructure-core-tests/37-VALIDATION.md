---
phase: 37
slug: test-infrastructure-core-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (TS) / cargo test (Rust) |
| **Config file** | `vitest.config.ts` (to be created) / `src-tauri/Cargo.toml` |
| **Quick run command** | `npx vitest run` / `cd src-tauri && cargo test` |
| **Full suite command** | `npx vitest run --coverage` / `cd src-tauri && cargo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` and/or `cd src-tauri && cargo test`
- **After every plan wave:** Run `npx vitest run --coverage` + `cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | TEST-01 | config | `npx vitest run --coverage` | ❌ W0 | ⬜ pending |
| 37-02-01 | 02 | 1 | TEST-02 | unit | `cd src-tauri && cargo test` | ✅ | ⬜ pending |
| 37-03-01 | 03 | 2 | TEST-03 | integration | `cd src-tauri && cargo test` | ❌ W0 | ⬜ pending |
| 37-04-01 | 04 | 2 | TEST-04 | docs | `test -f .planning/COVERAGE.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — root vitest config with coverage-v8
- [ ] `@vitest/coverage-v8` — install coverage plugin
- [ ] `src-tauri/src/test_fixtures/mod.rs` — shared `setup_test_db()` extraction

*Existing tests in scheduling/ and calendar.rs provide baseline.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
