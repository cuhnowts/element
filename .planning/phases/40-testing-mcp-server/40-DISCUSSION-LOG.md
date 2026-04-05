# Phase 40: Testing MCP Server - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 40-testing-mcp-server
**Areas discussed:** Server architecture, Test discovery design, Coverage gap analysis, Result structure

---

## Server Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Separate server (Recommended) | New testing-mcp-server/ package. Test tools don't need DB access, different dependencies. | |
| Extend element-mcp | Add test tools alongside existing project/task/calendar tools. Single server to configure. | |
| You decide | Claude picks the best architecture based on codebase patterns | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion. Recommendation: separate server.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Generic / project-agnostic (Recommended) | Works in any repo with Vitest/cargo test. Configured via args or env vars. | |
| Element-specific | Hardcoded to Element's test setup. Simpler but not portable. | |
| You decide | Claude picks based on the requirements | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion. Recommendation: generic.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Stdio (same as element-mcp) | Consistent with existing server. Claude Code launches it as a subprocess. | ✓ |
| HTTP/SSE | Runs as a long-lived process. Better for IDE integrations. | |
| You decide | Claude picks the transport | |

**User's choice:** Stdio (same as element-mcp)
**Notes:** None — clear preference for consistency.

---

## Test Discovery Design

| Option | Description | Selected |
|--------|-------------|----------|
| CLI output parsing (Recommended) | Run `vitest list --json` and `cargo test -- --list`. Always accurate. | |
| File scanning + AST | Scan for test files, parse test blocks. Works offline but may miss dynamic tests. | |
| Hybrid | File scan for fast overview, CLI parsing for detailed list. | |
| You decide | Claude picks the discovery approach | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion. Recommendation: CLI output parsing.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: file + test name | Just enough for Claude to pick and run a specific test. | |
| Rich: file, suite, name, line number | Includes grouping and line numbers for source navigation. | |
| You decide | Claude picks the metadata level | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion. Recommendation: rich metadata.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, filter by file/runner | Accept optional params to narrow results. | |
| No filtering, return all | Always return full list. Claude filters on its end. | |
| You decide | Claude picks the filtering approach | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion. Recommendation: support filtering.

---

## Coverage Gap Analysis

| Option | Description | Selected |
|--------|-------------|----------|
| @vitest/coverage-v8 only (Recommended) | Phase 37 sets up Vitest with coverage-v8. Rust coverage added later if needed. | |
| Both Vitest + Rust coverage | Support both @vitest/coverage-v8 AND cargo-tarpaulin. Complete picture. | |
| You decide | Claude picks based on what Phase 37 delivers | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion. Recommendation: start with Vitest, add Rust if available.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Uncovered files (no tests at all) | List source files with zero test coverage. Simplest. | |
| Uncovered files + functions | List uncovered files AND specific uncovered functions. More granular. | |
| You decide | Claude picks the gap definition | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion. Recommendation: files + functions.

---

## Result Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Per-test results (Recommended) | Each test gets pass/fail/error entry with name, file, duration, error. | ✓ |
| Per-file summary | Aggregate pass/fail counts per file. Less verbose. | |
| You decide | Claude picks the granularity | |

**User's choice:** Per-test results (Recommended)
**Notes:** None.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include full output (Recommended) | Stack traces and assertion diffs included per failed test. | ✓ |
| Truncated output | First N lines of error per test. Prevents huge responses. | |
| You decide | Claude picks the error detail level | |

**User's choice:** Yes, include full output (Recommended)
**Notes:** None.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, flexible targeting (Recommended) | Accept file path, test name pattern, or runner as params. | ✓ |
| File-level only | Accept a file path or run all. No test-name filtering. | |
| You decide | Claude picks the targeting approach | |

**User's choice:** Yes, flexible targeting (Recommended)
**Notes:** None.

---

## Claude's Discretion

- Server architecture (separate vs extend element-mcp)
- Generic vs Element-specific
- Test discovery approach (CLI parsing vs file scanning vs hybrid)
- Discovery metadata level
- Discovery filtering
- Coverage tools scope
- Coverage gap definition

## Deferred Ideas

None — discussion stayed within phase scope. TMCP-10 and TMCP-11 already tracked as future requirements.
