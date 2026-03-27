---
phase: 15
slug: planning-folder-sync
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust built-in (`#[cfg(test)]` + `#[test]`) / Vitest for frontend |
| **Config file** | `src-tauri/Cargo.toml` (Rust) / `vitest.config.ts` (frontend) |
| **Quick run command** | `cd src-tauri && cargo test planning_sync -x` |
| **Full suite command** | `cd src-tauri && cargo test --lib && cd .. && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd src-tauri && cargo test planning_sync -x`
- **After every plan wave:** Run `cd src-tauri && cargo test --lib && cd .. && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | SYNC-01 | unit | `cd src-tauri && cargo test planning_sync -x` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | SYNC-01 | unit | `cd src-tauri && cargo test planning_sync -x` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 1 | SYNC-01 | unit | `cd src-tauri && cargo test planning_sync -x` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | SYNC-02 | manual | Manual: edit ROADMAP.md while app running | N/A | ⬜ pending |
| 15-02-02 | 02 | 1 | SYNC-03 | unit | `cd src-tauri && cargo test planning_sync -x` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | SYNC-01 | unit | `npx vitest run PhaseRow` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/models/planning_sync.rs` — parser unit tests (SYNC-01: parse phases, tasks, checkbox states, skip backlog)
- [ ] `src-tauri/src/models/planning_sync.rs` — content hash unit tests (SYNC-03: hash comparison prevents re-import)
- [ ] `src/components/center/PhaseRow.test.tsx` — badge visibility test (SYNC-01 UI: GSD badge renders for source='sync')

*Existing test infrastructure (Cargo test + Vitest) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| File watcher detects ROADMAP.md changes | SYNC-02 | Requires running app + filesystem events | 1. Open GSD-tier project 2. Edit .planning/ROADMAP.md externally 3. Verify toast appears and phases update |
| Auto-import on project open | SYNC-02 | Requires app lifecycle + project selection | 1. Open app 2. Select GSD-tier project with .planning/ 3. Verify phases appear without manual trigger |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
