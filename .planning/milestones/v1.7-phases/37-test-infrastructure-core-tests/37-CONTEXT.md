# Phase 37: Test Infrastructure & Core Tests - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Both TypeScript and Rust test suites run reliably with coverage reporting, establishing the baseline that hooks (Phase 39) and MCP tools (Phase 40) will enforce. No frontend component tests — UI is verified via screenshots + feedback per PROJECT.md.

</domain>

<decisions>
## Implementation Decisions

### Vitest Setup & Coverage (TEST-01)
- **D-01:** Target utility functions only for coverage — `src/lib/` (date-utils, actionRegistry, shellAllowlist, utils). Component tests are out of scope (UI verified via screenshots)
- **D-02:** No minimum coverage threshold enforcement in this phase — just establish reporting. Phase 39 hooks will enforce thresholds once baselines are known
- **D-03:** Single root `vitest.config.ts` extending `vite.config.ts`, with `@vitest/coverage-v8` for coverage reporting. Matches existing `"test": "vitest run"` script in package.json
- **D-04:** Existing test files (~15 across stores, components, lib) should continue to pass — this phase adds config and coverage, not break existing tests

### Rust Test Scope & Priority (TEST-02)
- **D-05:** Test scope: 12 model files (task, project, theme, phase, schedule, etc.) + scheduling engine (time_blocks, assignment). These are pure data/logic — highest value, easiest to test
- **D-06:** Extract `setup_test_db()` from `calendar.rs` into shared `test_fixtures/mod.rs` module so all test modules reuse the same in-memory SQLite setup with per-test isolation
- **D-07:** Existing tests in scheduling/ and calendar.rs must continue to pass — this phase expands, not replaces

### Tauri Command Integration Tests (TEST-03)
- **D-08:** Claude's discretion on which commands count as "core" — recommend DB-backed CRUD commands (task, project, theme, phase) as they're most testable with `tauri::test::mock_builder()`
- **D-09:** Commands requiring external state (keychain, OAuth, AI providers, filesystem watchers) are out of scope — only test commands that need DB state (mockable via in-memory SQLite)

### Coverage Baseline Format (TEST-04)
- **D-10:** Markdown summary in `.planning/COVERAGE.md` listing tested vs untested modules for both Vitest and cargo test. Human-readable, diffable, parseable by MCP server (Phase 40)
- **D-11:** Claude's discretion on Rust coverage tool — module inventory (which .rs files have `#[cfg(test)]`) vs cargo-tarpaulin. Consider that tarpaulin has known compatibility issues with Tauri linker

### Claude's Discretion
- Which specific CRUD commands to integration-test (D-08)
- Rust coverage approach: module inventory vs cargo-tarpaulin (D-11)
- vitest.config.ts details (environment, globals, path aliases, test patterns)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Test Infrastructure
- `package.json` — Existing vitest/testing-library deps and "test" script
- `mcp-server/vitest.config.ts` — Reference vitest config (mcp-server has working setup)
- `src-tauri/Cargo.toml` — Rust dev-dependencies (currently only `tempfile = "3"`)

### Existing Test Patterns
- `src-tauri/src/plugins/core/calendar.rs` lines 1037+ — `setup_test_db()` pattern to extract
- `src-tauri/src/test_fixtures/mod.rs` — Existing test fixtures module (target for shared setup_test_db)
- `src-tauri/src/scheduling/time_blocks.rs` lines 108+ — Existing Rust test pattern
- `src-tauri/src/scheduling/assignment.rs` lines 99+ — Existing Rust test pattern
- `src/lib/date-utils.test.ts` — Existing TS utility test pattern
- `src/lib/actionRegistry.test.ts` — Existing TS utility test pattern
- `src/lib/shellAllowlist.test.ts` — Existing TS utility test pattern

### Rust Source (test targets)
- `src-tauri/src/models/` — 12 model files: task, project, theme, phase, schedule, etc.
- `src-tauri/src/scheduling/` — time_blocks.rs, assignment.rs (already have tests to expand)
- `src-tauri/src/commands/` — 22 command files (subset for integration testing)

### Requirements
- `.planning/REQUIREMENTS.md` — TEST-01 through TEST-04 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test_fixtures/mod.rs` + `test_fixtures/manifests.rs` + `test_fixtures/calendar_responses.rs` — existing fixture module to extend with shared setup_test_db()
- `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event` — already installed for TS testing
- `vitest ^4.1.0` — already a dependency, just needs root config and coverage plugin

### Established Patterns
- Rust: `#[cfg(test)] mod tests` with `setup_test_db()` creating in-memory SQLite, running migrations, returning Connection
- TS: `.test.ts` / `.test.tsx` files co-located with source or in `__tests__/` subdirectories
- MCP server: separate vitest.config.ts with `globals: true`

### Integration Points
- `package.json` scripts — need `test:coverage` script addition
- `src-tauri/Cargo.toml` [dev-dependencies] — may need additional test crates
- `.planning/COVERAGE.md` — new file for coverage baseline documentation
- `vitest.config.ts` (root) — new file, must not conflict with mcp-server config

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraint: existing ~15 TS test files and Rust scheduling/calendar tests must continue passing.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-test-infrastructure-core-tests*
*Context gathered: 2026-04-05*
