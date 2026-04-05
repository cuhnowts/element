---
phase: 31
slug: drawer-consolidation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (with jsdom) |
| **Config file** | `vite.config.ts` (inline `test` block) |
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
| 31-01-01 | 01 | 1 | DRAW-01 | unit | `npx vitest run src/stores/useWorkspaceStore -t "drawer" -x` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | DRAW-02 | unit | `npx vitest run src/components/agent/__tests__/ -x` | ❌ W0 | ⬜ pending |
| 31-01-03 | 01 | 1 | DRAW-03 | unit | `npx vitest run -x` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Update `src/stores/useAgentStore.test.ts` — remove tests for `panelOpen`/`togglePanel`, add tests for `agentCommand`/`agentArgs` store fields
- [ ] Update `src/components/agent/__tests__/AgentPanel.test.tsx` — rewrite or delete (AgentPanel component is being deleted)
- [ ] Add test for DrawerTab union accepting "elementai" value in workspace store
- [ ] Add test for keyboard shortcut Cmd+Shift+A opening drawer to elementai tab

*Existing infrastructure covers framework installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag handle resizes drawer smoothly | DRAW-01 | Visual/interaction quality | Drag handle bar up/down, verify smooth resize with no jank |
| Agent terminal maintains scroll position on tab switch | DRAW-02 | Terminal state preservation | Open AI tab, scroll terminal, switch to Terminal tab and back, verify scroll position |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
