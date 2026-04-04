---
phase: 21
slug: central-ai-agent
status: draft
nyquist_compliant: true
wave_0_complete: true
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 21-01-01 | 01 | 1 | AGENT-02 | build | `cd mcp-server && node -e "require('./package.json')" && npx tsc --noEmit` | ⬜ pending |
| 21-01-02 | 01 | 1 | AGENT-02,05,06 | build+smoke | `cd mcp-server && npx tsc --noEmit && npm run build` | ⬜ pending |
| 21-02-01 | 02 | 1 | AGENT-01,04 | unit | `npx vitest run src/stores/useAgentStore.test.ts` | ⬜ pending |
| 21-03-01 | 03 | 2 | AGENT-01,04 | unit | `npx vitest run src/hooks/__tests__/useAgentLifecycle.test.ts` | ⬜ pending |
| 21-04-01 | 04 | 2 | AGENT-01,04,05 | build | `npx tsc --noEmit && ls src/components/agent/*.tsx \| wc -l` | ⬜ pending |
| 21-05-01 | 05 | 3 | AGENT-03,05 | build | `npx tsc --noEmit` | ⬜ pending |
| 21-05-02 | 05 | 3 | AGENT-03,05 | build | `npx tsc --noEmit` | ⬜ pending |
| 21-06-01 | 06 | 4 | AGENT-01,02,03,06 | integration | `cd mcp-server && npm test && cd .. && npx vitest run src/components/agent/__tests__/AgentPanel.test.tsx` | ⬜ pending |
| 21-06-02 | 06 | 4 | ALL | checkpoint | Human verification of end-to-end experience | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Nyquist Compliance Analysis

**Sampling continuity check (max 3 consecutive tasks without behavioral automated verify):**

- Wave 1: 21-01-01 (build), 21-01-02 (build+smoke), 21-02-01 (unit -- **behavioral test**) -- PASS (2 build then behavioral)
- Wave 2: 21-03-01 (unit -- **behavioral test**), 21-04-01 (build) -- PASS (behavioral then build)
- Wave 3: 21-05-01 (build), 21-05-02 (build) -- 2 consecutive build-only
- Wave 4: 21-06-01 (integration -- **behavioral test**) -- PASS (breaks streak at 2)

**Longest streak without behavioral test:** 3 (21-04-01, 21-05-01, 21-05-02) -- at limit but within bounds.

Key behavioral test points:
- Plan 02 (Wave 1): `useAgentStore.test.ts` -- 12+ unit tests for store actions
- Plan 03 (Wave 2): `useAgentLifecycle.test.ts` -- backoff logic, state transitions
- Plan 06 (Wave 4): `tool-registry.test.ts`, `project-tools.test.ts`, `AgentPanel.test.tsx` -- integration tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent survives project switch | AGENT-01 | Requires live Tauri window + terminal | Switch projects in sidebar, verify agent terminal persists |
| "Open AI" seeds context | AGENT-03 | Requires live UI interaction | Click "Open AI" on project, verify agent terminal receives context |
| Notification appears on human input needed | AGENT-06 | Requires notification system + Tauri | Trigger approval request, verify notification appears |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no more than 3 consecutive tasks without behavioral automated verify
- [x] No Wave 0 stubs needed -- behavioral tests are embedded in plans 02, 03, and 06
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
