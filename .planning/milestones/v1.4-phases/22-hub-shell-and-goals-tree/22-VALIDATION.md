---
phase: 22
slug: hub-shell-and-goals-tree
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | vite.config.ts (vitest configured inline) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | HUB-03 | unit | `npx vitest run src/components/center/__tests__/CenterPanel.test.tsx -x` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | HUB-01 | unit | `npx vitest run src/components/center/__tests__/HubView.test.tsx -x` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 2 | HUB-02 | unit | `npx vitest run src/components/hub/__tests__/MinimizedColumn.test.tsx -x` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 2 | HUB-04 | unit | `npx vitest run src/components/hub/__tests__/CalendarPlaceholder.test.tsx -x` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 3 | GOAL-01 | unit | `npx vitest run src/components/hub/__tests__/GoalsTreePanel.test.tsx -x` | ❌ W0 | ⬜ pending |
| 22-03-02 | 03 | 3 | GOAL-02 | unit | `npx vitest run src/components/hub/__tests__/GoalsTreeNode.test.tsx -x` | ❌ W0 | ⬜ pending |
| 22-03-03 | 03 | 3 | GOAL-03 | unit | `npx vitest run src/components/hub/__tests__/ChoresSection.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/center/__tests__/CenterPanel.test.tsx` — stubs for HUB-03 (activeView routing)
- [ ] `src/components/center/__tests__/HubView.test.tsx` — stubs for HUB-01 (3-column layout)
- [ ] `src/components/hub/__tests__/MinimizedColumn.test.tsx` — stubs for HUB-02 (minimize/expand)
- [ ] `src/components/hub/__tests__/CalendarPlaceholder.test.tsx` — stubs for HUB-04
- [ ] `src/components/hub/__tests__/GoalsTreePanel.test.tsx` — stubs for GOAL-01 (tree + progress)
- [ ] `src/components/hub/__tests__/GoalsTreeNode.test.tsx` — stubs for GOAL-02 (click navigation)
- [ ] `src/components/hub/__tests__/ChoresSection.test.tsx` — stubs for GOAL-03 (checkbox completion)
- [ ] Checkbox component: `npx shadcn@latest add checkbox`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag resize feels smooth | HUB-01 | Visual/interaction quality | Drag column handles, verify no jank or layout shift |
| Minimized column strip visual | HUB-02 | CSS layout verification | Minimize a column, verify 40px strip with vertical label and "+" button |
| Progress dots visual | GOAL-01 | SVG/CSS rendering | Expand a project node, verify filled/hollow/empty circles render correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
