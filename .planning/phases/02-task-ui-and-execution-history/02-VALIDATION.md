---
phase: 2
slug: task-ui-and-execution-history
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | UI-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | UI-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | UI-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | UI-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | UI-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | TASK-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Vitest installed and configured
- [ ] Test stubs for UI-01 through UI-05 and TASK-04
- [ ] Shared test utilities/fixtures

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar toggle visual rendering | UI-01 | Visual layout verification | Toggle calendar, verify top-left positioning and time-based layout |
| Panel resize persistence | UI-01-UI-05 | localStorage + visual | Resize panels, restart app, verify sizes restored |
| Welcome dashboard appearance | CONTEXT | Visual + interaction | Launch with no task selected, verify dashboard content |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
