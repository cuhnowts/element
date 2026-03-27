---
phase: 12
slug: cli-settings-and-schema-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust built-in test (cargo test) |
| **Config file** | src-tauri/Cargo.toml |
| **Quick run command** | `cd src-tauri && cargo test` |
| **Full suite command** | `cd src-tauri && cargo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd src-tauri && cargo test`
- **After every plan wave:** Run `cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | CLI-01 | unit | `cd src-tauri && cargo test models::project::tests::test_app_setting` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | CLI-02 | manual+unit | `cd src-tauri && cargo test -- validate_cli` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | PLAN-05 | unit | `cd src-tauri && cargo test models::project::tests::test_planning_tier` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | SYNC-04 | unit | `cd src-tauri && cargo test models::phase::tests::test_source_default` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/models/project.rs` — test for `set_planning_tier` and `get_project` returning planning_tier
- [ ] `src-tauri/src/models/phase.rs` — test that created phases have `source: "user"` by default
- [ ] `src-tauri/src/models/task.rs` — test that created tasks have `source: "user"` by default
- [ ] Migration 010 SQL — tested implicitly by `setup_test_db()` which runs all migrations

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CLI tool validation on "Open AI" click | CLI-02 | Requires Tauri runtime + system CLI tool | 1. Configure invalid tool in Settings > AI. 2. Click "Open AI". 3. Verify toast error appears. |
| Settings UI renders CLI tool fields | CLI-01 | Visual UI verification | 1. Open Settings > AI. 2. Verify Command and Default arguments fields are visible. |
| Toast when no CLI tool configured | CLI-01 | Requires Tauri + UI interaction | 1. Clear CLI tool setting. 2. Click "Open AI". 3. Verify "No AI tool configured" toast. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
