# Pitfalls Research

**Domain:** Retrofitting quality infrastructure to existing Tauri 2.x (Rust + React/TS) desktop app
**Researched:** 2026-04-05
**Confidence:** HIGH (verified against actual codebase state + official docs)

## Critical Pitfalls

### Pitfall 1: Biome Schema Mismatch Blocks All Linting

**What goes wrong:**
The codebase already has `@biomejs/biome@2.4.7` installed but `biome.json` references the v1.9.4 schema. Running `npx biome check src/` today produces a configuration error and exits without checking anything. If CI enforcement is added without fixing this, every build fails. If the team "fixes" it by downgrading Biome, they lose v2 features.

**Why it happens:**
Biome v2 shipped breaking config changes (glob behavior, import organizer semantics, rule option requirements). The package was upgraded to v2 but the config was never migrated. This is the number one issue in the Biome v2 migration path -- the `biome migrate` command exists but was never run.

**How to avoid:**
Run `npx biome migrate` first, then validate with `npx biome check src/` before adding any CI gates. Do not manually rewrite `biome.json` -- the migration tool handles renamed rules, removed options, and glob path changes. After migration, update `$schema` to the v2 URL.

**Warning signs:**
- `biome check` exits with "configuration resulted in errors" instead of lint results
- Schema URL in biome.json doesn't match installed package major version

**Phase to address:**
Phase 1 (Linting setup) -- must be the literal first step before any lint rule tuning.

---

### Pitfall 2: Enabling All Biome Rules on 105K LOC Creates Thousands of Errors

**What goes wrong:**
The current config uses `"recommended": true` which enables dozens of lint rules. On 105K lines of unlinted TypeScript, this will surface hundreds or thousands of violations. Attempting to fix them all in one PR creates massive merge conflicts and cognitive overload for review. Attempting to ignore them all defeats the purpose.

**Why it happens:**
The codebase was written over months without linting. Patterns that violate recommended rules (unused variables, any types, missing exhaustive checks) are baked into every file.

**How to avoid:**
Use Biome's rule-level configuration to start with a minimal rule set (formatting only, then add rules incrementally). The strategy:
1. Fix formatting first (`biome format --write src/`) -- this is safe, mechanical, and produces a clean baseline
2. Enable lint rules in batches of 3-5, fix violations, commit
3. For rules with 50+ violations, use `// biome-ignore` suppressions on existing code and enforce only on new files (track suppression count, ratchet down over time)
4. Never enable a new rule and fix its violations in the same commit as feature work

**Warning signs:**
- A single `biome check` run producing 500+ diagnostics
- PRs that touch 100+ files with "lint fix" as the only description
- Developer disabling biome in editor to avoid noise

**Phase to address:**
Phase 1 (Linting) -- configure incrementally, do not go from zero to full enforcement in one step.

---

### Pitfall 3: Clippy Warning Flood Treated as Ignorable Noise

**What goes wrong:**
The Rust codebase currently has 70 clippy warnings, 30 of which are auto-fixable. If clippy is added as a CI gate (`cargo clippy -- -D warnings`) without first fixing existing warnings, the gate immediately blocks all commits. The response will be to either disable the gate or add `#[allow(clippy::...)]` everywhere.

**Why it happens:**
The 70 warnings accumulated without anyone noticing because clippy wasn't part of the workflow. Many are trivial (redundant closures, identity map, manual range checks) but some are real issues. The `await_holding_lock` warning on `TOKEN_REFRESH_LOCK` in `calendar.rs:762` is a genuine concurrency bug -- a `MutexGuard` held across `.await` can cause deadlocks under contention.

**How to avoid:**
1. Run `cargo clippy --fix --lib -p element` to auto-fix the 30 trivial warnings
2. Manually fix the remaining ~40 (most are unused imports and dead code -- quick wins)
3. Pay special attention to `clippy::await_holding_lock` -- this is a real bug, not just style. Fix by dropping the guard before awaiting, or switch to `tokio::sync::Mutex`
4. Only after zero warnings, add `-D warnings` to CI

**Warning signs:**
- `cargo clippy` output ignored because "it's always noisy"
- `#[allow(clippy::await_holding_lock)]` suppression instead of actually fixing the concurrency issue
- More than 5 `#[allow(clippy::...)]` attributes in a single file

**Phase to address:**
Phase 1 (Linting) -- fix existing warnings before enabling enforcement. The `await_holding_lock` fix should be treated as a bug fix, not a lint cleanup.

---

### Pitfall 4: Cargo Tests Sharing SQLite Database Cause Flaky Parallel Failures

**What goes wrong:**
Rust tests run in parallel by default (`cargo test` uses multiple threads). If tests share a single SQLite database file, concurrent writes cause `SQLITE_BUSY` errors, and concurrent reads see partially-committed data from other tests. Tests pass individually but fail randomly in CI.

**Why it happens:**
The app uses `Arc<Mutex<Database>>` for its production database handle. Developers naturally reuse this pattern in tests, pointing at a shared test database. SQLite's WAL mode helps with read concurrency but still serializes writes -- and without `busy_timeout`, concurrent writes fail instantly rather than retrying.

**How to avoid:**
Each test function gets its own temporary database:
```rust
use tempfile::NamedTempFile;

fn test_db() -> Database {
    let tmp = NamedTempFile::new().unwrap();
    let db = Database::open(tmp.path()).unwrap();
    db.run_migrations().unwrap();
    db
}
```
The `tempfile` crate is already in dev-dependencies. Key rules:
- Never share a database file between test functions
- Always run migrations on the test database (tests must see the same schema as production)
- Set `PRAGMA busy_timeout = 5000` even in tests -- costs nothing, prevents spurious failures
- Use `#[tokio::test]` not `#[test]` for async command handlers that use the database

**Warning signs:**
- Tests pass with `cargo test -- --test-threads=1` but fail with default parallelism
- Intermittent `database is locked` errors in CI
- Tests that depend on data inserted by other tests

**Phase to address:**
Phase 2 (Rust test suite) -- establish the test database pattern as a shared fixture before writing any model/command tests.

---

### Pitfall 5: Vitest Tests Import Tauri APIs and Crash in jsdom

**What goes wrong:**
Component code imports `@tauri-apps/api` (invoke, events, window). When Vitest runs in jsdom, these imports fail because `window.__TAURI_INTERNALS__` doesn't exist. Tests crash on import, not on execution -- meaning even importing a utility that transitively imports a Tauri module kills the test.

**Why it happens:**
Tauri APIs depend on the Tauri runtime injecting globals into the webview. jsdom doesn't have these. Unlike browser APIs that jsdom simulates (DOM, fetch), Tauri's IPC layer is completely custom.

**How to avoid:**
1. Use `@tauri-apps/api/mocks` to set up `mockIPC()` and `mockWindows()` in `vitest.setup.ts` (the existing `src/__tests__/setup.ts` may need this)
2. For utility-only tests (the v1.7 scope), avoid testing functions that import Tauri APIs -- test pure TypeScript logic instead
3. If a utility transitively imports Tauri code, restructure to separate pure logic from Tauri-dependent code (this is an architecture improvement, not just a test fix)
4. Mock `window.__TAURI_INTERNALS__` in the global setup for any remaining cases
5. Note: jsdom lacks WebCrypto -- add `globalThis.crypto = crypto.webcrypto` to setup if needed

**Warning signs:**
- `ReferenceError: __TAURI_INTERNALS__ is not defined` in test output
- Test files that import from `@tauri-apps/api/*` directly
- Tests passing locally in dev server but failing in `vitest run`

**Phase to address:**
Phase 2 (TS test suite) -- establish Tauri mock setup before writing any tests that touch IPC. The v1.7 scope wisely focuses on utility functions, which sidesteps most of this.

---

### Pitfall 6: Testing MCP Server Enables Arbitrary Command Execution

**What goes wrong:**
A testing MCP server that can "discover, run, read results, generate stubs" inherently needs to execute shell commands (`vitest run`, `cargo test`, etc.). If the MCP server constructs commands from tool arguments without sanitization, any MCP client (including a compromised AI agent) can execute arbitrary commands with the user's full permissions. MCP protocol has no built-in sandboxing.

**Why it happens:**
MCP servers are thin wrappers around CLI tools. The temptation to do `exec(\`cargo test ${testName}\`)` with string interpolation is strong. In 2025-2026, 30+ CVEs were filed against MCP servers, mostly for command injection via unsanitized inputs. The Anthropic filesystem MCP server itself had path traversal CVEs (CVE-2025-53109, CVE-2025-53110).

**How to avoid:**
1. Allowlist commands: the MCP server should only execute a fixed set of commands (`vitest run`, `cargo test`, `biome check`) -- never arbitrary shell strings
2. Use argument arrays, not string interpolation: `spawn('cargo', ['test', '--', testName])` not `exec(\`cargo test -- ${testName}\`)`
3. Validate test names against a pattern (alphanumeric, colons, underscores) -- reject anything with shell metacharacters
4. Scope file access: the MCP server should only read files under the project directory, never `..` or absolute paths outside project root
5. No `--dangerous` flags, no `sudo`, no network access tools

**Warning signs:**
- MCP tool handlers that call `exec()` or `spawn()` with template literals
- Tool arguments passed directly into shell command strings
- No input validation on test names or file paths

**Phase to address:**
Phase 5 (Testing MCP server) -- security must be designed in from the start, not retrofitted.

---

### Pitfall 7: Console.error Interceptor Creates Infinite Recursion

**What goes wrong:**
The error logger intercepts `console.error` to write to a log file. If the log-writing code itself encounters an error (Tauri IPC failure, file write permission, disk full), and that error triggers `console.error`, the interceptor calls itself infinitely. The app freezes or crashes with a stack overflow.

**Why it happens:**
Replacing `console.error` with a wrapper is a monkey-patching pattern prone to re-entrancy. Any code path between the interceptor and the log destination that might log an error creates a cycle.

**How to avoid:**
1. Use a re-entrancy guard: `let isLogging = false; if (isLogging) return; isLogging = true; try { ... } finally { isLogging = false; }`
2. Never call `console.error` inside the interceptor -- use `originalConsole.error` (saved reference) for internal diagnostics
3. Make IPC calls fire-and-forget: use `invoke('write_log', { msg }).catch(() => {})` -- swallow errors in the logging path
4. Set a write buffer with periodic flush (every 1-2 seconds) rather than IPC per error -- reduces overhead from ~5ms/call to amortized ~0.1ms/error
5. Cap log file size (rotate at 5MB) to prevent disk fill from error storms

**Warning signs:**
- App freezes when a component throws during render
- Log file grows to gigabytes
- IPC overhead visible in profiler when errors are frequent

**Phase to address:**
Phase 3 (Error logger) -- the re-entrancy guard and buffered writes must be in the initial implementation, not added after discovering crashes.

---

### Pitfall 8: Claude Code Hook Timeout Kills Long Test Suites

**What goes wrong:**
Claude Code hooks have a default timeout of 10 minutes. A pre-commit hook that runs the full test suite (`vitest run` + `cargo test`) might exceed this on a cold build, especially `cargo test` which compiles first. The hook kills the process, Claude Code reports "hook failed", and the commit is blocked with no useful error message.

**Why it happens:**
First `cargo test` run compiles the entire crate (can take 60-90 seconds on this codebase). Combined with Vitest startup and test execution, total time approaches or exceeds timeout. Hook failure messages don't distinguish "tests failed" from "timeout killed the process."

**How to avoid:**
1. Set explicit timeout in hook config: 300 seconds (5 minutes) minimum for pre-commit
2. Run only affected tests on pre-commit, not the full suite (use `vitest related` for TS, `cargo test` with specific test names for Rust)
3. Ensure `cargo test` uses incremental compilation (default, but verify `CARGO_INCREMENTAL` isn't set to 0)
4. Use `PreToolUse` hook matching on Bash tool with git commit detection, since dedicated PreCommit hooks don't exist yet in Claude Code
5. Consider running linting (fast) as pre-commit and tests (slow) as a separate post-save or on-demand trigger

**Warning signs:**
- Hook failures with no test output (just "timed out")
- Developer removing the hook because "it always fails"
- First commit after cache clear always fails

**Phase to address:**
Phase 4 (Claude Code hooks) -- timeout and scope must be configured during hook setup, not after users hit failures.

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `// biome-ignore` on every existing violation | Enables enforcement fast | Suppression count never decreases, rules are effectively unenforced | Only with tracked suppression count and ratchet-down plan |
| `#[allow(clippy::all)]` on modules | Code compiles without warnings | Real issues (concurrency bugs, dead code) go unnoticed | Never -- suppress specific lints only |
| Single shared test database for Rust | Less setup code per test | Flaky tests, false passes from stale data, parallel failures | Never for Rust; acceptable for read-only TS fixture data |
| Mocking Tauri `invoke` as a no-op | Tests pass quickly | Tests don't verify IPC contract, mock drift from real commands | Only for pure logic tests that shouldn't call invoke at all |
| Skipping Rust tests in pre-commit hook | Faster commit cycle | Broken Rust code caught only at push time | Acceptable if test-on-save catches Rust issues during development |
| Writing log directly via IPC per error | Simpler implementation | 5ms overhead per error, UI jank during error storms | Never -- always buffer and batch |

## Integration Gotchas

Common mistakes when connecting the quality layers together.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Biome + Claude Code hooks | Hook runs `biome check` but Biome config is broken (schema mismatch), hook always fails | Verify `biome check` exits 0 on clean code before wiring into hooks |
| Vitest + Tauri mocks | Mocking IPC globally but not clearing between tests, causing test pollution | Use `beforeEach`/`afterEach` with `clearMocks()`, never persistent global mock state |
| Cargo test + SQLite migrations | Tests use hardcoded schema instead of running migrations, drift from production | Test fixture creates DB and runs all migrations, same as production startup path |
| Error logger + Vitest | Console interceptor installed in test setup, captures test framework output, confuses assertions | Disable error logger in test environment (check `import.meta.env.MODE === 'test'`) |
| Testing MCP + Claude Code hooks | Hook triggers test run via MCP, MCP triggers another hook, recursive invocation | MCP server should execute tests directly (spawn process), not through Claude Code |
| Pre-commit hook + formatting | Hook runs `biome check` (includes format check), finds formatting issues, blocks commit even though auto-fix could resolve them | Run `biome check --write` in the hook to auto-fix, then re-stage changed files; or separate format from lint |
| Clippy + cargo test | `cargo test` compiles with `#[cfg(test)]` modules, clippy may produce different warnings for test code | Run `cargo clippy --all-targets` not just `cargo clippy` to catch test-specific warnings |
| Error logger + MCP test server | MCP server reads log file while error logger is writing to it | Use append-only writes with newline-delimited JSON; reader skips incomplete lines |

## Performance Traps

Patterns that work at small scale but fail as the test suite grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| IPC call per console.error | UI jank during error storms (React re-render cascades) | Buffer errors, flush every 1-2 seconds via setInterval | 10+ errors/second |
| Full test suite on every save | Save-to-feedback loop exceeds 10 seconds, developer ignores results | Use `vitest related` (changed files only) and specific `cargo test` targets | 50+ test files |
| Cargo test cold compilation in hook | First commit after cache clear takes 90+ seconds | Set hook timeout to 300s, use incremental compilation | Always on cold cache |
| Log file unbounded growth | Disk fills, app slows from large file writes | Rotate at 5MB, keep 3 rotations max | Error storms producing 100KB+/minute |
| MCP server spawning fresh processes per test run | Each `cargo test` invocation pays compilation check overhead (~2-5s) | Batch test requests, consider `cargo-nextest` for faster execution | 5+ test runs per minute |
| Running all migrations per test | Test setup takes 50ms+ per test for migration chain | Cache migrated schema as template DB, copy per test | 100+ Rust tests |

## Security Mistakes

Domain-specific security issues for a testing MCP server and error logging.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Command injection via test name parameter | Attacker executes arbitrary shell commands | Argument arrays (`spawn`), never string interpolation; validate test names against `^[a-zA-Z0-9_:]+$` |
| Path traversal in coverage file reader | Attacker reads any file on disk | Resolve paths, verify they're under project root, reject `..` segments |
| MCP server running with full user permissions | Compromised client has full system access | Document security model; allowlist commands; no shell expansion |
| Log file contains secrets from error output | API keys logged when HTTP requests fail (reqwest errors include URLs with tokens) | Redact patterns matching API key/token formats before writing to log |
| Test output includes environment variables | Secrets visible in test results exposed via MCP | Strip environment variable values from test output; never log `env::var` results |
| MCP tool descriptions vulnerable to prompt injection | Malicious tool descriptions cause AI client to execute unintended commands | Static tool descriptions, never dynamically generated from user input |

## UX Pitfalls

How quality infrastructure can degrade the development experience.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Lint errors on every save while writing new code | Flow state interrupted, developer fights linter instead of building features | Format-on-save only; lint check at commit time, not keystroke time |
| Pre-commit hook blocks for 60+ seconds | Developer loses context waiting, starts bypassing hooks | Fast checks only (lint + format ~5s), defer full test suite to explicit trigger |
| 500+ lint errors on first run | Overwhelming, feels like codebase is broken | Start with formatting only, add lint rules incrementally with fix-as-you-go |
| Test failures with no clear source | Developer can't tell if it's their change or a flaky test | Each test must be independently runnable; no shared state between tests |
| Error logger noise in development console | Console flooded with intercepted errors that are expected during development | Filter list for known non-error patterns (React strict mode warnings, HMR noise) |
| MCP test server returns cryptic results | AI agent can't interpret test failures, asks user for help | Structured JSON output with file, line, assertion message, diff -- not raw terminal output |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Biome setup:** Config migrated to v2 schema -- verify `npx biome check src/` exits 0 on clean code, not with config error
- [ ] **Clippy enforcement:** Zero warnings -- verify `cargo clippy -- -D warnings` passes, not just "clippy runs without crashing"
- [ ] **Clippy async safety:** `await_holding_lock` in `calendar.rs:762` is fixed -- verify with `tokio::sync::Mutex` or guard dropped before await
- [ ] **Test isolation:** Tests pass in parallel -- verify `cargo test` (default threads) passes, not just `--test-threads=1`
- [ ] **Tauri mocks:** Mock setup covers IPC -- verify tests that call `invoke()` get mock responses, not silent no-ops that hide bugs
- [ ] **Error logger:** Re-entrancy guard works -- verify triggering an error inside the logging path doesn't freeze the app
- [ ] **Error logger:** Buffer flush works -- verify errors written during rapid error storm are all captured (no dropped messages)
- [ ] **Claude Code hooks:** Timeout configured -- verify hook works after cold cache (first run after `cargo clean`), not just warm cache
- [ ] **MCP server:** Input sanitization -- verify test names with semicolons, pipes, backticks are rejected, not executed
- [ ] **MCP server:** Path containment -- verify `../../../etc/passwd` as a file argument is rejected
- [ ] **Coverage reporting:** Covers both stacks -- verify coverage includes both Vitest and cargo-tarpaulin/llvm-cov, not just one
- [ ] **Log rotation:** Size limit works -- verify log file doesn't grow past 5MB under sustained error output

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Biome schema mismatch | LOW | Run `npx biome migrate`, verify config, commit. 5-minute fix |
| Lint error flood (500+) | MEDIUM | Disable all lint rules, re-enable one at a time with bulk suppress, commit per rule. 2-4 hours |
| Clippy `await_holding_lock` in production | HIGH | Audit all `Mutex` usage across codebase, switch to `tokio::sync::Mutex` for async contexts, test under load. Full day |
| Flaky parallel SQLite tests | MEDIUM | Add `test_db()` fixture pattern to all tests, remove shared state, re-run with default parallelism. 1-2 hours |
| Console.error infinite recursion | LOW | Add re-entrancy guard (3 lines of code), restart app. 5-minute fix |
| MCP command injection discovered | HIGH | Audit all `exec`/`spawn` calls, replace string interpolation with argument arrays, add input validation, security review. Full day |
| Hook timeout blocking all commits | LOW | Increase timeout in hook config, narrow test scope to affected files only. 10-minute fix |
| Log file fills disk | LOW | Add rotation, delete old logs, set max size. 30-minute fix |
| Test-logger interaction (console capture) | LOW | Add `import.meta.env.MODE === 'test'` guard to error logger. 5-minute fix |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Biome schema mismatch | Phase 1: Linting setup | `npx biome check src/` exits 0 with no config errors |
| Lint error flood | Phase 1: Linting setup | Rule count increases incrementally across commits, never 500+ new diagnostics |
| Clippy warning flood + `await_holding_lock` bug | Phase 1: Linting setup | `cargo clippy -- -D warnings` passes; calendar.rs uses tokio::sync::Mutex |
| SQLite test isolation | Phase 2: Rust test suite | `cargo test` passes with default thread count consistently |
| Tauri mock crashes | Phase 2: TS test suite | All Vitest tests pass without `__TAURI_INTERNALS__` errors |
| Console.error recursion | Phase 3: Error logger | Manual test: error inside logging path doesn't freeze app |
| Logger + test interference | Phase 3: Error logger | Vitest suite passes with error logger module present |
| Hook timeout | Phase 4: Claude Code hooks | Pre-commit hook completes within 5 minutes on cold cache |
| Hook + MCP recursive invocation | Phase 4/5 boundary | MCP test execution doesn't trigger hook re-invocation |
| MCP command injection | Phase 5: Testing MCP server | Fuzz test: tool arguments with shell metacharacters are rejected |
| MCP path traversal | Phase 5: Testing MCP server | Path arguments outside project root are rejected |

## Sources

- Biome v2 migration guide: https://biomejs.dev/guides/upgrade-to-biome-v2/
- Biome v2 breaking changes: https://biomejs.dev/blog/biome-v2/
- Tauri v2 testing/mocking docs: https://v2.tauri.app/develop/tests/mocking/
- Tauri test setup with Vitest: https://yonatankra.com/how-to-setup-vitest-in-a-tauri-project/
- Claude Code hooks documentation: https://code.claude.com/docs/en/hooks-guide
- Claude Code PreCommit hook request: https://github.com/anthropics/claude-code/issues/4834
- MCP security CVEs (2025-2026): https://www.practical-devsecops.com/mcp-security-vulnerabilities/
- Anthropic filesystem MCP CVEs: https://cymulate.com/blog/cve-2025-53109-53110-escaperoute-anthropic/
- SQLite WAL production gotchas: https://blog.pecar.me/sqlite-prod/
- Rust SQLite test isolation pattern: https://mattrighetti.com/2025/02/17/rust-testing-sqlx-lazy-people
- Progressive lint adoption (Lint to the Future): https://mainmatter.com/blog/2025/03/03/lttf-process/
- ESLint bulk suppressions pattern: https://eslint.org/blog/2025/04/introducing-bulk-suppressions/
- Actual codebase state verified: `biome.json` (v1.9.4 schema with v2.4.7 package), `cargo clippy` output (70 warnings including `await_holding_lock`), `package.json` (Biome v2.4.7, Vitest v4.1.0), `tempfile` already in Cargo dev-dependencies, 2 existing test files in `src/__tests__/`

---
*Pitfalls research for: v1.7 Test Foundations — retrofitting quality infrastructure*
*Researched: 2026-04-05*
