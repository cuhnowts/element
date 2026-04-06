---
phase: 32
slug: hub-layout-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npx vitest run src/components/center/__tests__/HubView.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/center/__tests__/HubView.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 0 | HUB-01 | unit | `npx vitest run src/components/center/__tests__/HubView.test.tsx -t "full-width"` | Exists (.todo) | ⬜ pending |
| 32-01-02 | 01 | 0 | HUB-02 | unit | `npx vitest run src/components/hub/__tests__/HubToolbar.test.tsx -t "goals panel"` | ❌ W0 | ⬜ pending |
| 32-01-03 | 01 | 0 | HUB-03 | unit | `npx vitest run src/components/hub/__tests__/HubToolbar.test.tsx -t "calendar panel"` | ❌ W0 | ⬜ pending |
| 32-01-04 | 01 | 0 | HUB-04 | unit | `npx vitest run src/components/hub/__tests__/ActionButtons.test.tsx` | ❌ W0 | ⬜ pending |
| 32-01-05 | 01 | 0 | HUB-05 | unit | `npx vitest run src/components/hub/__tests__/SlideOverPanel.test.tsx -t "transform"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/center/__tests__/HubView.test.tsx` — replace .todo tests with real assertions for new layout
- [ ] `src/components/hub/__tests__/SlideOverPanel.test.tsx` — covers HUB-05 (CSS transform classes)
- [ ] `src/components/hub/__tests__/HubToolbar.test.tsx` — covers HUB-02, HUB-03 toggle behavior
- [ ] `src/components/hub/__tests__/ActionButtons.test.tsx` — covers HUB-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSS transform animation is visually smooth (no jank) | HUB-05 | Visual smoothness requires human judgment | Toggle both panels rapidly; verify no layout reflow or jitter |
| Panel overlay does not obscure center content interaction | HUB-01 | Click-through behavior is interaction quality | With panel open, click chat input in center view; verify it receives focus |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
