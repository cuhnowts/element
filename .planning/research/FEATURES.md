# Feature Research

**Domain:** Code quality infrastructure for Tauri 2.x + React 19 + Rust desktop app
**Researched:** 2026-04-05
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any serious codebase quality setup must have. Missing these means the infrastructure is incomplete.

#### A. TypeScript/React Linting

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| ESLint flat config (`eslint.config.mjs`) | ESLint 9+ requires flat config; `.eslintrc` is deprecated. Every modern TS project uses it. | LOW | None -- greenfield, no legacy config to migrate |
| `typescript-eslint` recommended rules | Type-aware linting catches real bugs (unused vars, implicit any, unsafe returns). Standard for any TS project. | LOW | ESLint flat config |
| React plugin (`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) | Hooks rules prevent subtle bugs (stale closures, missing deps). React Refresh rules prevent HMR breakage. | LOW | ESLint flat config |
| Prettier for formatting | Eliminates formatting debates. Standard in JS/TS ecosystem. Separate from ESLint (linting != formatting). | LOW | None |
| `eslint-config-prettier` | Disables ESLint formatting rules that conflict with Prettier. Required when using both. | LOW | ESLint + Prettier |

#### B. Rust Linting

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| `cargo clippy` with warnings-as-errors | Clippy is Rust's standard linter. Every Rust project runs it. `-- -D warnings` in CI. | LOW | None -- clippy ships with rustup |
| `rustfmt.toml` config | `cargo fmt` is the Rust formatting standard. Config file locks style preferences. | LOW | None -- rustfmt ships with rustup |
| Clippy lint group configuration | Set `#![warn(clippy::pedantic)]` or per-crate `clippy.toml` for stricter catches. Tauri's own repo uses pedantic. | LOW | None |

#### C. TypeScript Testing (Vitest)

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Vitest config with Tauri IPC mocking | Vitest already installed (v4.1.0). Need `vitest.config.ts` with `@tauri-apps/api/mocks` for `mockIPC`. ~45 todo stubs exist. | MEDIUM | Vitest (already in devDeps) |
| Utility function tests (`src/lib/`) | `date-utils.ts`, `shellAllowlist.ts`, `actionRegistry.ts`, `utils.ts` -- pure functions, easy to test, high ROI. | LOW | Vitest config |
| Store logic tests (`src/stores/`) | Zustand stores contain business logic (selectors, derived state). Testing prevents the selector stability bugs already documented in memory. | MEDIUM | Vitest config, mock Tauri commands |
| Hook tests for non-UI hooks | `useAgentLifecycle`, `useAgentQueue`, `useAgentMcp` -- stateful logic that doesn't need DOM rendering. | MEDIUM | Vitest config, mock Tauri commands |

#### D. Rust Testing (cargo test)

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Model unit tests | `src/models/` structs with serialization, validation logic. Pure Rust, no Tauri dependency. Easiest entry point. | LOW | None |
| Database layer tests | `src/db/` SQL migrations, queries. Needs in-memory SQLite fixture. `test_fixtures/` already exists with `mod.rs`. | MEDIUM | In-memory SQLite test harness |
| Command handler tests | `src/commands/` -- 22 command modules. Use Tauri's `tauri::test::mock_builder()` to test without webview runtime. | HIGH | Tauri mock runtime, DB fixtures |
| Engine/scheduler tests | `src/engine/`, `src/scheduling/`, `src/heartbeat/` -- core business logic. Testable in isolation if DB is mocked. | MEDIUM | DB fixtures |

#### E. Error Logger

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| `console.error` interceptor | Patches `console.error` to capture frontend errors. Standard pattern: save original, wrap, call original + side effect. | LOW | None |
| Log file writer via Tauri command | Write intercepted errors to a known file path (e.g., `$APP_LOG_DIR/frontend-errors.log`). Tauri command or `tauri-plugin-log`. | LOW | Tauri IPC or plugin |
| Structured error format | Timestamp + error message + stack trace + component context. Machine-readable so Claude Code can parse it. | LOW | Interceptor |
| Log rotation / size cap | Prevent unbounded log growth. Simple approach: truncate on app start or cap at 1MB. | LOW | Log file writer |

#### F. Claude Code Hooks

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Pre-commit lint gate | `PreToolUse` hook on `Bash` with `if: "Bash(git commit*)"`. Runs `eslint --max-warnings 0` + `cargo clippy` on changed files. Exit 2 to block on failure. | MEDIUM | ESLint + clippy configured first |
| Pre-commit test gate | Same hook runs `vitest run --reporter=json` + `cargo test` for changed modules. Block commit if tests fail. | MEDIUM | Test suites configured first |
| PostToolUse auto-format | `PostToolUse` hook on `Edit|Write` runs Prettier on edited `.ts/.tsx` files. Documented pattern in Claude Code docs. | LOW | Prettier configured |
| Post-compact context re-injection | `SessionStart` hook with `compact` matcher echoes project conventions (test patterns, lint rules, file structure). Prevents context loss. | LOW | None |

### Differentiators (Competitive Advantage)

Features that go beyond standard quality infrastructure. These make Element's development uniquely productive.

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| **Testing MCP server** | Generic MCP server exposing test lifecycle tools (discover, run, read results, generate stubs, coverage gaps). Claude Code becomes a test-writing agent -- it can autonomously find untested code, generate stubs, run them, and iterate. No existing MCP server does this well for mixed Rust+TS stacks. | HIGH | Vitest + cargo test configured; MCP server sidecar pattern already built (10 tools exist) |
| **Test-on-save hook** | `PostToolUse` hook on `Edit|Write` runs only related tests (not full suite). Needs test file discovery logic mapping source -> test. Gives Claude instant feedback on every edit. | MEDIUM | Test suites configured; file-to-test mapping |
| **Error log MCP tool** | Expose `read_frontend_errors` as an MCP tool so Claude Code can check for runtime errors without being told. Closes the frontend observability gap without component tests. | LOW | Error logger + existing MCP server |
| **Coverage gap detector** | MCP tool that compares source files against test files, identifies modules with zero coverage. Suggests what to test next. Not just line coverage -- structural coverage (which modules/functions lack any tests). | MEDIUM | Test discovery, file system analysis |
| **Test stub generator** | MCP tool that reads a source file and generates Vitest/cargo test skeletons with `it.todo()` or `#[test]` stubs. Bootstraps test files from function signatures. | MEDIUM | AST-level understanding or pattern matching |
| **Agent-based Stop hook for test verification** | `type: "agent"` hook on `Stop` event that spawns a subagent to verify tests pass before Claude declares work done. Catches "it compiles but doesn't work" failures. | LOW | Test suites configured; Claude Code agent hooks |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Frontend component tests (RTL)** | "Full test coverage" instinct. RTL is already in devDeps. | Component tests are brittle for a rapidly evolving UI (200+ files, frequent layout changes). Break on every redesign. Screenshots + feedback loop gives same confidence for UI correctness. Pure logic tests (hooks, stores, utils) catch the bugs that matter. | Test hooks/stores/utils with Vitest. Verify UI via screenshots + manual feedback. |
| **E2E tests (WebDriver/Playwright)** | "Test the whole app end-to-end." | Enormous setup cost for a desktop app (tauri-driver + WebDriver + browser automation). Fragile. Slow. Single developer -- time is better spent on unit/integration tests. | Cargo test for Rust commands (mock runtime), Vitest for TS logic, manual UAT for flows. |
| **Pre-commit hooks via Husky/lint-staged** | Standard in web projects. | Claude Code hooks replace this for the primary developer. Husky adds Node.js git hook complexity. No team to enforce for. If contributors join later, add it then. | Claude Code `PreToolUse` hook on git commit. |
| **Istanbul/c8 line coverage targets** | "80% coverage or fail." | Coverage percentage is a vanity metric. Chasing numbers leads to tests that assert `true === true`. Structural coverage (which modules have zero tests) is more actionable. | Coverage gap detector MCP tool that identifies untested modules, not percentages. |
| **Snapshot testing** | Quick way to detect UI changes. | Snapshot tests create noise -- every intentional UI change requires snapshot updates. For a single developer iterating fast, they slow down more than they help. | Screenshot-based UI review (already in workflow). |
| **Type-checked ESLint rules (`recommendedTypeChecked`)** | Catches more bugs via type info. | Requires `parserOptions.project` pointing to tsconfig. Significantly slower lint runs (spawns TS compiler). For 170K LOC, adds 10-30s to lint. Start with `recommended`, upgrade later if needed. | Start with `tseslint.configs.recommended` (no type checking). Add type-checked rules in a future milestone if lint speed is acceptable. |

## Feature Dependencies

```
[ESLint flat config]
    |--- required by ---> [Pre-commit lint gate hook]
    |--- required by ---> [PostToolUse auto-format hook]

[Prettier config]
    |--- required by ---> [PostToolUse auto-format hook]
    |--- required by ---> [Pre-commit lint gate hook]

[clippy + rustfmt config]
    |--- required by ---> [Pre-commit lint gate hook]

[Vitest config + mocking]
    |--- required by ---> [TS utility tests]
    |--- required by ---> [Store/hook tests]
    |--- required by ---> [Pre-commit test gate hook]
    |--- required by ---> [Testing MCP server (TS side)]

[cargo test harness + DB fixtures]
    |--- required by ---> [Rust model tests]
    |--- required by ---> [Rust command tests]
    |--- required by ---> [Pre-commit test gate hook]
    |--- required by ---> [Testing MCP server (Rust side)]

[console.error interceptor + log file]
    |--- required by ---> [Error log MCP tool]

[Testing MCP server]
    |--- required by ---> [Coverage gap detector]
    |--- required by ---> [Test stub generator]
    |--- enhances ------> [Test-on-save hook]

[Existing MCP server sidecar (10 tools)]
    |--- pattern for ---> [Testing MCP server]
    |--- pattern for ---> [Error log MCP tool]
```

### Dependency Notes

- **Linting before hooks:** ESLint/Prettier/clippy must be configured and passing before hooks can gate on them. Otherwise hooks block every commit.
- **Tests before hooks:** Same logic -- test suites must exist and pass before pre-commit test gates make sense.
- **Error logger before MCP tool:** The interceptor must write to a known path before an MCP tool can read it.
- **Testing MCP server is the capstone:** It depends on both test frameworks being configured and working. Build it last.
- **Existing MCP sidecar is the template:** Element already has a working MCP server with 10 tools over stdio. The testing MCP server follows the same pattern -- this is a known architecture, not a research problem.

## MVP Definition

### Phase 1: Linting Infrastructure (Launch First)

- [ ] ESLint flat config with `typescript-eslint` recommended + React hooks/refresh plugins
- [ ] Prettier config (`.prettierrc`) + `eslint-config-prettier`
- [ ] `rustfmt.toml` + `cargo fmt --check` passing
- [ ] `cargo clippy -- -D warnings` passing
- [ ] Fix all existing lint violations (likely significant for 170K LOC greenfield lint)

### Phase 2: Test Infrastructure + Core Tests

- [ ] `vitest.config.ts` with Tauri IPC mocking setup
- [ ] Implement ~15 high-value TS utility tests (`date-utils`, `shellAllowlist`, `actionRegistry`, `utils`)
- [ ] In-memory SQLite test harness for Rust
- [ ] Implement Rust model unit tests (pure logic, no Tauri dependency)
- [ ] Implement Rust DB layer tests (SQL correctness verification)

### Phase 3: Error Logger + Claude Code Hooks

- [ ] `console.error` interceptor writing to `frontend-errors.log`
- [ ] PostToolUse auto-format hook (Prettier on Edit/Write)
- [ ] Pre-commit lint + test gate hook
- [ ] Post-compact context re-injection hook

### Phase 4: Testing MCP Server (Capstone)

- [ ] MCP server with `discover_tests` tool (find test files, map to source)
- [ ] `run_tests` tool (execute vitest/cargo test, return structured JSON results)
- [ ] `read_test_results` tool (parse last run results)
- [ ] `generate_test_stubs` tool (create skeleton test files from source)
- [ ] `check_coverage_gaps` tool (identify untested modules)
- [ ] Error log MCP tool (`read_frontend_errors`)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| ESLint + Prettier setup | HIGH | LOW | P1 |
| clippy + rustfmt setup | HIGH | LOW | P1 |
| Vitest config + utility tests | HIGH | LOW | P1 |
| Rust model/DB unit tests | HIGH | MEDIUM | P1 |
| console.error interceptor | HIGH | LOW | P1 |
| Pre-commit lint/test hook | HIGH | MEDIUM | P1 |
| PostToolUse auto-format hook | MEDIUM | LOW | P1 |
| Testing MCP server (discover + run + read) | HIGH | HIGH | P2 |
| Coverage gap detector MCP tool | MEDIUM | MEDIUM | P2 |
| Test stub generator MCP tool | MEDIUM | MEDIUM | P2 |
| Error log MCP tool | MEDIUM | LOW | P2 |
| Test-on-save hook | MEDIUM | MEDIUM | P2 |
| Agent-based Stop hook (test verification) | LOW | LOW | P3 |
| Post-compact context hook | LOW | LOW | P3 |
| Rust command handler tests (mock runtime) | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have -- core infrastructure that everything else depends on
- P2: Should have -- the differentiators that make Claude Code autonomous
- P3: Nice to have -- refinements after core infrastructure works

## Testing MCP Server: Tool Design

The testing MCP server is the highest-complexity, highest-value differentiator. Here is the tool breakdown based on research of existing MCP test runners and Element's specific needs.

### Tools

| Tool | Input | Output | Rationale |
|------|-------|--------|-----------|
| `discover_tests` | `{ framework?: "vitest" \| "cargo", path?: string }` | JSON array of test files with their source file mappings | Claude needs to know what tests exist before deciding what to write |
| `run_tests` | `{ framework: "vitest" \| "cargo", filter?: string, file?: string }` | Structured JSON: pass/fail counts, failed test names + error messages, duration | Raw terminal output is unusable. Structured results let Claude act on failures. |
| `read_test_results` | `{ framework?: "vitest" \| "cargo" }` | Last run results from JSON reporter output files | Avoids re-running tests just to read previous results |
| `generate_test_stubs` | `{ source_file: string }` | Generated test file content with `it.todo()` / `#[test]` skeletons | Bootstraps test files. Pattern-match on exports/pub fns. |
| `check_coverage_gaps` | `{ framework?: "vitest" \| "cargo" }` | List of source files with no corresponding test file, or with zero test cases | Structural coverage -- not line coverage. "This module has no tests at all." |
| `suggest_tests` | `{ file: string }` | Suggested test cases based on function signatures and complexity | Higher-level than stubs -- suggests what scenarios to test |

### Design Decisions

- **Separate from existing MCP server:** The existing server has 10 tools for app entity management. Testing tools are a different concern. Separate server binary, same sidecar pattern.
- **Framework-agnostic interface:** Tools accept `framework` parameter. Internally dispatch to vitest or cargo. Could add more frameworks later.
- **JSON reporters:** Vitest supports `--reporter=json` natively. Cargo test with `--format json` (unstable) or parse stdout. Write results to known paths for `read_test_results`.
- **No coverage percentage enforcement:** Coverage gaps tool reports untested modules, not percentages. "These 12 files have no tests" is more actionable than "you're at 34%."

## Claude Code Hooks: Configuration Reference

Based on official Claude Code documentation, hooks go in `.claude/settings.json` for project-level (committed to repo) or `~/.claude/settings.json` for user-level (all projects).

### Key Hook Events for This Milestone

| Event | Matcher | Use Case | Exit Behavior |
|-------|---------|----------|---------------|
| `PreToolUse` | `Bash` with `if: "Bash(git commit*)"` | Pre-commit lint + test gate | Exit 0 = allow, Exit 2 = block with stderr reason |
| `PostToolUse` | `Edit\|Write` | Auto-format with Prettier, run related tests | Exit 0 = proceed (action already happened) |
| `SessionStart` | `compact` | Re-inject project conventions after context compaction | Stdout text added to Claude's context |
| `Stop` | (none) | Agent-based test verification before declaring done | `type: "agent"` with `ok: true/false` response |

### Hook Input Format

Hooks receive JSON on stdin with `session_id`, `cwd`, `hook_event_name`, `tool_name`, and `tool_input`. For `PreToolUse` on Bash, `tool_input.command` contains the shell command. Use `jq` to parse.

### Blocking Pattern

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q "^git commit"; then
  # Run lint checks
  npx eslint --max-warnings 0 . 2>&1
  if [ $? -ne 0 ]; then
    echo "Lint check failed. Fix errors before committing." >&2
    exit 2  # Block the commit
  fi
fi
exit 0
```

## Sources

- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- hook event types, configuration format, pre-commit/post-edit patterns (HIGH confidence)
- [Tauri 2 Testing Docs](https://v2.tauri.app/develop/tests/) -- mock runtime, cargo test patterns (HIGH confidence)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files) -- eslint.config.mjs format (HIGH confidence)
- [typescript-eslint Getting Started](https://typescript-eslint.io/getting-started/) -- recommended config setup (HIGH confidence)
- [Tauri Plugin Log](https://v2.tauri.app/plugin/logging/) -- frontend logging to file (HIGH confidence)
- [Test Runner MCP Server](https://mcpmarket.com/server/test-runner) -- existing MCP test runner patterns, tool design reference (MEDIUM confidence)
- [Vitest 4 Blog](https://vitest.dev/blog/vitest-4) -- current Vitest capabilities (HIGH confidence)
- [Clippy and Fmt Guide](https://fios-quest.com/idiomatic-rust-in-simple-steps/language-basics/clippy-and-fmt.html) -- Rust lint best practices (HIGH confidence)
- [Steve Kinney Hook Examples](https://stevekinney.com/courses/ai-development/claude-code-hook-examples) -- practical hook patterns (MEDIUM confidence)

---
*Feature research for: Code quality infrastructure (linting, testing, error logging, hooks, testing MCP)*
*Researched: 2026-04-05*
