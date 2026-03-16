---
phase: 3
slug: workflows-and-automation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (frontend)** | Vitest 4.x (configured in vite.config.ts) |
| **Framework (backend)** | cargo test (built-in) |
| **Config file** | vite.config.ts (test section), no separate vitest.config |
| **Quick run command** | `npm run test && cd src-tauri && cargo test` |
| **Full suite command** | `npm run test && cd src-tauri && cargo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test && cd src-tauri && cargo test`
- **After every plan wave:** Run `npm run test && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | TASK-05 | unit (Rust) | `cd src-tauri && cargo test engine::` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 0 | TASK-05 | unit (React) | `npx vitest run src/components/center/WorkflowBuilder.test.tsx` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 0 | TASK-06 | unit (Rust) | `cd src-tauri && cargo test models::workflow` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 0 | AUTO-01 | unit (Rust) | `cd src-tauri && cargo test models::schedule` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 0 | AUTO-01 | unit (React) | `npx vitest run src/components/center/CronScheduler.test.tsx` | ❌ W0 | ⬜ pending |
| 03-01-06 | 01 | 0 | AUTO-02 | unit (Rust) | `cd src-tauri && cargo test commands::workflow_commands::test_promote` | ❌ W0 | ⬜ pending |
| 03-01-07 | 01 | 0 | AUTO-03 | unit (Rust) | `cd src-tauri && cargo test engine::shell` | ❌ W0 | ⬜ pending |
| 03-01-08 | 01 | 0 | AUTO-04 | unit (Rust) | `cd src-tauri && cargo test engine::http` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/engine/mod.rs` — engine module declaration
- [ ] `src-tauri/src/engine/shell.rs` tests — shell executor unit tests with mocked processes
- [ ] `src-tauri/src/engine/http.rs` tests — HTTP executor unit tests (use mockito or wiremock crate)
- [ ] `src-tauri/src/models/schedule.rs` tests — schedule CRUD, cron next-run computation
- [ ] `src-tauri/src/db/sql/002_workflows.sql` — migration for new tables
- [ ] `src/components/center/WorkflowBuilder.test.tsx` — step list rendering, insert, reorder
- [ ] `src/components/center/CronScheduler.test.tsx` — preset selection, advanced mode toggle
- [ ] Rust test dependency: `mockito` or `wiremock` crate for HTTP mocking

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Flowchart diagram renders correctly | TASK-05 | Visual rendering (SVG/canvas) | Open workflow with 3+ steps, verify arrows and step boxes render in correct order |
| Shell command streams output in real-time | AUTO-03 | Requires running process + observing UI | Run `sleep 3 && echo done` step, verify output appears progressively |
| Missed cron runs catch up on launch | AUTO-01 | Requires app restart timing | Schedule hourly job, close app for 2+ hours, reopen, verify catch-up execution |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
