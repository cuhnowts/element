---
phase: 19
slug: multi-terminal-sessions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 19 — Validation Strategy

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
| 19-01-01 | 01 | 1 | TERM-01 | unit | `npx vitest run src/stores/__tests__/terminalSessionStore.test.ts` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | TERM-02 | unit | `npx vitest run src/stores/__tests__/terminalSessionStore.test.ts` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 1 | TERM-03 | integration | `npx vitest run src/components/__tests__/TerminalTabs.test.tsx` | ❌ W0 | ⬜ pending |
| 19-02-02 | 02 | 1 | TERM-04 | unit | `npx vitest run src/stores/__tests__/terminalSessionStore.test.ts` | ❌ W0 | ⬜ pending |
| 19-03-01 | 03 | 2 | TERM-05 | integration | `npx vitest run src/components/__tests__/TerminalTabs.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/stores/__tests__/terminalSessionStore.test.ts` — stubs for TERM-01, TERM-02, TERM-04
- [ ] `src/components/__tests__/TerminalTabs.test.tsx` — stubs for TERM-03, TERM-05

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PTY zombie process cleanup within 5s | TERM-04 | Requires Tauri runtime + OS process inspection | Close terminal tab, run `ps aux \| grep pty` after 5s, verify no orphans |
| WebGL fallback to canvas renderer | TERM-02 | Requires 16+ xterm instances to trigger limit | Open 17 terminal tabs, verify last tabs render without errors |
| App-quit cleanup of all PTY processes | TERM-04 | Requires Tauri close event + OS inspection | Quit app, verify all child PTY processes terminated |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
