---
phase: 27
slug: hub-calendar-view
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
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
| 27-01-01 | 01 | 1 | VIEW-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | VIEW-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 27-01-03 | 01 | 1 | VIEW-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 27-01-04 | 01 | 1 | VIEW-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for calendar view components (TimeGrid, EventBlock, WeekView)
- [ ] Test stubs for overlap algorithm logic
- [ ] Test stubs for time format normalization utilities

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual distinction between work blocks and meetings | VIEW-03 | CSS visual styling requires visual inspection | Verify work blocks use dashed border + accent color vs solid border for meetings |
| Day/week view toggle interaction | VIEW-02 | Layout switching requires visual confirmation | Toggle between views and verify grid re-renders correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
