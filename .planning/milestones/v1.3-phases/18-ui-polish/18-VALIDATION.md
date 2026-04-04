---
phase: 18
slug: ui-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | UI-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-02 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-03 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-04 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-06 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-07 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for AI button state machine (UI-05, UI-07)
- [ ] Test stubs for sidebar click behavior (UI-01)
- [ ] Test stubs for drawer tab default (UI-06)

*Existing test files: OpenAiButton.test.tsx, ThemeSidebar.test.tsx, TaskDetail.test.tsx (stubs only)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual clutter reduction in task detail | UI-03 | Subjective visual assessment | Open task detail, verify only title/status/priority/description visible; context/tags/scheduling/execution in accordion sections |
| Sidebar collapse animation smoothness | UI-02 | Visual/performance assessment | Rapidly toggle theme sections, verify no jank or layout shift |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
