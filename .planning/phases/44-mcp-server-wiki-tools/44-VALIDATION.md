---
phase: 44
slug: mcp-server-wiki-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^3.0.0 |
| **Config file** | `mcp-server/vitest.config.ts` |
| **Quick run command** | `cd mcp-server && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd mcp-server && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd mcp-server && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd mcp-server && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 44-01-01 | 01 | 1 | MCP-01 | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | ❌ W0 | ⬜ pending |
| 44-01-02 | 01 | 1 | MCP-01 | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | ❌ W0 | ⬜ pending |
| 44-01-03 | 01 | 1 | MCP-01 | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | ❌ W0 | ⬜ pending |
| 44-02-01 | 02 | 1 | MCP-02 | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | ❌ W0 | ⬜ pending |
| 44-02-02 | 02 | 1 | MCP-02 | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | ❌ W0 | ⬜ pending |
| 44-02-03 | 02 | 1 | MCP-02 | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | ❌ W0 | ⬜ pending |
| 44-03-01 | 03 | 1 | SC-3 | unit | `cd mcp-server && npx vitest run src/__tests__/plugin-loader.test.ts -x` | ❌ W0 | ⬜ pending |
| 44-03-02 | 03 | 1 | SC-3 | unit | `cd mcp-server && npx vitest run src/__tests__/plugin-loader.test.ts -x` | ❌ W0 | ⬜ pending |
| 44-03-03 | 03 | 1 | SC-3 | unit | `cd mcp-server && npx vitest run src/__tests__/plugin-loader.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `mcp-server/src/__tests__/wiki-tools.test.ts` — stubs for MCP-01, MCP-02 (wiki_query + wiki_ingest)
- [ ] `mcp-server/src/__tests__/plugin-loader.test.ts` — stubs for SC-3 (dynamic registration)
- [ ] Update `tool-registry.test.ts` — currently expects exactly 23 tools; needs update for dynamic tools

*Existing infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| esbuild preserves dynamic imports in bundled output | SC-3 | Build output inspection | Run `cd mcp-server && node build.ts`, inspect `dist/index.js` for intact `import()` calls with variable paths |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
