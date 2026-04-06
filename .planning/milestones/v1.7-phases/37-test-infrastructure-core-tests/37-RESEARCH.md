# Phase 37: Test Infrastructure & Core Tests - Research

**Researched:** 2026-04-05
**Domain:** Vitest + cargo test infrastructure, coverage reporting, Tauri command integration testing
**Confidence:** HIGH

## Summary

This phase establishes reliable test infrastructure for both TypeScript (Vitest) and Rust (cargo test) codebases, adds coverage reporting, and introduces Tauri command integration tests. The codebase already has significant test coverage -- 52+ TS test files and 283 passing Rust tests across 12 model files and scheduling modules. The main work is: (1) adding `@vitest/coverage-v8` and a root `vitest.config.ts`, (2) extracting the duplicated `setup_test_db()` into a shared test fixture, (3) writing Tauri command integration tests using `mock_app()` + managed state, and (4) documenting coverage baselines.

Current state: 7 TS test files are failing (mostly component tests with mock issues -- out of scope per D-01), 1 Rust test is failing (`test_skill_section_tier_invariant` -- string mismatch in onboarding model). Both need to be fixed or acknowledged before this phase can establish clean baselines.

**Primary recommendation:** Focus on infrastructure (vitest config + coverage plugin, shared Rust test fixture) first, then add targeted tests for the highest-value untested code, then document baselines in `.planning/COVERAGE.md`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Target utility functions only for coverage -- `src/lib/` (date-utils, actionRegistry, shellAllowlist, utils). Component tests are out of scope (UI verified via screenshots)
- **D-02:** No minimum coverage threshold enforcement in this phase -- just establish reporting. Phase 39 hooks will enforce thresholds once baselines are known
- **D-03:** Single root `vitest.config.ts` extending `vite.config.ts`, with `@vitest/coverage-v8` for coverage reporting. Matches existing `"test": "vitest run"` script in package.json
- **D-04:** Existing test files (~15 across stores, components, lib) should continue to pass -- this phase adds config and coverage, not break existing tests
- **D-05:** Test scope: 12 model files (task, project, theme, phase, schedule, etc.) + scheduling engine (time_blocks, assignment). These are pure data/logic -- highest value, easiest to test
- **D-06:** Extract `setup_test_db()` from `calendar.rs` into shared `test_fixtures/mod.rs` module so all test modules reuse the same in-memory SQLite setup with per-test isolation
- **D-07:** Existing tests in scheduling/ and calendar.rs must continue to pass -- this phase expands, not replaces
- **D-08:** Claude's discretion on which commands count as "core" -- recommend DB-backed CRUD commands (task, project, theme, phase) as they're most testable with `tauri::test::mock_builder()`
- **D-09:** Commands requiring external state (keychain, OAuth, AI providers, filesystem watchers) are out of scope -- only test commands that need DB state (mockable via in-memory SQLite)
- **D-10:** Markdown summary in `.planning/COVERAGE.md` listing tested vs untested modules for both Vitest and cargo test. Human-readable, diffable, parseable by MCP server (Phase 40)
- **D-11:** Claude's discretion on Rust coverage tool -- module inventory (which .rs files have `#[cfg(test)]`) vs cargo-tarpaulin. Consider that tarpaulin has known compatibility issues with Tauri linker

### Claude's Discretion
- Which specific CRUD commands to integration-test (D-08)
- Rust coverage approach: module inventory vs cargo-tarpaulin (D-11)
- vitest.config.ts details (environment, globals, path aliases, test patterns)

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Vitest configured with coverage reporting (`@vitest/coverage-v8`) for TypeScript utility functions | Install `@vitest/coverage-v8@4.1.2`, create root `vitest.config.ts` with coverage config targeting `src/lib/`, add `test:coverage` script |
| TEST-02 | Rust model tests expanded with per-test SQLite isolation using established `setup_test_db()` pattern | Extract shared `setup_test_db()` into `test_fixtures/mod.rs`, refactor 12 model files + calendar.rs to use it; all model files already have tests (133 total `#[test]` functions across models) |
| TEST-03 | Tauri command integration tests using `tauri::test::mock_builder()` for core commands | Use `tauri::test::mock_app()` + `app.manage()` pattern to inject Database state, call commands directly with `app.state()`. Target: task, project, theme, phase CRUD commands |
| TEST-04 | Coverage baselines established for both Vitest and cargo test suites | Create `.planning/COVERAGE.md` with module inventory -- which files have tests, which don't, test counts per module |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.0 (installed) | TS test runner | Already in devDependencies, matches existing test scripts |
| @vitest/coverage-v8 | 4.1.2 (latest) | V8-based coverage reporting | Official Vitest coverage plugin, must match vitest major version |
| cargo test | (built-in) | Rust test runner | Standard Rust toolchain, already used for 283 tests |
| rusqlite | 0.32 (installed) | In-memory SQLite for test DB | Already a project dependency with `bundled` feature |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsdom | 29.0.0 (installed) | DOM environment for Vitest | Already configured in vite.config.ts test block |
| @testing-library/jest-dom | 6.9.1 (installed) | DOM matchers | Already in setup.ts for assertion extensions |
| tempfile | 3 (installed) | Rust temp files for test isolation | Already in Cargo.toml dev-dependencies |
| tauri (test feature) | ~2.10 | Mock runtime for command integration tests | Enable `test` feature in Cargo.toml for `tauri::test::mock_app()` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @vitest/coverage-v8 | @vitest/coverage-istanbul | istanbul is slower, v8 is native and faster for node-based code |
| Module inventory for Rust coverage | cargo-tarpaulin | Tarpaulin has known linker issues with Tauri; module inventory is simpler and sufficient for D-11 |
| Direct command calls in tests | IPC-based get_ipc_response() | IPC approach requires webview mocking, complex serialization; direct calls are simpler for DB-backed commands |

**Installation:**
```bash
npm install -D @vitest/coverage-v8@^4.1.0
```

**Cargo.toml addition:**
```toml
[dev-dependencies]
tempfile = "3"
# tauri test feature -- add to existing tauri dependency:
# tauri = { version = "~2.10", features = ["tray-icon", "test"] }
```

## Architecture Patterns

### Recommended Project Structure
```
vitest.config.ts              # NEW: root config with coverage
src/
├── __tests__/setup.ts        # EXISTING: global Tauri mocks
├── lib/
│   ├── date-utils.ts         # Target for coverage
│   ├── date-utils.test.ts    # EXISTING
│   ├── actionRegistry.ts     # Target for coverage
│   ├── actionRegistry.test.ts # EXISTING
│   ├── shellAllowlist.ts     # Target for coverage
│   ├── shellAllowlist.test.ts # EXISTING
│   └── utils.ts              # Target for coverage (6 lines, may not need test)
src-tauri/src/
├── test_fixtures/
│   ├── mod.rs                # EXTEND: add shared setup_test_db()
│   ├── manifests.rs          # EXISTING
│   └── calendar_responses.rs # EXISTING
├── models/                   # 12 files, all have tests already
├── scheduling/               # time_blocks.rs + assignment.rs have tests
└── commands/                 # NEW: integration tests for core CRUD
.planning/COVERAGE.md         # NEW: baseline documentation
```

### Pattern 1: Vitest Config with Coverage
**What:** Root vitest.config.ts that extends existing vite.config.ts and adds coverage reporting
**When to use:** Every `npx vitest run --coverage` invocation
**Example:**
```typescript
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts'],
    },
  },
}));
```

### Pattern 2: Shared Rust Test Fixture
**What:** Single `setup_test_db()` function in `test_fixtures/mod.rs` replacing per-file duplicates
**When to use:** Every Rust test that needs database access
**Example:**
```rust
// src-tauri/src/test_fixtures/mod.rs
#[cfg(test)]
pub mod manifests;
#[cfg(test)]
pub mod calendar_responses;

use crate::db::connection::Database;
use crate::db::migrations;
use rusqlite::Connection;

/// Create an in-memory SQLite database with all migrations applied.
/// Each call returns a fresh, isolated database instance.
pub fn setup_test_db() -> Database {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
    migrations::run_migrations(&conn).unwrap();
    Database::from_connection(conn)
}
```

### Pattern 3: Tauri Command Integration Test (Direct Call)
**What:** Test Tauri commands by calling them directly with managed state from mock_app
**When to use:** Testing DB-backed CRUD commands without webview
**Example:**
```rust
// In commands/task_commands.rs or a separate test module
#[cfg(test)]
mod tests {
    use super::*;
    use tauri::Manager;
    use std::sync::{Arc, Mutex};
    use crate::db::connection::Database;
    use crate::test_fixtures::setup_test_db;

    #[test]
    fn test_create_task_via_command() {
        let app = tauri::test::mock_app();
        let db = setup_test_db();
        app.manage(Arc::new(Mutex::new(db)));
        // ManifestRebuildTrigger also needs to be managed
        let (tx, _rx) = tokio::sync::mpsc::channel(1);
        app.manage(crate::models::manifest::ManifestRebuildTrigger(tx));

        let state = app.state::<Arc<Mutex<Database>>>();
        let result = create_task_inner(&state, /* params */);
        assert!(result.is_ok());
    }
}
```

### Anti-Patterns to Avoid
- **Duplicating setup_test_db() per file:** Currently every model file has its own copy. Extract to shared fixture.
- **Testing commands via IPC for DB-only commands:** The `get_ipc_response()` approach requires webview mocking and complex payload construction. For commands that just wrap DB operations, call the model layer directly or use the direct-call pattern above.
- **Setting coverage thresholds now:** D-02 explicitly says no thresholds. Just report. Phase 39 hooks will enforce.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coverage collection | Custom instrumentation | @vitest/coverage-v8 | V8 native coverage is zero-overhead, auto-instruments |
| Test DB isolation | Manual table cleanup | `Connection::open_in_memory()` | Each call creates fresh DB, no cleanup needed, automatic per-test isolation |
| Tauri mock runtime | Mock AppHandle manually | `tauri::test::mock_app()` | Provides proper AppHandle, state management, event system |
| Coverage baseline doc | Manual file listing | `grep -l "#[cfg(test)]"` + vitest json output | Machine-parseable, reproducible |

## Common Pitfalls

### Pitfall 1: Vitest Config Conflict with MCP Server
**What goes wrong:** Root vitest.config.ts picks up mcp-server test files or vice versa
**Why it happens:** Vitest walks up to find config; mcp-server already has its own vitest.config.ts
**How to avoid:** Use `include` patterns in root config to scope to `src/**` only. The mcp-server config is in `mcp-server/vitest.config.ts` and runs independently.
**Warning signs:** Tests from mcp-server appearing in root test output

### Pitfall 2: Tauri `test` Feature Not Enabled
**What goes wrong:** `tauri::test::mock_app()` is not available, compilation fails
**Why it happens:** The `test` feature must be explicitly added to Cargo.toml's tauri dependency
**How to avoid:** Add `test` to the `features` array: `tauri = { version = "~2.10", features = ["tray-icon", "test"] }`
**Warning signs:** `error[E0433]: failed to resolve: could not find 'test' in 'tauri'`

### Pitfall 3: Existing Failing Tests Polluting Baselines
**What goes wrong:** Coverage baselines include failures, making them unreliable
**Why it happens:** Currently 7 TS test files fail (component mock issues) and 1 Rust test fails (string mismatch)
**How to avoid:** Fix or skip known-failing tests before establishing baselines. The TS failures are in component tests (out of scope per D-01 -- can be skipped). The Rust failure in `onboarding.rs:test_skill_section_tier_invariant` is a string mismatch that should be fixed.
**Warning signs:** Non-zero exit code from `vitest run` or `cargo test`

### Pitfall 4: Rust Test Parallelism with Shared State
**What goes wrong:** Tests using in-memory SQLite fail intermittently
**Why it happens:** Rust tests run in parallel by default; if tests share a connection, they race
**How to avoid:** Each test creates its own `setup_test_db()` call -- each gets a fresh in-memory DB. The current pattern already does this correctly. Do NOT create a single shared connection.
**Warning signs:** Tests passing individually but failing when run together

### Pitfall 5: vitest.config.ts vs vite.config.ts Test Block
**What goes wrong:** Vitest uses the wrong config, ignoring coverage settings
**Why it happens:** The existing `vite.config.ts` already has a `test:` block. If both exist, vitest prefers `vitest.config.ts` when present.
**How to avoid:** Create `vitest.config.ts` that merges from `vite.config.ts` using `mergeConfig`. The existing `test:` block in vite.config.ts can remain (it won't conflict -- vitest.config.ts takes precedence). Alternatively, move the test config entirely to vitest.config.ts and remove from vite.config.ts.
**Warning signs:** Coverage not appearing despite `--coverage` flag

### Pitfall 6: Tauri Command Tests Need All Managed State Types
**What goes wrong:** Command panics with "state not managed" error
**Why it happens:** Tauri commands that access multiple State types (Database, ManifestRebuildTrigger, CredentialManager, etc.) need ALL of them managed, even if the test only exercises one
**How to avoid:** Create a helper that manages all required state types for the commands being tested. For CRUD commands, this is typically Database + ManifestRebuildTrigger.
**Warning signs:** `State not managed for type X` panic in tests

## Code Examples

### Vitest Coverage Script Addition
```json
// package.json scripts addition
{
  "test:coverage": "vitest run --coverage"
}
```

### Shared Test DB Usage in Model File
```rust
// In any model file's test module:
#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_fixtures::setup_test_db;

    #[test]
    fn test_create_and_get_task() {
        let db = setup_test_db();
        // ... test using db
    }
}
```

### Coverage Baseline Format
```markdown
<!-- .planning/COVERAGE.md -->
# Coverage Baselines

**Generated:** 2026-04-XX
**Purpose:** Track tested vs untested modules for both suites

## TypeScript (Vitest)

### Covered (src/lib/)
| File | Tests | Status |
|------|-------|--------|
| date-utils.ts | date-utils.test.ts | Covered |
| actionRegistry.ts | actionRegistry.test.ts | Covered |
| shellAllowlist.ts | shellAllowlist.test.ts | Covered |
| utils.ts | (none) | Not covered (6 lines, cn() utility only) |

### Not Targeted (out of scope per D-01)
- src/components/ -- UI verified via screenshots
- src/stores/ -- have tests but not targeted for coverage reporting
- src/hooks/ -- have tests but not targeted for coverage reporting

## Rust (cargo test)

### Models (src-tauri/src/models/)
| File | #[test] count | Status |
|------|---------------|--------|
| task.rs | 14 | Covered |
| project.rs | 11 | Covered |
| ...etc | ... | ... |

### Commands with Integration Tests
| File | Tests | Status |
|------|-------|--------|
| task_commands.rs | (new) | Covered |
| ...etc | ... | ... |

### Not Tested
| File | Reason |
|------|--------|
| notification.rs | 0 #[test] functions, no cfg(test) block |
| ai/ | External API dependency, out of scope (D-09) |
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-file setup_test_db() copies | Shared test_fixtures::setup_test_db() | This phase | Single source of truth for DB test setup |
| No coverage reporting | @vitest/coverage-v8 with text + json output | This phase | Enables Phase 39 threshold enforcement and Phase 40 MCP reading |
| No Tauri command tests | mock_app() + direct command calls | This phase | Validates command layer independently of frontend |

## Open Questions

1. **Vitest config migration strategy**
   - What we know: `vite.config.ts` already has a `test:` block with environment, globals, setupFiles. Creating `vitest.config.ts` will override it.
   - What's unclear: Whether to duplicate settings in vitest.config.ts or use `mergeConfig` to inherit
   - Recommendation: Use `mergeConfig` from `vitest/config` to merge vite.config.ts with coverage additions. This preserves existing config without duplication.

2. **Tauri command test approach -- direct call vs inner function extraction**
   - What we know: Commands take `AppHandle`, `State<Arc<Mutex<Database>>>`, and parameters. `mock_app()` can provide state, but `AppHandle` for `app.emit()` calls is tricky.
   - What's unclear: Whether commands can be called directly from tests or if we need to extract inner logic into testable functions
   - Recommendation: For commands that call `app.emit()`, use `mock_app().app_handle()` for the AppHandle. The mock runtime handles emit silently. For commands that are pure DB wrappers, consider testing the model layer directly (which is already done) and adding a thin integration test for the command layer.

3. **Fixing the 1 failing Rust test**
   - What we know: `test_skill_section_tier_invariant` in onboarding.rs fails with a string mismatch between quick and medium tier templates
   - What's unclear: Whether this is a test bug or a code bug
   - Recommendation: Fix the test or the code as part of this phase (D-07 says existing tests must pass)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (TS) | Vitest 4.1.0 + jsdom 29.0.0 |
| Framework (Rust) | cargo test (built-in) |
| Config file (TS) | `vite.config.ts` (existing test block) + `vitest.config.ts` (new, with coverage) |
| Config file (Rust) | `Cargo.toml` (add test feature to tauri) |
| Quick run command (TS) | `npx vitest run --reporter=verbose` |
| Quick run command (Rust) | `cd src-tauri && cargo test` |
| Full suite command | `npx vitest run --coverage && cd src-tauri && cargo test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Coverage report generated for src/lib/ | smoke | `npx vitest run --coverage 2>&1 \| grep "% Stmts"` | Wave 0 (vitest.config.ts) |
| TEST-02 | Model tests pass with shared setup_test_db | unit | `cd src-tauri && cargo test models` | Existing (refactor needed) |
| TEST-03 | Tauri command integration tests pass | integration | `cd src-tauri && cargo test commands` | Wave 0 (new test files) |
| TEST-04 | COVERAGE.md exists and lists baselines | manual | `test -f .planning/COVERAGE.md` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run` + `cd src-tauri && cargo test`
- **Per wave merge:** `npx vitest run --coverage` + `cd src-tauri && cargo test`
- **Phase gate:** Full suite green + COVERAGE.md populated

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- root config with coverage (TEST-01)
- [ ] `@vitest/coverage-v8` -- install as devDependency (TEST-01)
- [ ] `test_fixtures/mod.rs` -- add shared `setup_test_db()` (TEST-02)
- [ ] Tauri `test` feature in Cargo.toml (TEST-03)
- [ ] `.planning/COVERAGE.md` template (TEST-04)

## Discretion Recommendations

### D-08: Core Commands for Integration Testing
**Recommendation:** Test these 4 command files with 2-3 tests each:
1. `task_commands.rs` -- create_task, list_tasks, update_task (most used, complex params)
2. `project_commands.rs` -- create_project, list_projects (FK relationships with themes)
3. `theme_commands.rs` -- create_theme, list_themes (simplest CRUD, good first test)
4. `phase_commands.rs` -- create_phase, list_phases (depends on project, tests FK chain)

Skip: ai_commands, calendar_commands, credential_commands, cli_commands, heartbeat_commands, hub_chat_commands, shell_commands (all require external state per D-09).

### D-11: Rust Coverage Approach
**Recommendation:** Use module inventory (grep-based), not cargo-tarpaulin.
- Tarpaulin has known issues with Tauri's custom linker flags on macOS (the build uses `cdylib` + `staticlib` crate types)
- Module inventory is simpler: `grep -l "#[cfg(test)]"` + count `#[test]` per file
- Produces a deterministic, diffable output perfect for `.planning/COVERAGE.md`
- Phase 40 MCP server can parse this format trivially

### vitest.config.ts Details
**Recommendation:**
- Use `mergeConfig` from `vitest/config` to inherit vite.config.ts settings
- `environment: 'jsdom'` (matches existing)
- `globals: true` (matches existing)
- `setupFiles: ['src/__tests__/setup.ts']` (matches existing)
- Coverage: `provider: 'v8'`, `include: ['src/lib/**/*.ts']`, `exclude: ['**/*.test.ts']`
- Reporters: `['text', 'text-summary', 'json-summary']` -- text for terminal, json-summary for MCP server (Phase 40)

## Sources

### Primary (HIGH confidence)
- Project source code -- direct inspection of all referenced files
- `package.json` -- vitest 4.1.0, existing test dependencies confirmed
- `Cargo.toml` -- rusqlite 0.32 with bundled, tauri ~2.10, tempfile 3
- `vite.config.ts` -- existing test configuration block with jsdom, globals, setupFiles
- `src-tauri/src/models/*.rs` -- all 12 model files have `#[cfg(test)]` blocks, 133+ tests total
- npm registry -- `@vitest/coverage-v8@4.1.2` confirmed as latest
- Tauri test docs -- https://v2.tauri.app/develop/tests/
- Tauri GitHub Discussion #11717 -- mock_app() + State pattern for v2

### Secondary (MEDIUM confidence)
- https://docs.rs/tauri/2.10.2/tauri/test/index.html -- mock_builder, mock_app, get_ipc_response APIs
- https://ospfranco.com/writting-tests-for-tauri-rust-commands/ -- integration test patterns (v1 but pattern similar)

### Tertiary (LOW confidence)
- cargo-tarpaulin macOS/Tauri compatibility -- based on general community reports, not verified firsthand

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are already installed or have well-documented official versions
- Architecture: HIGH -- patterns extracted directly from existing codebase
- Pitfalls: HIGH -- identified from running actual tests and observing failures
- Tauri command testing: MEDIUM -- mock_app() pattern verified from official docs/discussions but not tested in this codebase yet

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- vitest 4.x and tauri 2.x are established)
