---
phase: 21
slug: central-ai-agent
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) + Tauri integration tests |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && cargo test --manifest-path src-tauri/Cargo.toml` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && cargo test --manifest-path src-tauri/Cargo.toml`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | AGENT-01 | integration | `npx vitest run src/__tests__/mcp-server` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | AGENT-02 | integration | `npx vitest run src/__tests__/agent-state` | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 2 | AGENT-03 | integration | `npx vitest run src/__tests__/agent-context` | ❌ W0 | ⬜ pending |
| 21-02-02 | 02 | 2 | AGENT-04 | integration | `npx vitest run src/__tests__/agent-execute` | ❌ W0 | ⬜ pending |
| 21-03-01 | 03 | 2 | AGENT-05 | integration | `npx vitest run src/__tests__/agent-approval` | ❌ W0 | ⬜ pending |
| 21-03-02 | 03 | 2 | AGENT-06 | integration | `npx vitest run src/__tests__/agent-notify` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/mcp-server/` — test stubs for MCP sidecar server
- [ ] `src/__tests__/agent-state/` — test stubs for project state reading
- [ ] `src/__tests__/agent-context/` — test stubs for context seeding
- [ ] `src/__tests__/agent-execute/` — test stubs for auto-execution flow
- [ ] `src/__tests__/agent-approval/` — test stubs for approval flow
- [ ] `src/__tests__/agent-notify/` — test stubs for notification integration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent survives project switch | AGENT-01 | Requires live Tauri window + terminal | Switch projects in sidebar, verify agent terminal persists |
| "Open AI" seeds context | AGENT-03 | Requires live UI interaction | Click "Open AI" on project, verify agent terminal receives context |
| Notification appears on human input needed | AGENT-06 | Requires notification system + Tauri | Trigger approval request, verify notification appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
