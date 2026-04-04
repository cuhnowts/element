---
phase: 24
slug: hub-chat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
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
| TBD | TBD | TBD | CHAT-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CHAT-02 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CHAT-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CHAT-04 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/stores/__tests__/useHubChatStore.test.ts` — stubs for CHAT-01, CHAT-02, CHAT-03
- [ ] `src/components/hub/__tests__/HubChat.test.tsx` — stubs for CHAT-01, CHAT-04

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Streaming markdown renders progressively | CHAT-02 | Visual rendering quality requires human eye | Send a message, verify tokens appear word-by-word with markdown formatting |
| Chat input auto-expands | CHAT-01 | DOM measurement behavior | Type multi-line text, verify textarea grows up to 4 lines |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
