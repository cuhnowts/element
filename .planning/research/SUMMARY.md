# Project Research Summary

**Project:** Element v1.7 — Test Foundations
**Domain:** Code quality infrastructure for Tauri 2.x desktop app (TypeScript/React + Rust)
**Researched:** 2026-04-05
**Confidence:** HIGH

## Executive Summary

Element v1.7 is a quality infrastructure retrofit, not a greenfield setup. The codebase already has Biome 2.4.7, Vitest 4.1.0, 38 Rust test modules, and a working MCP sidecar pattern — the research consistently found that the project description overstates how much needs to be installed and understates how much needs to be configured and enforced. The recommended approach is: migrate Biome to v2 schema, tighten lint rules incrementally, expand existing test suites with isolation-safe patterns, add a lightweight error logger, wire Claude Code hooks for automated enforcement, and cap the work with a new Testing MCP server that makes Claude Code a self-directed test-writing agent.

The primary risk is the "lint avalanche" problem: enabling enforcement on an unlinted 105K-line codebase in one step produces hundreds of blocking errors and developer frustration. Biome's schema mismatch (`biome.json` references v1.9.4 while v2.4.7 is installed) is a known breakage that will stop Day 1 progress cold if not addressed first. The Rust side has a real concurrency bug (`await_holding_lock` in `calendar.rs:762`) hiding behind 70 accumulated clippy warnings — this is not cosmetic and must be treated as a bug fix embedded in the linting phase. Both require careful sequencing: fix existing violations before enabling enforcement gates, not the other way around.

The architecture is layered and dependency-ordered: linting must be clean before tests are gated, tests must exist before pre-commit hooks can enforce them, and the Testing MCP server is the capstone that wraps the entire quality ecosystem. The existing MCP sidecar pattern (stdio transport, esbuild bundling, `@modelcontextprotocol/sdk`) is a proven template that de-risks the Testing MCP server substantially. Security must be designed in from the start — the MCP server executes shell commands and needs argument array sanitization and allowlist-only command execution to prevent injection attacks documented in 2025-2026 MCP CVEs.

## Key Findings

### Recommended Stack

The project already has the correct tools installed. The work is configuration, enforcement, and one new server — not installation. Biome 2.4.7 replaces ESLint + Prettier entirely (10-25x faster, single config, 85%+ rule parity). Vitest 4.1.0 is installed with jsdom and Testing Library. Clippy and rustfmt ship with Rust 1.94.0. The only genuinely new addition is `@vitest/coverage-v8` (must match Vitest major version) and the `testing-mcp-server/` directory following the existing MCP sidecar pattern.

**Core technologies:**
- **Biome 2.4.7** (installed): TS/React linting + formatting — needs `npx biome migrate` to fix schema, then rule tightening
- **Vitest 4.1.0** (installed): TS unit tests — needs coverage config (`@vitest/coverage-v8`) and additional test scripts
- **clippy 0.1.94** (installed): Rust linting — needs `clippy.toml` config and existing 70 warnings cleared before enforcing `-D warnings`
- **rustfmt 1.8.0** (installed): Rust formatting — needs `rustfmt.toml` with project style preferences
- **@vitest/coverage-v8** (new): V8-native coverage reporting — zero instrumentation overhead, required for MCP coverage gap tool; must match Vitest major version
- **testing-mcp-server/** (new): Test lifecycle MCP server — stdio transport, esbuild bundled, same pattern as existing `mcp-server/`
- **Claude Code hooks** (new): `.claude/settings.json` with `PreToolUse` commit gate and `PostToolUse` auto-format
- **Error logger** (new): `src/lib/errorLogger.ts` + `error_commands.rs` — console.error intercept via Tauri IPC → append-only log file

**What NOT to add:** ESLint, Prettier, Jest, Playwright, Cypress, husky, lint-staged, tarpaulin, `tauri-plugin-log`. All either replaced by existing tools or out of scope.

### Expected Features

**Must have (table stakes):**
- Biome v2 schema migration + incremental rule tightening — foundation for all lint enforcement
- `cargo clippy -- -D warnings` passing — including fixing real `await_holding_lock` concurrency bug in `calendar.rs:762`
- `rustfmt.toml` with project style, `cargo fmt --check` passing
- Vitest expansion: ~15 high-value utility/store/hook tests (pure TS logic; no new component tests)
- Rust test expansion: model unit tests, DB layer tests with per-test in-memory SQLite isolation
- `console.error` interceptor writing to `.element/errors.log` with re-entrancy guard and buffered writes
- Claude Code `PreToolUse` pre-commit gate (lint + test, exit 2 to block, 300s timeout)
- Claude Code `PostToolUse` auto-format on Edit/Write (Biome, non-blocking)

**Should have (differentiators that make Claude Code a test-writing agent):**
- Testing MCP server: `discover_tests`, `run_tests`, `read_results`, `generate_stubs`, `check_coverage_gaps`
- Error log MCP tool (`read_frontend_errors`) exposed via existing `mcp-server/`
- Test-on-save hook (runs only related tests, not full suite, on every file edit)
- Coverage gap detector (structural: "which modules have zero tests" — not line percentages)

**Defer to v2+:**
- Agent-based Stop hook for test verification before task completion
- Post-compact context re-injection hook
- Rust command handler tests using Tauri mock runtime (high complexity, low urgency)
- E2E tests (Playwright/WebDriver) — Tauri desktop testing is high-friction, low ROI vs. screenshot verification

### Architecture Approach

The architecture is four stacked layers (linting, testing, error logging, hooks) with a Testing MCP server as the capstone. Each layer depends on the previous being stable. The two linting systems (Biome for TS/React, clippy+rustfmt for Rust) are parallel within the first layer. The error logger is an independent layer that feeds into the existing MCP server via a new `read_frontend_errors` tool. The Testing MCP server is a separate sidecar process from the existing `mcp-server/` — different concerns (app entity management vs. test lifecycle), different data sources (SQLite DB vs. filesystem/process output), and different security implications (read-only vs. command-executing).

**Major components:**
1. **Biome config** (modified) — TS/React linting + formatting, incrementally tightened from `recommended` baseline
2. **clippy.toml + rustfmt.toml** (new) — Rust linting + formatting with project-specific configuration
3. **Vitest test suite** (expanded) — utilities, stores, non-UI hooks; `@tauri-apps/api/mocks` for IPC mocking
4. **cargo test suite** (expanded) — models, DB layer, engine logic; per-test in-memory SQLite via `Connection::open_in_memory()` + migrations
5. **Error logger** (new) — `errorLogger.ts` monkey-patch + `error_commands.rs` Rust command + `.element/errors.log`
6. **Claude Code hooks** (new) — `.claude/settings.json` for commit gate and auto-format
7. **Testing MCP server** (new) — `testing-mcp-server/`, stdio transport, spawns vitest/cargo test as child processes with argument arrays

### Critical Pitfalls

1. **Biome schema mismatch blocks Day 1** — `biome.json` references v1.9.4 schema with v2.4.7 installed; `biome check` exits with a config error, not lint results. Run `npx biome migrate` as the literal first action.
2. **Lint avalanche on 105K LOC** — enabling all recommended rules at once produces 500+ violations. Fix formatting first (`biome format --write`), then enable lint rules in batches of 3-5 with `// biome-ignore` suppressions plus a ratchet-down plan for existing code.
3. **clippy `await_holding_lock` is a real concurrency bug** — not just style. 70 accumulated warnings include a `MutexGuard` held across `.await` in `calendar.rs:762` that can deadlock under contention. Auto-fix 30 trivial warnings, manually fix the rest, treat the lock issue as a bug fix.
4. **Rust tests sharing SQLite cause flaky parallel failures** — `cargo test` runs parallel by default. Every test function needs its own `Connection::open_in_memory()` + migration run. The `tempfile` crate is already in dev-dependencies. Never share a DB handle between tests.
5. **console.error infinite recursion** — if the IPC write fails and triggers `console.error`, the interceptor calls itself. Must include re-entrancy guard (`isLogging` flag) and fire-and-forget IPC (`.catch(() => {})`) in the initial implementation. Buffer writes (flush every 1-2s), not per-error IPC calls.
6. **MCP server command injection** — use `spawn('cargo', ['test', testName])` argument arrays, never `exec(\`cargo test ${testName}\`)` template literals. Allowlist the exact commands the server can run. Validate test names against `^[a-zA-Z0-9_:]+$`.
7. **Hook timeout on cold cache** — first `cargo test` run compiles the crate (60-90s). Set hook timeout to 300s minimum. Consider gating pre-commit on lint only (fast, ~5s) and running full test suite as on-demand trigger.

## Implications for Roadmap

Based on the dependency graph surfaced across all four research files, a 5-phase structure is recommended. Phases are sequential — each phase produces prerequisites consumed by the next.

### Phase 1: Linting Foundation

**Rationale:** Everything downstream (hooks, tests, MCP server) needs a clean lint baseline. The Biome schema mismatch and 70 clippy warnings must be resolved before any enforcement gates can fire. The `await_holding_lock` bug fix belongs here as it surfaces via clippy.

**Delivers:** Green `biome check src/` (no config errors, no violations), green `cargo clippy -- -D warnings`, `cargo fmt --check` passing, unified `lint:all` / `format:all` / `check` scripts in `package.json`

**Key actions:**
- Run `npx biome migrate` (first action, non-negotiable)
- Fix formatting via `biome format --write src/` (mechanical, safe, commit separately)
- Enable lint rules in batches of 3-5, fix violations, commit per batch
- Run `cargo clippy --fix --lib -p element` to auto-fix 30 trivial warnings
- Manually fix remaining ~40 warnings, treating `await_holding_lock` as a bug fix
- Create `rustfmt.toml` and `src-tauri/clippy.toml`
- Update `package.json` with `lint:all`, `format:all`, `check:all` scripts

**Avoids:** Pitfalls 1 (schema mismatch), 2 (lint avalanche), 3 (clippy noise + real concurrency bug)

**Research flag:** Standard patterns — no additional research needed

### Phase 2: Test Infrastructure + Core Tests

**Rationale:** Pre-commit test gates require a test suite that passes reliably. Isolation patterns must be established before test count grows. Focus on pure logic tests (utilities, stores, models) — not component tests or Tauri command handler tests.

**Delivers:** Vitest tests for ~15 high-value utilities/stores/hooks; Rust model + DB layer tests with isolated SQLite; `@vitest/coverage-v8` coverage config; `test:all` script passing reliably with default parallelism

**Key actions:**
- Add `@vitest/coverage-v8` to devDeps; add coverage config block to `vite.config.ts` (exclude `src/components/**`)
- Verify `src/__tests__/setup.ts` has correct `mockIPC` and `window.__TAURI_INTERNALS__` setup
- Write Vitest tests: `date-utils`, `shellAllowlist`, `actionRegistry`, `utils` (utilities); key Zustand stores; `useAgentLifecycle`, `useAgentQueue`, `useAgentMcp` (non-UI hooks)
- Establish and document `setup_test_db()` fixture pattern as the canonical approach for all Rust tests
- Write cargo tests: model unit tests (pure logic), DB layer tests (SQL correctness + migration validation)
- Verify `cargo test` passes consistently with default thread count (not just `--test-threads=1`)

**Avoids:** Pitfalls 4 (SQLite isolation), 5 (Tauri mock crashes in jsdom)

**Research flag:** Standard patterns — Tauri mock APIs and in-memory SQLite test patterns are officially documented and already present in 38 codebase files

### Phase 3: Error Logger

**Rationale:** Independent of the test framework but benefits from lint/test infra being proven first (the Rust command needs to pass lint and have a test). Must be completed before the MCP tool that reads the log. Re-entrancy and buffering must be in the initial implementation.

**Delivers:** `src/lib/errorLogger.ts` with re-entrancy guard + 1-2s buffered flush; `error_commands.rs` Rust IPC command; `.element/errors.log` append-only log; guard against logger/Vitest interference

**Key actions:**
- Create `error_commands.rs` with `log_frontend_error` Tauri command (append to `$APP_DATA/errors.log`)
- Register command in `src-tauri/src/lib.rs`
- Create `src/lib/errorLogger.ts` with: `isLogging` re-entrancy flag, error buffer flushed via `setInterval`, fire-and-forget `invoke().catch(() => {})`
- Add `import.meta.env.MODE === 'test'` guard so logger is disabled in Vitest runs
- Call `installErrorLogger()` in `src/main.tsx` before React renders
- Add `.element/errors.log` and `coverage/` to `.gitignore`
- Verify: error inside logging path doesn't freeze app; Vitest suite still passes with module present

**Avoids:** Pitfall 7 (infinite recursion), logger+test interference integration gotcha

**Research flag:** Standard patterns — no additional research needed

### Phase 4: Claude Code Hooks

**Rationale:** Hooks invoke the tools configured in Phases 1-2. Must come after lint and test infrastructure are proven passing. Misconfigured hooks that invoke broken scripts block all commits with no recourse.

**Delivers:** `.claude/settings.json` with `PreToolUse` commit gate and `PostToolUse` auto-format; `.claude/hooks/pre-commit-gate.sh`; verified behavior on cold cache and warm cache

**Key actions:**
- Verify Claude Code version is v2.1.85+ (required for `if` field in hooks)
- Verify `jq` is installed (`brew install jq` if not)
- Create `.claude/settings.json` with `PreToolUse` hook (matcher: Bash, `if: "Bash(git commit*)"`, runs `check:all`, timeout 300s, exit 2 to block with stderr reason)
- Create `PostToolUse` hook (matcher: `Edit|Write`, reads `tool_input.file_path` via jq, runs `biome check --write` on changed TS/TSX files, exit 0 always)
- Test: commit with failing lint → blocked with clear message; commit with passing suite → proceeds; first commit after `cargo clean` → completes within timeout

**Avoids:** Pitfall 8 (hook timeout), integration gotcha (broken biome config silently failing in hook)

**Research flag:** Standard patterns — Claude Code hooks documentation is HIGH confidence official source

### Phase 5: Testing MCP Server (Capstone)

**Rationale:** Wraps the entire quality ecosystem. Depends on both test frameworks being stable and returning reliable JSON output. Security must be designed in from the start — this server executes shell commands and exposes test lifecycle tools to an AI client.

**Delivers:** `testing-mcp-server/` with `discover_tests`, `run_tests`, `read_results`, `generate_stubs`, `check_coverage_gaps` tools; `read_frontend_errors` tool in existing `mcp-server/`; Claude Code configured with both MCP servers

**Key actions:**
- Scaffold `testing-mcp-server/` following existing `mcp-server/` pattern (same SDK version, same build, stdio transport, esbuild bundling)
- Implement all tools using `child_process.spawn` with argument arrays — never template literal strings
- Validate test name inputs against `^[a-zA-Z0-9_:]+$`; resolve and verify file paths stay within project root; reject `..` path segments
- Parse Vitest `--reporter=json` output and `cargo test --message-format=json` output into structured `{ passed, failed, failures: [{ name, error, file, line }] }` results
- Cache last run results to files for `read_results` tool (avoids re-running tests to get previous output)
- Add `read_frontend_errors` tool to existing `mcp-server/` (reads `.element/errors.log`, handles partial lines gracefully)
- Register `element-testing` server in Claude Code MCP config alongside existing `element` server

**Avoids:** Pitfall 6 (command injection), path traversal security mistake

**Research flag:** Security review needed — MCP command injection is a documented CVE class (CVE-2025-53109/53110). Input sanitization and command allowlist logic should be reviewed carefully before shipping. Consider a targeted security review of the `runner.ts` module that spawns processes.

### Phase Ordering Rationale

- **Linting before everything:** The Biome schema bug is a Day 1 blocker. Hooks, tests, and MCP server all benefit from or require clean lint. This cannot be deferred.
- **Tests before hooks:** Pre-commit test gates on a suite that doesn't exist or has flaky failures make hooks an obstacle. Tests must be stable before they are enforced.
- **Error logger after lint/tests:** The Rust command needs to pass lint and ideally have a test. The logger is otherwise independent — it could be Phase 2 but Phase 3 is natural given the Rust command dependency.
- **Hooks after tools they invoke are proven:** This is the critical sequencing principle. A hook invoking a broken `check:all` script blocks all commits with no clear error. Lint and test infra must be fully working before hooks activate.
- **Testing MCP last:** It wraps the entire ecosystem, depends on test commands returning reliable JSON, and has the most security complexity. It deserves its own phase with focused attention.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 5 (Testing MCP server):** The security model for command execution needs explicit design review before implementation. MCP injection CVEs are documented (2025-2026) and this server is command-executing by design. The argument validation, allowlist, and path containment logic should be specified in detail during phase planning.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Linting):** Official Biome v2 migration guide covers the schema fix precisely. Clippy/rustfmt configuration is standard Rust toolchain usage with well-known patterns.
- **Phase 2 (Tests):** Tauri mock API patterns are officially documented. The in-memory SQLite test pattern already exists in 38 files in this codebase — it just needs standardization.
- **Phase 3 (Error logger):** Single Tauri IPC command + frontend monkey-patch. The architecture is minimal and patterns are well-understood.
- **Phase 4 (Hooks):** Claude Code hooks documentation is HIGH confidence official source with precise exit code semantics and `if` field syntax.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Directly verified against codebase: `package.json`, `Cargo.toml`, `biome.json`, `vite.config.ts`, `mcp-server/`. Biome v2 and Vitest v4 confirmed installed. No guesswork. |
| Features | HIGH | Official Tauri 2, Claude Code, and Vitest docs. Feature scope is bounded by existing codebase state. Anti-features rationale is concrete (existing tool coverage, UI volatility). |
| Architecture | HIGH | Based on existing `mcp-server/` as a proven template. Error logger is minimal (single IPC command). Testing MCP follows identical structure with added security constraints. |
| Pitfalls | HIGH | Verified against actual codebase state — Biome schema mismatch confirmed in `biome.json` (v1.9.4 schema, v2.4.7 package), 70 clippy warnings confirmed, `await_holding_lock` location confirmed at `calendar.rs:762`. Not theoretical. |

**Overall confidence:** HIGH

### Gaps to Address

- **Biome 2.x rule coverage for project-specific needs:** If a specific lint pattern from typescript-eslint is required that Biome doesn't implement, there is no fallback without adding ESLint (which is explicitly not recommended). Assess needed rules during Phase 1 — if a critical rule is missing, escalate before Phase 4 hooks are wired.
- **`cargo test --message-format=json` edge cases:** Documented but behavior on panics, compilation errors, and test timeouts may produce non-JSON output mixed in the stream. Validate the parser handles these cases during Phase 5 implementation.
- **Claude Code version requirement for hooks `if` field:** Requires v2.1.85+. Verify the installed version before Phase 4. If below this version, all Bash commands will trigger the pre-commit hook rather than only `git commit` commands — highly disruptive.
- **`await_holding_lock` fix scope:** The pitfalls research identifies `calendar.rs:762` specifically, but switching to `tokio::sync::Mutex` may have ripple effects across the codebase. Full scope will become clear during Phase 1 implementation. Budget extra time if the lock pattern is used in multiple files.

## Sources

### Primary (HIGH confidence)
- Official Claude Code Hooks Guide (`code.claude.com/docs/en/hooks-guide`) — hook event types, exit codes, `if` field syntax, stdin JSON format
- Official Tauri 2 Testing Docs (`v2.tauri.app/develop/tests/`) — mock runtime, `@tauri-apps/api/mocks`, `mockIPC` pattern
- Official Vitest 4 Docs (`vitest.dev`) — JSON reporter, coverage provider config, `vitest related`
- Official Biome v2 Migration Guide (`biomejs.dev/guides/upgrade-to-biome-v2/`) — schema migration, breaking changes, `biome migrate` command
- Direct codebase inspection — `package.json`, `Cargo.toml`, `biome.json`, `vite.config.ts`, `src/__tests__/setup.ts`, `mcp-server/`, 38 Rust `#[cfg(test)]` modules confirmed

### Secondary (MEDIUM confidence)
- Biome v2 vs ESLint comparison (Mar 2026) — performance benchmarks, rule parity assessment
- Community Claude Code hooks examples (brethorsting.com, pixelmojo.io) — practical pre-commit and post-edit patterns
- Vitest Tauri setup community blog (yonatankra.com) — jsdom + `__TAURI_INTERNALS__` setup details
- MCP security CVE analysis (practical-devsecops.com, cymulate.com) — CVE-2025-53109/53110 command injection patterns
- Progressive lint adoption patterns (mainmatter.com) — incremental rule enablement strategy

### Tertiary (LOW confidence)
- MCP market test runner reference — existing test MCP tool designs used for tool naming inspiration only; implementation details not relied upon

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
