---
phase: 29
slug: calendar-mcp-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 29 — Validation Strategy

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
| 29-01-01 | 01 | 1 | MCP-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | MCP-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 29-01-03 | 01 | 1 | MCP-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] MCP tool handler unit tests — stubs for list_events, create_work_block, move_work_block, delete_work_block, find_open_blocks
- [ ] Test fixtures for calendar_events and scheduled_blocks DB data

*Existing vitest infrastructure covers framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hub calendar view updates after MCP work block creation | MCP-02 | Requires Tauri + UI rendering | Create work block via MCP client, verify it appears in hub calendar |
| Approval card renders for destructive MCP tools | MCP-02 | Requires hub chat bot UI | Trigger create/move/delete via hub chat, verify approval card appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
