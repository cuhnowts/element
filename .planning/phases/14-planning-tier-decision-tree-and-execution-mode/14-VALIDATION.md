---
phase: 14
slug: planning-tier-decision-tree-and-execution-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 14 — Validation Strategy

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
| 14-01-01 | 01 | 1 | PLAN-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | PLAN-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | PLAN-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | PLAN-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 2 | CTX-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for tier selection dialog components (PLAN-01)
- [ ] Test stubs for quick tier task generation (PLAN-02)
- [ ] Test stubs for medium tier conversation flow (PLAN-03)
- [ ] Test stubs for GSD tier launch and storage (PLAN-04)
- [ ] Test stubs for execution mode / "what's next" view (CTX-03)

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tier dialog visual layout | PLAN-01 | Visual/interaction | Open project without plan, verify 3-tier dialog appears |
| Terminal launches with correct context | PLAN-04 | E2E with Tauri | Select GSD tier, verify terminal opens with GSD instructions |
| Progress display accuracy | CTX-03 | Visual + data | Create project with tasks, click Open AI, verify progress shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
