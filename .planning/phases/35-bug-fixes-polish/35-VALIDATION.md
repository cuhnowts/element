---
phase: 35
slug: bug-fixes-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | FIX-01 | unit | `npx vitest run src/__tests__/calendar-today.test.ts` | ❌ W0 | ⬜ pending |
| 35-02-01 | 02 | 1 | FIX-02 | unit | `npx vitest run src/__tests__/date-utils.test.ts` | ✅ | ⬜ pending |
| 35-03-01 | 03 | 1 | FIX-03 | unit | `npx vitest run src/__tests__/workflow-collapse.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/calendar-today.test.ts` — stubs for FIX-01 (today label detection)
- [ ] `src/__tests__/workflow-collapse.test.ts` — stubs for FIX-03 (collapse state persistence)

*Existing `date-utils.test.ts` covers FIX-02 `isOverdue()` function.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar today column visual highlight | FIX-01 | CSS visual — bg-card background only visible in rendered UI | Open calendar week view, verify only current day has blue circle and background highlight |
| Workflows section stays collapsed on page reload | FIX-03 | localStorage persistence requires browser context | Collapse workflows, reload page, verify still collapsed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
