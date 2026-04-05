# Architecture Research

**Domain:** Code quality infrastructure for Tauri 2.x + React 19 desktop app
**Researched:** 2026-04-05
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code Hooks                           │
│  .claude/settings.json                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ PreToolUse   │  │ PostToolUse  │  │ Stop (agent hook)  │    │
│  │ (pre-commit) │  │ (auto-format)│  │ (run full suite)   │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘    │
│         │                 │                    │                │
├─────────┴─────────────────┴────────────────────┴────────────────┤
│                     Linting Layer                               │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │ Biome (TS/React)     │  │ clippy + rustfmt (Rust)      │    │
│  │ biome.json (exists)  │  │ .clippy.toml + rustfmt.toml  │    │
│  └──────────┬───────────┘  └──────────────┬───────────────┘    │
│             │                             │                    │
├─────────────┴─────────────────────────────┴─────────────────────┤
│                     Test Layer                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │ Vitest (TS utils)    │  │ cargo test (Rust models/     │    │
│  │ vite.config.ts test  │  │ commands/engines)            │    │
│  │ jsdom, mockIPC       │  │ in-memory SQLite, tempfile   │    │
│  └──────────┬───────────┘  └──────────────┬───────────────┘    │
│             │                             │                    │
├─────────────┴─────────────────────────────┴─────────────────────┤
│                     Error Logger                                │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Frontend: console.error monkey-patch -> Tauri IPC    │      │
│  │ Backend: Rust command appends to .element/errors.log │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     Testing MCP Server                          │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Separate process: testing-mcp-server/                │      │
│  │ Tools: discover_tests, run_tests, read_results,      │      │
│  │        generate_stubs, check_coverage, suggest_tests │      │
│  │ Spawns: vitest --reporter=json, cargo test --json    │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|----------------|-----------------|
| Biome config (biome.json) | TS/React linting + formatting | **Modified** -- already exists with recommended rules, needs tightening |
| clippy + rustfmt configs | Rust linting + formatting | **New** -- .clippy.toml, rustfmt.toml, Cargo.toml [lints] section |
| Vitest test suite | TS utility function tests | **Modified** -- vite.config.ts has test block, 2 tests exist, need expansion |
| cargo test suite | Rust model/command/engine tests | **Modified** -- 38 files have #[cfg(test)], test_fixtures/ exists, need expansion |
| Error logger (frontend) | console.error interception | **New** -- src/lib/errorLogger.ts |
| Error logger (backend) | Write errors to file | **New** -- src-tauri/src/commands/error_commands.rs |
| Claude Code hooks | Enforce lint/test on commit/edit | **New** -- .claude/settings.json hooks block |
| Testing MCP server | Test lifecycle for AI consumers | **New** -- testing-mcp-server/ directory |

## Integration Points: Existing Code

### What Already Exists (Do Not Recreate)

1. **Biome** -- already installed (`@biomejs/biome ^2.4.7`), configured in `biome.json` with recommended rules, `lint` and `format` scripts in package.json
2. **Vitest** -- already installed (`vitest ^4.1.0`), configured in `vite.config.ts` test block with jsdom environment, `test` and `test:watch` scripts exist, setup file at `src/__tests__/setup.ts`
3. **Testing Library** -- `@testing-library/react ^16.3.2`, `@testing-library/dom ^10.4.1`, `@testing-library/jest-dom ^6.9.1`, `@testing-library/user-event ^14.6.1` all installed
4. **Rust test infra** -- `tempfile = "3"` in dev-dependencies, `Database::from_connection()` for in-memory SQLite, `test_fixtures/` module with calendar_responses and manifests
5. **38 Rust files with `#[cfg(test)]` blocks** -- existing pattern uses `setup_test_db()` with `Connection::open_in_memory()`, runs migrations, returns `Database`
6. **MCP server pattern** -- existing `mcp-server/` uses `@modelcontextprotocol/sdk`, `better-sqlite3`, stdio transport, esbuild bundler

### Files That Need Modification

| File | Change | Reason |
|------|--------|--------|
| `biome.json` | Add/tighten specific rules | Currently uses generic "recommended", needs project-specific rules (e.g., no unused vars as error, import sorting) |
| `Cargo.toml` | Add `[lints.clippy]` section | Clippy config lives in Cargo.toml for workspace awareness |
| `package.json` | Add `lint:rust`, `test:rust`, `check:all` scripts | Unified commands for hooks to call |
| `vite.config.ts` | Add coverage config to test block | Coverage reporting for MCP server to read |
| `.gitignore` | Add error log, coverage dirs | Prevent committing transient files |
| `src-tauri/src/lib.rs` | Register new error logging command | New IPC command for frontend error forwarding |
| `src/main.tsx` | Call `installErrorLogger()` before app mount | Initialize console.error interceptor |

### Files That Are NOT Modified

- No changes to React components (no frontend component tests per scope)
- No changes to existing MCP server (`mcp-server/`)
- No changes to existing Zustand stores
- No changes to existing Tauri capabilities (error logging uses existing IPC, not new plugin)

## Recommended New File Structure

```
element/
├── .claude/
│   └── settings.json              # NEW: hooks config
│   └── hooks/
│       └── pre-commit-gate.sh     # NEW: lint + test gate script
├── biome.json                     # MODIFIED: tightened rules
├── rustfmt.toml                   # NEW: Rust format config
├── src/
│   ├── __tests__/
│   │   ├── setup.ts               # EXISTS: add mockIPC setup
│   │   ├── calendar-today.test.ts # EXISTS
│   │   └── workflow-collapse.test.ts # EXISTS
│   └── lib/
│       └── errorLogger.ts         # NEW: console.error interceptor
├── src-tauri/
│   ├── Cargo.toml                 # MODIFIED: [lints.clippy] section
│   └── src/
│       └── commands/
│           └── error_commands.rs   # NEW: log_frontend_error IPC command
├── testing-mcp-server/            # NEW: separate MCP server
│   ├── package.json
│   ├── tsconfig.json
│   ├── build.ts
│   └── src/
│       ├── index.ts               # MCP server entry
│       ├── runner.ts              # Test execution (vitest, cargo test)
│       ├── parser.ts              # JSON result parsing
│       └── tools/
│           ├── discover-tools.ts  # discover_tests
│           ├── run-tools.ts       # run_tests, run_single_test
│           ├── result-tools.ts    # read_results, check_coverage
│           └── generate-tools.ts  # generate_stubs, suggest_tests
└── .element/
    └── errors.log                 # NEW: runtime error log (gitignored)
```

## Architectural Patterns

### Pattern 1: Biome Over ESLint+Prettier

**What:** Use existing Biome installation for all TS/React linting and formatting instead of adding ESLint+Prettier
**When to use:** Always -- it is already installed and configured
**Trade-offs:** Biome is faster (100x+ vs ESLint) and handles both linting and formatting in one tool. Fewer rules than ESLint ecosystem but covers all practical needs. Already in the repo.

The PROJECT.md mentions "ESLint + Prettier" as the target, but Biome is already installed and serving this role. **Recommend staying with Biome** -- switching to ESLint+Prettier would be a regression in DX and speed for no practical benefit.

**Current config tightening needed:**
```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      },
      "style": {
        "useConst": "error"
      }
    }
  }
}
```

### Pattern 2: Tauri IPC Mock for Vitest

**What:** Use `@tauri-apps/api/mocks` `mockIPC` to intercept all `invoke()` calls in Vitest tests
**When to use:** Testing any hook or utility that calls Tauri IPC commands
**Trade-offs:** Lightweight, official Tauri support. Only tests TS logic, not Rust command behavior (that is what cargo test is for).

**Example:**
```typescript
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import { invoke } from "@tauri-apps/api/core";

afterEach(() => clearMocks());

test("fetches project list", async () => {
  mockIPC((cmd, payload) => {
    if (cmd === "list_projects") {
      return [{ id: "p1", name: "Test Project" }];
    }
  });
  const result = await invoke("list_projects");
  expect(result).toHaveLength(1);
});
```

**Note:** The `@tauri-apps/api/mocks` module is included in `@tauri-apps/api`. The setup file (`src/__tests__/setup.ts`) should set `window.__TAURI_INTERNALS__` if not already present, so mocks work in jsdom.

### Pattern 3: In-Memory SQLite for Rust Tests

**What:** Every Rust test creates its own `Connection::open_in_memory()`, runs migrations, gets a fresh `Database`
**When to use:** All Rust unit/integration tests that touch the database
**Trade-offs:** Fast, isolated, no file cleanup. Already established pattern across 38 test modules.

**Existing pattern (do not change):**
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations;
    use rusqlite::Connection;

    fn setup_test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&conn).unwrap();
        Database::from_connection(conn)
    }
}
```

### Pattern 4: Console Error Monkey-Patch to IPC

**What:** Override `console.error` in the frontend to both log normally AND forward errors to Rust via a Tauri command that appends to a log file
**When to use:** App initialization (main.tsx), before any components mount
**Trade-offs:** Zero UI impact, no new dependencies. Claude Code can `cat .element/errors.log` to see runtime errors. Monkey-patching is well-understood but requires saving the original reference.

**Data flow:**
```
console.error("something broke", details)
    |
    v
errorLogger.ts intercept
    |
    +--> original console.error (browser devtools still work)
    |
    +--> invoke("log_frontend_error", {
           timestamp: ISO string,
           message: "something broke",
         })
              |
              v
         error_commands.rs -> append to .element/errors.log
              |
              v
         Claude Code reads .element/errors.log
```

**Frontend (src/lib/errorLogger.ts):**
```typescript
import { invoke } from "@tauri-apps/api/core";

const originalError = console.error;

export function installErrorLogger() {
  console.error = (...args: unknown[]) => {
    originalError.apply(console, args);
    try {
      const message = args.map(a =>
        typeof a === "string" ? a : JSON.stringify(a)
      ).join(" ");
      invoke("log_frontend_error", {
        timestamp: new Date().toISOString(),
        message,
      }).catch(() => {}); // fire-and-forget, never throw
    } catch {
      // Never let logging break the app
    }
  };
}
```

**Backend (error_commands.rs):**
```rust
#[tauri::command]
pub fn log_frontend_error(
    app: tauri::AppHandle,
    timestamp: String,
    message: String,
) -> Result<(), String> {
    let log_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    let log_path = log_dir.join("errors.log");
    let line = format!("[{}] [frontend] {}\n", timestamp, message);
    std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .and_then(|mut f| std::io::Write::write_all(&mut f, line.as_bytes()))
        .map_err(|e| e.to_string())
}
```

**Why not tauri-plugin-log:** Over-engineered. That plugin is designed for structured app logging with targets, levels, rotation, and both Rust/JS integration. The error logger is a simple append-to-file for Claude Code to read. One Tauri command, 20 lines of Rust, no new dependencies.

### Pattern 5: Claude Code Hooks for Enforcement

**What:** Use `.claude/settings.json` hooks to run lint/test gates automatically
**When to use:** Pre-commit blocking (PreToolUse on Bash git commit), post-edit formatting (PostToolUse on Edit/Write)
**Trade-offs:** Deterministic enforcement without relying on the LLM to remember. Hooks run in parallel, have 10min default timeout.

**Configuration (.claude/settings.json):**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(git commit*)",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" && npm run check:all"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx @biomejs/biome check --write 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

**Note on `if` field:** Requires Claude Code v2.1.85+. The `if: "Bash(git commit*)"` ensures the pre-commit gate only fires on actual commit commands, not every Bash invocation. The `check:all` script in package.json would run: biome check, cargo clippy, vitest run, cargo test.

**Hook types explained:**
- `PreToolUse` with exit 2 = **block the commit**. Claude receives the failure reason and can fix.
- `PostToolUse` = **auto-format after edits**. Runs Biome on changed files, non-blocking (|| true).
- `Stop` agent hook = optional, for verifying all tests pass before Claude marks a task done. Use `type: "command"` not `type: "agent"` to avoid LLM overhead.

### Pattern 6: Separate Testing MCP Server

**What:** A new `testing-mcp-server/` directory, separate from `mcp-server/`, providing test lifecycle tools
**When to use:** Claude Code connects to it as an additional MCP server alongside the existing element-mcp
**Trade-offs:** Separate process keeps concerns clean. The existing MCP server reads element.db (project data); the testing MCP server reads test results and runs test commands. No shared state needed.

**Why separate, not merged:**
- Different responsibilities (project management vs code quality)
- Different data sources (SQLite vs filesystem/process output)
- Different consumers (agent orchestrator vs developer-mode Claude Code)
- Existing MCP server is read-only for element.db; testing server executes arbitrary test commands
- Can be enabled/disabled independently

**MCP config for Claude Code (two servers):**
```json
{
  "mcpServers": {
    "element": {
      "command": "node",
      "args": ["mcp-server/dist/index.js", "<db-path>"]
    },
    "element-testing": {
      "command": "node",
      "args": ["testing-mcp-server/dist/index.js"]
    }
  }
}
```

**Stack for testing-mcp-server:**
- Same as existing MCP server: `@modelcontextprotocol/sdk`, TypeScript, esbuild bundler
- No `better-sqlite3` -- does not read the database
- Uses `child_process.spawn` to run test commands
- Parses JSON reporter output from vitest and cargo test

## Data Flow

### Test Execution Flow (via Testing MCP Server)

```
Claude Code
    |
    v
MCP tool: run_tests({ scope: "rust", filter: "models::task" })
    |
    v
testing-mcp-server/src/runner.ts
    |
    +--> spawn: cargo test models::task --message-format=json 2>&1
    |         OR
    +--> spawn: npx vitest run --reporter=json src/__tests__/calendar-today.test.ts
    |
    v
parser.ts: parse JSON output into structured result
    |
    v
Return MCP response: { passed: 5, failed: 1, failures: [...] }
```

### Lint/Test Gate Flow (Pre-Commit Hook)

```
Claude Code: Bash("git commit -m 'fix: ...'")
    |
    v
PreToolUse hook fires (matcher: Bash, if: "Bash(git commit*)")
    |
    v
npm run check:all
    |
    +--> biome check src/             (exit on failure)
    +--> cargo clippy -- -D warnings  (exit on failure)
    +--> vitest run                   (exit on failure)
    +--> cargo test                   (exit on failure)
    |
    v
Exit 0 = commit proceeds
Exit 2 = commit blocked, reason sent to Claude
```

### Error Logger Flow

```
React component throws/logs error
    |
    v
console.error(...) -> errorLogger intercept
    |                        |
    v                        v
Browser console          invoke("log_frontend_error")
                             |
                             v
                         Rust handler appends to
                         $APP_DATA/errors.log
                             |
                             v
                         Claude Code reads via:
                         cat $APP_DATA/errors.log
```

## Testing MCP Server: Tool Design

| Tool | Purpose | Inputs | Output |
|------|---------|--------|--------|
| `discover_tests` | List all test files and test names | `{ scope: "ts" \| "rust" \| "all" }` | Array of test file paths with test function names |
| `run_tests` | Execute tests, return structured results | `{ scope, filter?, file? }` | `{ passed, failed, skipped, failures: [{ name, error, file, line }] }` |
| `run_single_test` | Execute one specific test | `{ scope, testName }` | Same as run_tests but for one test |
| `read_results` | Read last test run results from cache | `{ scope }` | Cached results from last run_tests call |
| `check_coverage` | Run tests with coverage, report gaps | `{ scope, threshold? }` | `{ totalPct, files: [{ path, linePct, uncoveredLines }] }` |
| `generate_stubs` | Generate test file stubs for untested code | `{ filePath }` | Generated test file content as string |
| `suggest_tests` | Analyze a file and suggest what to test | `{ filePath }` | Array of suggested test descriptions |

**Execution strategy:** All test commands are spawned as child processes. The MCP server never imports or requires the code under test -- it shells out to `vitest` and `cargo test` with JSON reporters and parses the output.

## Build Order (Dependency-Aware)

The features have dependencies that dictate build order:

```
Phase 1: Linting
  biome.json tightening (no deps)
  clippy + rustfmt config (no deps)
  package.json unified scripts (no deps)
  -> Everything after this can assume lint passes

Phase 2: Test Infrastructure
  Vitest expansion (depends on: lint passing)
  cargo test expansion (depends on: lint passing)
  Coverage config (depends on: tests existing)
  -> Testing MCP server needs tests to exist

Phase 3: Error Logger
  Frontend interceptor (depends on: lint for code quality)
  Rust IPC command (depends on: lint + test for the command itself)
  -> Independent of testing MCP server

Phase 4: Claude Code Hooks
  PostToolUse auto-format (depends on: Biome config finalized)
  PreToolUse pre-commit gate (depends on: lint + test scripts working)
  -> Must come after lint and test infra are proven

Phase 5: Testing MCP Server
  Server scaffold (depends on: test commands working)
  Tool implementations (depends on: tests existing to discover/run)
  Integration with Claude Code config (depends on: hooks pattern established)
  -> Last because it wraps everything else
```

**Rationale:** Linting first because every subsequent phase benefits from lint enforcement. Tests second because the pre-commit hook needs tests to gate on. Error logger is independent but benefits from lint/test infra. Hooks come after the tools they invoke are proven. Testing MCP server is last because it is a wrapper around the entire test/lint ecosystem.

## Anti-Patterns

### Anti-Pattern 1: Adding ESLint + Prettier Alongside Biome

**What people do:** Install ESLint and Prettier because the plan says to, despite Biome already being configured
**Why it is wrong:** Three competing tools for the same job. Config conflicts, slower CI, confusing for contributors. Biome already handles both linting and formatting.
**Do this instead:** Tighten Biome's existing config. It covers everything ESLint+Prettier would, at 100x the speed.

### Anti-Pattern 2: Testing React Components for This Milestone

**What people do:** Write RTL component tests because testing libraries are installed
**Why it is wrong:** PROJECT.md explicitly scopes this to "backend test suite" for TS utilities and Rust. Frontend verification is via screenshots + feedback. Component tests are fragile for a rapidly evolving UI.
**Do this instead:** Test pure functions, hooks with mockIPC, and Zustand store logic. Leave component rendering tests for a future milestone.

### Anti-Pattern 3: Merging Testing MCP into Existing MCP Server

**What people do:** Add test tools to `mcp-server/src/tools/` alongside project and calendar tools
**Why it is wrong:** The existing MCP server is scoped to element.db read/write for the agent orchestrator. Testing tools spawn processes, read filesystem, and have completely different security implications.
**Do this instead:** Separate `testing-mcp-server/` directory. Same SDK, same patterns, different process, different concerns.

### Anti-Pattern 4: Using tauri-plugin-log for Error Logger

**What people do:** Install `tauri-plugin-log` for the console.error interceptor
**Why it is wrong:** Over-engineered for this use case. The plugin is designed for structured application logging with targets, levels, and rotation. The error logger is a simple append-to-file for Claude Code to read. Adding a plugin means modifying Cargo.toml, capabilities, and plugin initialization.
**Do this instead:** A single Tauri command (`log_frontend_error`) that appends to a file. 20 lines of Rust, no new dependencies.

### Anti-Pattern 5: Agent Hooks for Pre-Commit Gate

**What people do:** Use `type: "agent"` hooks that spawn a subagent to decide whether to block a commit
**Why it is wrong:** Deterministic checks (lint passes? tests pass?) should use deterministic tools. Agent hooks add latency (up to 60s), cost API tokens, and can produce inconsistent results.
**Do this instead:** Use `type: "command"` hooks that run the lint/test scripts directly. Exit 0 = pass, exit 2 = block. No LLM needed.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend errorLogger -> Rust | Tauri IPC `invoke("log_frontend_error")` | Fire-and-forget, never throws |
| Claude Code -> Testing MCP | stdio MCP protocol | Same pattern as existing element-mcp |
| Claude Code hooks -> lint/test | Shell commands (child process) | Exit codes determine allow/block |
| Testing MCP -> vitest/cargo | `child_process.spawn` with JSON reporters | Parse structured output, never import test code |
| Error log -> Claude Code | File read (`cat .element/errors.log`) | Plain text, append-only, Claude reads directly |

### External Tool Versions

| Tool | Current Version | Notes |
|------|----------------|-------|
| Biome | ^2.4.7 | Already installed, check for 2.5+ features |
| Vitest | ^4.1.0 | JSON reporter available, coverage via `@vitest/coverage-v8` |
| Rust/Cargo | edition 2021 | `cargo test --message-format=json` for structured output |
| @modelcontextprotocol/sdk | ^1.28.0 | Same version as existing MCP server |
| Claude Code | v2.1.85+ required for `if` field in hooks | Verify user's installed version |

## Sources

- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- HIGH confidence, official documentation
- [Tauri 2 Mock APIs](https://v2.tauri.app/develop/tests/mocking/) -- HIGH confidence, official Tauri docs
- [Tauri 2 Logging Plugin](https://v2.tauri.app/plugin/logging/) -- HIGH confidence (referenced to decide against using it)
- [Demystifying Claude Code Hooks](https://www.brethorsting.com/blog/2025/08/demystifying-claude-code-hooks/) -- MEDIUM confidence, community blog
- [Claude Code Hooks Reference](https://www.pixelmojo.io/blogs/claude-code-hooks-production-quality-ci-cd-patterns) -- MEDIUM confidence, community reference
- [Vitest Tauri Testing Setup](https://yonatankra.com/how-to-setup-vitest-in-a-tauri-project/) -- MEDIUM confidence, community blog

---
*Architecture research for: Element v1.7 Test Foundations*
*Researched: 2026-04-05*
