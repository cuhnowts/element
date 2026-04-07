---
phase: 43
slug: hub-chat-wiki-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
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
| 43-01-01 | 01 | 1 | CHAT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 43-01-02 | 01 | 1 | CHAT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 43-02-01 | 02 | 1 | CHAT-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 43-02-02 | 02 | 1 | CHAT-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for dynamic plugin tool loading (CHAT-01)
- [ ] Test stubs for wiki query/ingest chat flows (CHAT-02)
- [ ] Test stubs for intent-scoped system prompt (CHAT-03)

*Existing vitest infrastructure may need hub chat test fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wiki query renders synthesized answer inline | CHAT-02 | Requires LLM response rendering in chat UI | Type wiki query, verify answer appears as bot message with citations |
| Plugin skills appear in chat tool list on mount | CHAT-01 | Requires full plugin registry + chat mount lifecycle | Open hub chat, verify plugin tools listed without code changes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
