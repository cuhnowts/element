---
phase: 1
slug: desktop-shell-and-task-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend), cargo test (Rust backend) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run && cd src-tauri && cargo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | DATA-01 | integration | `cd src-tauri && cargo test db` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | DATA-02 | unit | `cd src-tauri && cargo test workflow_file` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | TASK-01 | integration | `cd src-tauri && cargo test task_crud` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | TASK-02 | integration | `cd src-tauri && cargo test task_organize` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | TASK-03 | integration | `cd src-tauri && cargo test task_status` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | UI-06 | manual | visual inspection | N/A | ⬜ pending |
| 01-03-02 | 03 | 2 | TASK-01 | component | `npm run test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/tests/db_test.rs` — stubs for DATA-01 (SQLite persistence)
- [ ] `src-tauri/tests/task_test.rs` — stubs for TASK-01, TASK-02, TASK-03
- [ ] `src-tauri/tests/workflow_file_test.rs` — stubs for DATA-02 (workflow file storage)
- [ ] `vitest` — install and configure for frontend component tests
- [ ] `src/__tests__/` — directory for frontend test stubs

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App feels like native desktop (menus, shortcuts, system tray) | UI-06 | Native OS integration cannot be tested in headless CI | Launch app, verify: 1) system tray icon appears, 2) native menu bar has File/Edit/Window menus, 3) Cmd+Q quits, 4) Cmd+N creates task |
| Data persists across restarts | DATA-01 | Requires full app lifecycle (launch → create → quit → relaunch → verify) | Create a task, quit app, relaunch, verify task still visible |
| External repos not stored | DATA-03 | Architectural constraint, not testable via unit test | Verify no project files are copied into app data directory |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
