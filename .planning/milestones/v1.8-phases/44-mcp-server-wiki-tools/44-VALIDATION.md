---
phase: 44
slug: mcp-server-wiki-tools
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-06
updated: 2026-04-10
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
| 44-01-T1 | 01 | 1 | MCP-01, MCP-02 | unit | `cd mcp-server && npx vitest run src/__tests__/plugin-tools.test.ts -x` | Created by task | ⬜ pending |
| 44-01-T1 | 01 | 1 | MCP-01 | unit | `cd mcp-server && npx vitest run src/__tests__/wiki-tools.test.ts -x` | ✅ EXISTS (9 tests) | ✅ green |
| 44-01-T2 | 01 | 1 | MCP-01, MCP-02 | integration | `cd mcp-server && npx vitest run --reporter=verbose` | ✅ EXISTS | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Existing Test Coverage (from prior execution, validated)

- `mcp-server/src/__tests__/wiki-tools.test.ts` — 9 passing tests covering:
  - MCP-01: wiki_query returns matching articles, handles no-match, handles missing .knowledge/
  - MCP-02: wiki_ingest validates paths, writes queue file, returns acknowledgment
- `mcp-server/src/__tests__/tool-registry.test.ts` — hardcoded tool count + namespace safety

---

## New Tests (created during execution)

- `mcp-server/src/__tests__/plugin-tools.test.ts` — DB-based discovery + dispatch:
  - loadPluginToolsFromDb: empty table, enabled rows, disabled rows, JSON parsing
  - dispatchPluginTool: core handler routing, unknown tool error

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| esbuild preserves dynamic imports in bundled output | SC-3 | Build output inspection | Run `cd mcp-server && node build.ts`, inspect `dist/index.js` for intact `import()` calls |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 satisfied (wiki-tools.test.ts exists with 9 tests, plugin-tools.test.ts created by Task 1)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
