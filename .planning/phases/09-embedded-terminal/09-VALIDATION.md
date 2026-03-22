---
phase: 9
slug: embedded-terminal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 (frontend), Rust tests (backend) |
| **Config file** | vite.config.ts (`test` section) |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && cd src-tauri && cargo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | TERM-01 | unit | `npx vitest run src/components/output/TerminalTab.test.tsx` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | TERM-01 | unit (rust) | `cd src-tauri && cargo test terminal` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | TERM-02 | unit | `npx vitest run src/hooks/useTerminal.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | TERM-03 | unit | `npx vitest run src/components/output/TerminalTab.test.tsx` | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 1 | TERM-03 | unit | `npx vitest run src/hooks/useKeyboardShortcuts.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/output/TerminalTab.test.tsx` — stubs for TERM-01, TERM-03 (rendering, empty state, resize)
- [ ] `src/hooks/useTerminal.test.ts` — stubs for TERM-02 (CWD setting, lifecycle)
- [ ] `src/hooks/useKeyboardShortcuts.test.ts` — stub for TERM-03 (Ctrl+` shortcut)
- [ ] Mock for `tauri-pty` `spawn` function in test setup

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full PTY interaction (typing, scrollback, colors) | TERM-03 | jsdom cannot run real PTY/xterm.js | Open terminal tab, run `ls --color`, verify colored output, scroll up/down |
| Copy/paste in terminal | TERM-03 | Requires real clipboard + xterm.js | Select text in terminal, Cmd+C, click elsewhere, Cmd+V |
| Terminal auto-opens on first project select | TERM-01 | Requires app lifecycle state | Select a project with linked dir, verify drawer opens to Terminal tab |
| Shell environment matches login shell | TERM-01 | Requires real shell + PATH | Run `echo $PATH` in terminal, compare with external terminal |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
