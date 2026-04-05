---
phase: 40
slug: testing-mcp-server
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + cargo test |
| **Config file** | `vitest.config.ts` / `src-tauri/Cargo.toml` |
| **Quick run command** | `npx vitest run --reporter=json mcp-server/src/__tests__/` |
| **Full suite command** | `npx vitest run && cd src-tauri && cargo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=json mcp-server/src/__tests__/`
- **After every plan wave:** Run `npx vitest run && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | TMCP-01 | integration | `npx vitest run mcp-server/src/__tests__/discover.test.ts` | ❌ W0 | ⬜ pending |
| 40-01-02 | 01 | 1 | TMCP-02 | integration | `npx vitest run mcp-server/src/__tests__/run-tests.test.ts` | ❌ W0 | ⬜ pending |
| 40-01-03 | 01 | 1 | TMCP-03 | integration | `npx vitest run mcp-server/src/__tests__/coverage-gaps.test.ts` | ❌ W0 | ⬜ pending |
| 40-01-04 | 01 | 1 | TMCP-04 | unit | `npx vitest run mcp-server/src/__tests__/security.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `mcp-server/src/__tests__/discover.test.ts` — stubs for TMCP-01
- [ ] `mcp-server/src/__tests__/run-tests.test.ts` — stubs for TMCP-02
- [ ] `mcp-server/src/__tests__/coverage-gaps.test.ts` — stubs for TMCP-03
- [ ] `mcp-server/src/__tests__/security.test.ts` — stubs for TMCP-04

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code calls MCP tools end-to-end | TMCP-01..03 | Requires Claude Code client runtime | Start Claude Code, ask it to discover/run tests, verify structured output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
