---
phase: 45
slug: test-suite
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (frontend), cargo test (Rust), Vitest (MCP server) |
| **Config file** | `vitest.config.ts`, `src-tauri/Cargo.toml`, `mcp-server/vitest.config.ts` |
| **Quick run command** | `cd src-tauri && cargo test --lib 2>&1 | tail -5 && cd .. && npx vitest run --reporter=verbose 2>&1 | tail -10` |
| **Full suite command** | `cd src-tauri && cargo test --lib && cd .. && npx vitest run && cd mcp-server && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 45-01-01 | 01 | 1 | TEST-01 | unit | `cd src-tauri && cargo test plugins::tests` | ✅ | ⬜ pending |
| 45-01-02 | 01 | 1 | TEST-01 | unit | `cd src-tauri && cargo test plugins::tests` | ✅ | ⬜ pending |
| 45-02-01 | 02 | 1 | TEST-03 | unit | `npx vitest run src/lib/pluginToolRegistry.test.ts` | ❌ W0 | ⬜ pending |
| 45-02-02 | 02 | 1 | TEST-03 | unit | `npx vitest run src/hooks/usePluginTools.test.ts` | ❌ W0 | ⬜ pending |
| 45-02-03 | 02 | 1 | TEST-03 | unit | `npx vitest run src/stores/__tests__/useHubChatStore.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/pluginToolRegistry.test.ts` — test file for plugin tool registry
- [ ] `src/hooks/usePluginTools.test.ts` — test file for usePluginTools hook

*Existing infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
