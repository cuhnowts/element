---
phase: 8
slug: file-explorer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Frontend)** | vitest 4.1.0 |
| **Config file** | None detected — needs vite/vitest config or inline |
| **Quick run command (Frontend)** | `npm run test` |
| **Full suite command (Frontend)** | `npm run test` |
| **Framework (Backend)** | Rust built-in `#[cfg(test)]` + `#[tokio::test]` |
| **Quick run command (Backend)** | `cd src-tauri && cargo test file_explorer` |
| **Full suite command (Backend)** | `cd src-tauri && cargo test` |
| **Estimated runtime** | ~15 seconds (backend), ~10 seconds (frontend) |

---

## Sampling Rate

- **After every task commit:** Run `cd src-tauri && cargo test file_explorer` + `npm run test`
- **After every plan wave:** Run `cd src-tauri && cargo test` + `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | FILE-01 | integration (backend) | `cd src-tauri && cargo test file_explorer` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | FILE-03 | unit (backend) | `cd src-tauri && cargo test list_directory` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | FILE-02 | unit (backend) | `cd src-tauri && cargo test open_file` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | FILE-04 | integration (backend) | `cd src-tauri && cargo test file_watcher` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/commands/file_explorer_commands.rs` — backend unit tests for list_directory filtering, open_file, watcher lifecycle
- [ ] Test helper: temp directory with .gitignore file and various file types for testing ignore behavior
- [ ] Frontend: `src/components/center/__tests__/FileExplorer.test.tsx` — if vitest config supports component testing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tree view renders correctly in workspace panel | FILE-01 | UI visual verification | Open project with linked directory, verify tree appears with correct indentation |
| File opens in default external editor | FILE-02 | Requires desktop environment | Click a file in tree, verify it opens in system default editor |
| Live updates reflected in UI | FILE-04 | Requires filesystem events + UI rendering | Add/remove/rename file on disk, verify tree updates within 2 seconds |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
