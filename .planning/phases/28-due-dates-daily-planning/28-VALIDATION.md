---
phase: 28
slug: due-dates-daily-planning
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) / cargo test (backend) |
| **Config file** | `vitest.config.ts` / `src-tauri/Cargo.toml` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && cd src-tauri && cargo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | DUE-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 28-01-02 | 01 | 1 | DUE-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 28-01-03 | 01 | 1 | DUE-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 28-02-01 | 02 | 2 | PLAN-01 | integration | `npx vitest run && cd src-tauri && cargo test` | ❌ W0 | ⬜ pending |
| 28-02-02 | 02 | 2 | PLAN-02 | integration | `npx vitest run && cd src-tauri && cargo test` | ❌ W0 | ⬜ pending |
| 28-02-03 | 02 | 2 | PLAN-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 28-02-04 | 02 | 2 | PLAN-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for DUE-01 through DUE-03 (due date CRUD, urgency visuals, backlog exemption)
- [ ] Test stubs for PLAN-01 through PLAN-04 (daily plan generation, rescheduling, suggestions, manifest integration)
- [ ] Shared fixtures for task/phase models with dueDate and sortOrder fields

*Existing test infrastructure (vitest + cargo test) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Date picker popover UX | DUE-01 | Visual interaction | Open TaskDetail → click "+ Add due date" → verify popover with calendar and quick-selects |
| Urgency color badges | DUE-02 | Visual rendering | Set task due tomorrow → verify amber badge in goals tree |
| Daily plan briefing narration | PLAN-01 | LLM output quality | Load hub → verify bot presents prioritized daily plan |
| Rescheduling conversation | PLAN-04 | LLM interaction | Tell bot about lost time → verify updated suggestion |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
