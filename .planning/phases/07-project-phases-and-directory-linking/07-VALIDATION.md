---
phase: 7
slug: project-phases-and-directory-linking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Rust)** | cargo test (built-in, rusqlite in-memory) |
| **Framework (Frontend)** | vitest + jsdom |
| **Config file** | `vite.config.ts` (test section) |
| **Quick run command (Rust)** | `cd src-tauri && cargo test` |
| **Quick run command (Frontend)** | `npm test` |
| **Full suite command** | `cd src-tauri && cargo test && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd src-tauri && cargo test` + `npm test`
- **After every plan wave:** Run `cd src-tauri && cargo test && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PROJ-01 | unit (Rust) | `cd src-tauri && cargo test models::project::tests::test_link_directory` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | PROJ-02 | unit (Rust) | `cd src-tauri && cargo test models::phase::tests` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | PROJ-03 | unit (Rust) | `cd src-tauri && cargo test models::phase::tests::test_task_phase_assignment` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | PROJ-04 | unit (Frontend) | `npm test -- --run src/components/center/__tests__/ProjectDetail.test.tsx` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | PROJ-05 | unit (Frontend) | `npm test -- --run src/components/center/__tests__/ProjectDetail.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/models/phase.rs` — Rust unit tests for Phase CRUD (create, list, reorder, delete, cascade behavior)
- [ ] `src-tauri/src/models/project.rs` — Additional test for `link_directory` / `update_project` with directory_path
- [ ] `src/components/center/__tests__/ProjectDetail.test.tsx` — Frontend tests for progress computation, phase rendering

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native directory picker opens | PROJ-01 | Tauri dialog requires OS-level interaction | 1. Click "Link Directory" 2. Verify OS picker opens 3. Select folder 4. Verify path displayed |
| Drag-and-drop phase reorder | PROJ-02 | Requires pointer events + visual verification | 1. Create 3+ phases 2. Drag phase 3 above phase 1 3. Verify sort_order updated in DB |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
