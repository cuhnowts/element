---
phase: 43
slug: hub-chat-wiki-integration
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
updated: 2026-04-10
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 43-01-01 | 01 | 1 | CHAT-01, CHAT-02 | grep + tsc | `npx tsc --noEmit; grep -c "isPluginTool" src/components/hub/HubChat.tsx` | pending |
| 43-01-02 | 01 | 1 | CHAT-01, CHAT-02 | unit | `npx vitest run src/lib/__tests__/pluginToolRegistry.test.ts src/hooks/__tests__/usePluginTools.test.ts src/components/hub/__tests__/HubChat.test.tsx -x` | pending |
| 43-01-03 | 01 | 1 | CHAT-03 | unit | `npx vitest run src/components/hub/__tests__/buildSystemPrompt.test.ts -x` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

All Wave 0 test files are created by plan 43-01 tasks:

- [x] `src/lib/__tests__/pluginToolRegistry.test.ts` — created by Task 2 (CHAT-01, CHAT-02)
- [x] `src/hooks/__tests__/usePluginTools.test.ts` — created by Task 2 (CHAT-01, CHAT-02)
- [x] `src/components/hub/__tests__/HubChat.test.tsx` — created by Task 2 (CHAT-02 dispatch routing)
- [x] `src/components/hub/__tests__/buildSystemPrompt.test.ts` — created by Task 3 (CHAT-03)

All test files are created within plan 43-01 itself. No external Wave 0 dependencies.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI routes user question to correct plugin skill | CHAT-02 | Requires live LLM inference | 1. Open hub chat 2. Ask "What do we know about X?" 3. Verify AI calls knowledge:query |
| Confirmation card renders and blocks destructive action | CHAT-02 | Visual rendering + user interaction | 1. Ask hub chat to ingest a document 2. Verify confirmation card appears 3. Click confirm, verify action executes |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (revised 2026-04-10)
