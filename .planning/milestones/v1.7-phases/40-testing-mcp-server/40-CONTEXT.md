# Phase 40: Testing MCP Server - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

An MCP server that lets Claude Code discover, run, and analyze tests through structured tools — making it a self-directed test-writing agent. Covers `discover_tests`, `run_tests`, and `check_coverage_gaps` tools with argument-array execution (no shell interpolation).

</domain>

<decisions>
## Implementation Decisions

### Server Architecture
- **D-01:** Claude's Discretion — separate server vs extending element-mcp. Recommendation: separate `testing-mcp-server/` package since test tools don't need DB access and have different concerns (filesystem/CLI vs SQLite). Follow existing `mcp-server/` patterns (esbuild bundle, `@modelcontextprotocol/sdk`, tool-file organization).
- **D-02:** Claude's Discretion — generic (project-agnostic) vs Element-specific. Recommendation: generic, configured via args/env for project root. Aligns with PROJECT.md's "tool-agnostic but Claude Code is primary consumer" framing.
- **D-03:** Stdio transport (same as element-mcp). User confirmed.

### Test Discovery Design
- **D-04:** Claude's Discretion — discovery approach. Recommendation: CLI output parsing (`vitest list --json`, `cargo test -- --list`) for accuracy, with file scanning as fallback/fast path.
- **D-05:** Claude's Discretion — metadata level. Recommendation: rich metadata (file, suite/module, test name, line number) so Claude can navigate to test source.
- **D-06:** Claude's Discretion — filtering. Recommendation: support optional `runner` and `file` params to narrow results.

### Coverage Gap Analysis
- **D-07:** Claude's Discretion — coverage tools. Recommendation: start with `@vitest/coverage-v8` JSON parsing (Phase 37 sets this up). Add Rust coverage if cargo-tarpaulin/llvm-cov is configured in Phase 37.
- **D-08:** Claude's Discretion — gap definition. Recommendation: uncovered files + uncovered functions within partially-tested files for granular gap analysis.

### Result Structure
- **D-09:** Per-test results — each test gets its own pass/fail/error entry with name, file, duration, and error message. User confirmed.
- **D-10:** Full error output — stack traces and assertion diffs included per failed test. User confirmed.
- **D-11:** Flexible targeting — accept file path, test name pattern, or runner as params. Claude can run a single test, all tests in a file, or the full suite. User confirmed.

### Claude's Discretion
Claude has flexibility on: server architecture (separate vs extend), generic vs specific, discovery approach, metadata level, filtering, coverage tools, and gap definition. Recommendations above represent sensible defaults that Claude can adjust during planning/implementation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing MCP Server (pattern reference)
- `mcp-server/src/index.ts` — Tool registration pattern, server setup, stdio transport
- `mcp-server/src/db.ts` — Database connection pattern (test server won't need DB but shows arg handling)
- `mcp-server/build.ts` — esbuild bundling pattern
- `mcp-server/package.json` — Dependencies and scripts pattern

### Requirements
- `.planning/REQUIREMENTS.md` §Testing MCP Server — TMCP-01 through TMCP-04
- `.planning/REQUIREMENTS.md` §Out of Scope — No frontend component tests, no E2E, no snapshot tests
- `.planning/REQUIREMENTS.md` §Future Requirements — TMCP-10 (stub generation) and TMCP-11 (suggest what to test) are deferred

### Test Infrastructure (Phase 37 dependency)
- `vite.config.ts` — Current Vitest config (jsdom environment, setup files)
- `src-tauri/Cargo.toml` — Rust test configuration

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mcp-server/` — Complete MCP server with tool-file architecture, esbuild bundling, `@modelcontextprotocol/sdk` patterns. Direct template for new server.
- `@modelcontextprotocol/sdk` — Already a dependency in the project. Stdio transport proven.

### Established Patterns
- Tool registration: tools defined as objects in `index.ts` with `inputSchema`, handlers in separate `tools/*.ts` files
- Build: esbuild bundling to single `dist/index.js` with `#!/usr/bin/env node` banner
- Transport: stdio via `StdioServerTransport`
- Schema: zod for validation

### Integration Points
- Claude Code mounts MCP servers via config — new server needs to be registrable alongside existing `element-mcp`
- Test commands: `vitest` (TS) and `cargo test` (Rust) already in the project
- Coverage: `@vitest/coverage-v8` will be set up by Phase 37

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User deferred most architectural decisions to Claude's discretion, with three explicit choices:
1. Stdio transport (consistent with element-mcp)
2. Per-test result granularity with full error output
3. Flexible targeting (file, test name pattern, runner)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

Note: TMCP-10 (test stub generation) and TMCP-11 (suggest what to test) are already tracked as future requirements in REQUIREMENTS.md.

</deferred>

---

*Phase: 40-testing-mcp-server*
*Context gathered: 2026-04-05*
