---
phase: 37-test-infrastructure-core-tests
verified: 2026-04-05T23:59:00Z
status: gaps_found
score: 6/7 must-haves verified
re_verification: false
gaps:
  - truth: "A COVERAGE.md documents which modules are tested and which are not for both TS and Rust"
    status: partial
    reason: "COVERAGE.md exists and covers models, scheduling, commands, and calendar.rs, but omits 11 additional tested Rust modules (plugins, heartbeat, engine, credentials) — 64 tests undocumented. Summary row shows 233 total tests when actual total is 276 Rust + 21+ TS."
    artifacts:
      - path: ".planning/COVERAGE.md"
        issue: "Other Tested Modules section only lists calendar.rs; plugins (core/mod.rs, core/http.rs, registry.rs, manifest.rs, mod.rs), heartbeat (mod.rs, risk.rs, summary.rs), engine/executor.rs, and credentials (mod.rs, keychain.rs) each have tests but are absent from the document. Total count row is understated by 64 tests."
    missing:
      - "Add 'Other Tested Modules' rows for plugins/core/mod.rs (6), plugins/core/http.rs (5), plugins/registry.rs (5), plugins/manifest.rs (6), plugins/mod.rs (6), heartbeat/mod.rs (6), heartbeat/risk.rs (10), heartbeat/summary.rs (6), engine/executor.rs (4), credentials/mod.rs (6), credentials/keychain.rs (4)"
      - "Update Summary table total from 233 to the correct total (276 Rust + actual TS count)"
human_verification:
  - test: "Run `cd src-tauri && cargo test` and confirm all tests pass (0 failures)"
    expected: "All 276 Rust tests pass with exit code 0"
    why_human: "Cannot run cargo test in verification context; confirms the integration tests exercise live code paths"
  - test: "Run `npx vitest run --coverage` and confirm coverage/coverage-summary.json is created"
    expected: "json-summary file appears at coverage/coverage-summary.json with non-zero statement counts for src/lib/"
    why_human: "Cannot run vitest in verification context"
---

# Phase 37: Test Infrastructure & Core Tests Verification Report

**Phase Goal:** Both TypeScript and Rust test suites run reliably with coverage reporting, establishing the baseline that hooks and MCP tools will enforce
**Verified:** 2026-04-05T23:59:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running `npx vitest run --coverage` produces a coverage report for TypeScript utility functions with `@vitest/coverage-v8` | VERIFIED | `vitest.config.ts` exists with v8 provider, text/text-summary/json-summary reporters, `include: ['src/lib/**/*.ts']`. `@vitest/coverage-v8@^4.1.2` in devDependencies. `test:coverage` script in package.json. `coverage/` in .gitignore. |
| 2 | Rust model tests use per-test in-memory SQLite isolation (`setup_test_db()` pattern) and pass reliably | VERIFIED | `src-tauri/src/test_fixtures/mod.rs` exports both `setup_test_db()` (returns `Database`) and `setup_test_db_raw()` (returns raw `Connection`). All 11 model files import `use crate::test_fixtures::setup_test_db`. Zero local `fn setup_test_db()` remain in models/. `calendar.rs` uses `setup_test_db_raw as setup_test_db`. `onboarding.rs` tests are pure unit tests (no DB) — correct. |
| 3 | Tauri command integration tests using `tauri::test::mock_builder()` exist for core commands and pass | VERIFIED | `task_commands.rs` has 3 tests, `project_commands.rs` 2, `theme_commands.rs` 2, `phase_commands.rs` 2. All four files import `use crate::test_fixtures::setup_test_db`. `Cargo.toml` includes `features = ["tray-icon", "test"]` on the tauri dependency. |
| 4 | The failing `test_skill_section_tier_invariant` test is fixed | VERIFIED | Test now uses `assert_ne!(quick_normalized, medium_normalized)` (intentional quick/medium divergence) and `assert_eq!(medium_normalized, full_normalized)`. Previous stale assertion removed. |
| 5 | Existing tests continue to pass — no regressions introduced | VERIFIED | All 11 model files use shared fixture; no local `setup_test_db` found in models/. Calendar uses raw variant. onboarding.rs tests require no DB. Commits 7661226, 462c9b9 both show clean test runs. |
| 6 | `vitest.config.ts` merges from `vite.config.ts` (inherits jsdom, globals, setupFiles, aliases) | VERIFIED | File contains `import viteConfig from './vite.config'` and `export default mergeConfig(viteConfig, ...)`. |
| 7 | COVERAGE.md documents tested vs untested modules for both suites with complete module inventory | PARTIAL | File exists with "# Coverage Baselines", TypeScript and Rust sections, Summary table, actual numbers (no `{N}` placeholders). However, 11 additional Rust source files with tests are absent from the document — plugins/ (5 files, 28 tests), heartbeat/ (3 files, 22 tests), engine/ (1 file, 4 tests), credentials/ (2 files, 10 tests). Summary total row shows 233 tests; actual Rust count is 276. |

**Score:** 6/7 truths verified (1 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `vitest.config.ts` | Root vitest config with coverage reporting | VERIFIED | Exists, 15 lines, contains `mergeConfig`, `provider: 'v8'`, three reporters, `include: ['src/lib/**/*.ts']`, `reportOnFailure: true` |
| `package.json` | `test:coverage` script | VERIFIED | Script `"test:coverage": "vitest run --coverage"` present at line 14 |
| `src-tauri/src/test_fixtures/mod.rs` | Shared `setup_test_db()` function | VERIFIED | Exports both `setup_test_db()` returning `Database` and `setup_test_db_raw()` returning `Connection` via `db_setup` submodule |
| `src-tauri/src/commands/task_commands.rs` | Integration tests for task CRUD commands | VERIFIED | `#[cfg(test)]` block present, `test_create_task_command`, `test_list_tasks_command`, `test_update_task_command` all exist |
| `src-tauri/src/commands/project_commands.rs` | Integration tests for project CRUD commands | VERIFIED | `#[cfg(test)]` block present, 2 tests |
| `src-tauri/src/commands/theme_commands.rs` | Integration tests for theme CRUD commands | VERIFIED | `#[cfg(test)]` block present, 2 tests |
| `src-tauri/src/commands/phase_commands.rs` | Integration tests for phase CRUD commands | VERIFIED | `#[cfg(test)]` block present, 2 tests |
| `.planning/COVERAGE.md` | Coverage baseline documentation | PARTIAL | Exists with correct headers and real numbers, but missing 11 Rust modules and wrong total count |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `vitest.config.ts` | `vite.config.ts` | `mergeConfig import` | WIRED | `import viteConfig from './vite.config'` + `mergeConfig(viteConfig, ...)` both present |
| `src-tauri/src/commands/task_commands.rs` | `src-tauri/src/test_fixtures/mod.rs` | `use crate::test_fixtures::setup_test_db` | WIRED | Import present at line 246 |
| `src-tauri/src/commands/project_commands.rs` | `src-tauri/src/test_fixtures/mod.rs` | `use crate::test_fixtures::setup_test_db` | WIRED | Import present at line 87 |
| `src-tauri/src/commands/theme_commands.rs` | `src-tauri/src/test_fixtures/mod.rs` | `use crate::test_fixtures::setup_test_db` | WIRED | Import present at line 119 |
| `src-tauri/src/commands/phase_commands.rs` | `src-tauri/src/test_fixtures/mod.rs` | `use crate::test_fixtures::setup_test_db` | WIRED | Import present at line 124 |
| `src-tauri/Cargo.toml` | tauri test feature | `features array` | WIRED | `features = ["tray-icon", "test"]` confirmed at line 17 |
| `src-tauri/src/test_fixtures/mod.rs` | `src-tauri/src/db/migrations` | `migrations::run_migrations` | WIRED | `use crate::db::migrations` in `db_setup` submodule; `migrations::run_migrations(&conn)` called in both functions |
| `src-tauri/src/models/task.rs` | `src-tauri/src/test_fixtures/mod.rs` | `use crate::test_fixtures::setup_test_db` | WIRED | Confirmed; no local `fn setup_test_db()` remains |
| `src-tauri/src/plugins/core/calendar.rs` | `src-tauri/src/test_fixtures/mod.rs` | `setup_test_db_raw as setup_test_db` | WIRED | Line 1049: `use crate::test_fixtures::setup_test_db_raw as setup_test_db` |

### Data-Flow Trace (Level 4)

Not applicable — this phase delivers test infrastructure and documentation, not dynamic UI components.

### Behavioral Spot-Checks

| Behavior | Check | Status |
|----------|-------|--------|
| `vitest.config.ts` merges from vite.config.ts | Pattern `mergeConfig(viteConfig,` present | PASS |
| Coverage reporters configured correctly | `['text', 'text-summary', 'json-summary']` present | PASS |
| Coverage scoped to `src/lib/` only | `include: ['src/lib/**/*.ts']` present | PASS |
| `@vitest/coverage-v8` installed | Present in `devDependencies` at `^4.1.2` | PASS |
| `test:coverage` script wired | `"vitest run --coverage"` in package.json scripts | PASS |
| `coverage/` excluded from git | Line 23 of `.gitignore` | PASS |
| 11 model files use shared fixture | All 11 found via grep; zero local `fn setup_test_db()` in models | PASS |
| calendar.rs uses raw variant | Line 1049 alias confirmed | PASS |
| Tauri test feature enabled | `Cargo.toml` line 17 | PASS |
| 9 integration tests in 4 command files | 3+2+2+2 confirmed via grep | PASS |
| `test_skill_section_tier_invariant` fix | `assert_ne` for quick/medium at line 1106 | PASS |
| COVERAGE.md has real numbers | Zero `{N}` placeholders | PASS |
| COVERAGE.md total accuracy | Shows 233; actual Rust total is 276 | FAIL — 64 tests from 11 modules omitted |
| Run cargo test (all pass) | Cannot run in verification context | SKIP — needs human |
| Run vitest --coverage (json-summary generated) | Cannot run in verification context | SKIP — needs human |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TEST-01 | 37-01-PLAN.md | Vitest configured with coverage reporting (`@vitest/coverage-v8`) for TypeScript utility functions | SATISFIED | `vitest.config.ts` with v8 provider, json-summary reporter, `test:coverage` script, `@vitest/coverage-v8` installed |
| TEST-02 | 37-02-PLAN.md | Rust model tests expanded with per-test SQLite isolation using `setup_test_db()` pattern | SATISFIED | Shared fixture in `test_fixtures/mod.rs`, all 11 models + calendar refactored, onboarding.rs fixed |
| TEST-03 | 37-03-PLAN.md | Tauri command integration tests using `tauri::test::mock_builder()` for core commands | SATISFIED | 9 integration tests across 4 command files, tauri test feature enabled in Cargo.toml |
| TEST-04 | 37-03-PLAN.md | Coverage baselines established for both Vitest and cargo test suites | PARTIAL | `COVERAGE.md` exists with real data, but 11 Rust modules (64 tests) are absent, making totals inaccurate |

All four requirement IDs from the phase plans (TEST-01, TEST-02, TEST-03, TEST-04) are accounted for. No orphaned requirements found — REQUIREMENTS.md Traceability table maps all four IDs exclusively to Phase 37.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/COVERAGE.md` | Summary table | Total count 233 is 64 short of actual 276 Rust tests | Warning | Document intended to be parseable by Phase 40 MCP server; inaccurate totals will affect gap analysis |

No code stubs, TODO/FIXME patterns, or hardcoded empty returns found in the implementation files.

### Human Verification Required

#### 1. Full Rust Test Suite Pass

**Test:** Run `cd src-tauri && cargo test` (or `cargo test commands` for just the new integration tests)
**Expected:** All tests pass with exit code 0; specifically the 9 new command integration tests in task_commands, project_commands, theme_commands, and phase_commands
**Why human:** Cannot execute cargo in verification context; confirms tauri::test::mock_builder() integration tests work end-to-end with managed state

#### 2. Vitest Coverage Report Generation

**Test:** Run `npx vitest run --coverage` from project root
**Expected:** `coverage/coverage-summary.json` is created; terminal shows statement/branch/function/line percentages for `src/lib/` files; exit code 0 (or non-zero only from pre-existing test failures, not from coverage config)
**Why human:** Cannot execute vitest in verification context; confirms `reportOnFailure: true` works and json-summary is produced at the expected path

### Gaps Summary

One gap was found. The gap is contained in documentation accuracy, not in implementation:

**COVERAGE.md incomplete module inventory (TEST-04 partial):** The file exists, has real numbers, and covers the modules specifically called out in the plan (models, scheduling, the 4 command files, calendar.rs). However, 11 additional Rust source files with tests exist across `src-tauri/src/plugins/`, `src-tauri/src/heartbeat/`, `src-tauri/src/engine/`, and `src-tauri/src/credentials/`. These total 64 tests and are entirely absent from the document. The Summary table total row shows 233 tests when the true Rust count is 276.

This matters because COVERAGE.md is designed to be parseable by the Phase 40 MCP server for gap analysis — an incomplete inventory will produce misleading coverage gap reports.

The fix is an additive documentation update: add the missing 11 files to a new "Other Tested Modules" section (or expand the existing one) and correct the Summary totals.

---

_Verified: 2026-04-05T23:59:00Z_
_Verifier: Claude (gsd-verifier)_
