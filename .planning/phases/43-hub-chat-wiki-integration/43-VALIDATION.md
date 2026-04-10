---
phase: 43
slug: hub-chat-wiki-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 43-01-01 | 01 | 0 | CHAT-01 | unit | `npx vitest run src/hooks/__tests__/usePluginTools.test.ts -x` | ❌ W0 | ⬜ pending |
| 43-01-02 | 01 | 0 | CHAT-02 | unit | `npx vitest run src/components/hub/__tests__/HubChat.test.tsx -x` | ❌ W0 | ⬜ pending |
| 43-01-03 | 01 | 0 | CHAT-03 | unit | `npx vitest run src/components/hub/__tests__/buildSystemPrompt.test.ts -x` | ❌ W0 | ⬜ pending |
| 43-02-01 | 02 | 1 | CHAT-01 | unit | `npx vitest run src/hooks/__tests__/usePluginTools.test.ts -x` | ❌ W0 | ⬜ pending |
| 43-02-02 | 02 | 1 | CHAT-01 | unit | `npx vitest run src/components/hub/__tests__/HubChat.test.tsx -x` | ❌ W0 | ⬜ pending |
| 43-03-01 | 03 | 1 | CHAT-02 | unit | `npx vitest run src/components/hub/__tests__/HubChat.test.tsx -x` | ❌ W0 | ⬜ pending |
| 43-04-01 | 04 | 2 | CHAT-03 | unit | `npx vitest run src/components/hub/__tests__/buildSystemPrompt.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/__tests__/usePluginTools.test.ts` — stubs for CHAT-01, CHAT-02 (plugin tool fetch + dispatch)
- [ ] `src/components/hub/__tests__/HubChat.test.tsx` — extend existing tests for plugin tool merge and confirmation cards
- [ ] `src/components/hub/__tests__/buildSystemPrompt.test.ts` — stubs for CHAT-03 (dynamic prompt assembly)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI routes user question to correct plugin skill | CHAT-02 | Requires live LLM inference | 1. Open hub chat 2. Ask "What do we know about X?" 3. Verify AI calls knowledge:query |
| Confirmation card renders and blocks destructive action | CHAT-02 | Visual rendering + user interaction | 1. Ask hub chat to ingest a document 2. Verify confirmation card appears 3. Click confirm, verify action executes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
