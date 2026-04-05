# Stack Research

**Domain:** Code quality infrastructure for Tauri 2.x desktop app (TS/React + Rust)
**Researched:** 2026-04-05
**Confidence:** HIGH

## Current State Assessment

Before recommending additions, here is what already exists and should NOT be re-added:

| Tool | Version | Status | Notes |
|------|---------|--------|-------|
| Biome | 2.4.7 | Installed, configured | biome.json with recommended rules, lint + format scripts in package.json |
| Vitest | ^4.1.0 | Installed, configured | vite.config.ts has test block, jsdom env, setup file exists |
| @testing-library/react | ^16.3.2 | Installed | setup.ts mocks Tauri invoke/listen |
| @testing-library/jest-dom | ^6.9.1 | Installed | Imported in setup.ts |
| @testing-library/user-event | ^14.6.1 | Installed | Available for interaction tests |
| jsdom | ^29.0.0 | Installed | Test environment configured |
| clippy | 0.1.94 | System-installed | Ships with rustc 1.94.0 |
| rustfmt | 1.8.0-stable | System-installed | Ships with rustc 1.94.0 |
| tempfile | ^3 | In Cargo.toml dev-deps | For Rust test temp directories |
| @modelcontextprotocol/sdk | ^1.28.0 | In mcp-server/ | Existing MCP server pattern to follow |

**Key finding:** The project description says "ESLint + Prettier for TypeScript/React (greenfield)" but the codebase already has Biome 2.4.7 doing both linting AND formatting. Biome replaces ESLint + Prettier entirely. Do NOT add ESLint or Prettier -- Biome is already installed, configured, and superior for this codebase (10-25x faster, single tool, single config).

**Key finding:** Vitest is already installed at v4.1.0 with 25+ test files across stores, hooks, and components. The test infrastructure exists but needs coverage configuration and enforcement scripts.

**Key finding:** clippy and rustfmt are already available via the Rust 1.94.0 toolchain. The work is configuration (clippy.toml, rustfmt.toml) and enforcement (hooks), not installation.

**Key finding:** 38 Rust source files already contain `#[cfg(test)]` modules with existing tests. The `test_fixtures/` directory has manifests and calendar response fixtures. cargo test infrastructure is live, not greenfield.

## Recommended Stack

### Core Technologies -- Already Installed, Configure Only

| Technology | Version | Purpose | Action Required |
|------------|---------|---------|-----------------|
| Biome | 2.4.7 (installed) | TS/React linting + formatting | Update biome.json schema from 1.9.4 to 2.x, add React-specific rules, add `check` command combining lint+format |
| Vitest | 4.1.0 (installed) | TS unit tests | Add coverage configuration (v8 provider), add coverage scripts to package.json |
| clippy | 0.1.94 (installed) | Rust linting | Create clippy.toml with project-specific allows/denies, add lint script |
| rustfmt | 1.8.0 (installed) | Rust formatting | Create rustfmt.toml with project style preferences |

### New Technologies to Add

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @vitest/coverage-v8 | ^4.1.0 | TS code coverage | Native V8 coverage -- zero instrumentation overhead, accurate line/branch coverage. Required for coverage gap analysis in the testing MCP server. Must match vitest major version. |
| @modelcontextprotocol/sdk | ^1.29.0 | Testing MCP server | Latest stable 1.x. Already used in existing mcp-server/; follow same pattern. v2 expected but v1.x is production-recommended and will receive updates for 6+ months after v2 ships. |
| better-sqlite3 | ^11.0.0 | Testing MCP DB access | Already used in existing MCP server for reading Element's SQLite DB. Testing MCP may need same access pattern. |
| zod | ^3.23.0 | Testing MCP input validation | Already used in existing MCP server. Keep consistent for tool input schemas. |
| tsx | ^4.0.0 | Testing MCP dev runner | Already used in existing MCP server. TypeScript execution without build step for dev. |
| esbuild | ^0.25.0 | Testing MCP bundling | Already used in existing MCP server. Single-file bundle for sidecar distribution. |

### Configuration Files to Create

| File | Purpose | Notes |
|------|---------|-------|
| `.claude/settings.json` | Claude Code hooks (pre-commit gate, post-edit test/format) | Project-scoped, committable to repo |
| `.claude/hooks/pre-commit-gate.sh` | Lint + test enforcement before commits | PreToolUse hook, exit 2 to block, stderr feedback to Claude |
| `.claude/hooks/test-on-save.sh` | Run related tests after file edits | PostToolUse on Edit/Write, pattern-match to find related tests |
| `src-tauri/clippy.toml` | Clippy configuration | Project-specific lint allows/denies |
| `src-tauri/rustfmt.toml` | Rust formatting rules | Consistent style enforcement |
| `testing-mcp-server/` | New MCP server for test lifecycle | Parallel to existing mcp-server/, same build pattern |
| `src/lib/error-logger.ts` | Console.error interceptor | Writes to log file via Tauri fs plugin |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| jq (system) | JSON parsing in hook scripts | Required for Claude Code hooks to parse tool_input from stdin. Install via `brew install jq`. |

## Installation

```bash
# New TS dev dependencies (root project)
npm install -D @vitest/coverage-v8

# Testing MCP server (new directory)
mkdir testing-mcp-server && cd testing-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk better-sqlite3 zod
npm install -D @types/better-sqlite3 esbuild tsx typescript vitest

# Rust -- no install needed, configure only
# clippy and rustfmt ship with the toolchain

# System tools
brew install jq  # if not already installed
```

## Configuration Details

### Biome 2.x Schema Update

The existing biome.json references schema 1.9.4 but Biome 2.4.7 is installed. Update to v2 schema for access to type-aware linting and new rules:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.7/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "warn",
        "useExhaustiveDependencies": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  }
}
```

### Vitest Coverage Configuration

Add to the existing `test` block in `vite.config.ts`:

```typescript
test: {
  environment: "jsdom",
  globals: true,
  setupFiles: ["src/__tests__/setup.ts"],
  coverage: {
    provider: "v8",
    reporter: ["text", "json", "json-summary"],
    reportsDirectory: "./coverage",
    include: ["src/lib/**", "src/utils/**", "src/stores/**", "src/hooks/**"],
    exclude: ["src/components/**", "**/*.test.*", "src/__tests__/**"],
  },
},
```

Note: `src/components/**` is excluded from coverage because the project explicitly does NOT do frontend component tests -- UI is verified via screenshots + feedback loops. Existing component test files (25+ .test.tsx) remain runnable but coverage is only tracked for utilities, stores, and hooks.

### Claude Code Hooks Configuration

Create `.claude/settings.json`:

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
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pre-commit-gate.sh"
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
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/test-on-save.sh"
          }
        ]
      }
    ]
  }
}
```

**How it works:**
- `PreToolUse` with `if: "Bash(git commit*)"` -- intercepts only git commit commands (not all Bash), runs lint + test checks. Exit 2 blocks the commit and feeds stderr reason back to Claude so it can fix issues before retrying.
- `PostToolUse` with `matcher: "Edit|Write"` -- fires after any file edit. The hook script reads `tool_input.file_path` from stdin JSON (via jq), determines if it is a .ts/.tsx/.rs file, finds related test files, and runs them. Exit 0 always (informational -- test failures go to stdout for Claude to read, not blocking).

**Hook script pattern (pre-commit-gate.sh):**
```bash
#!/bin/bash
# Run TS lint + test, Rust clippy + test
# Exit 2 with stderr message to block commit on failure
cd "$CLAUDE_PROJECT_DIR"
npx biome check src/ 2>&1 || { echo "Biome lint failed" >&2; exit 2; }
npx vitest run --reporter=verbose 2>&1 || { echo "Vitest failed" >&2; exit 2; }
cd src-tauri && cargo clippy -- -D warnings 2>&1 || { echo "Clippy failed" >&2; exit 2; }
cargo test 2>&1 || { echo "Cargo test failed" >&2; exit 2; }
exit 0
```

**Hook script pattern (test-on-save.sh):**
```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
# Pattern-match to find and run related tests
# .ts/.tsx files -> vitest run --reporter=verbose <related-test>
# .rs files -> cargo test <module_name>
# Output goes to stdout for Claude to read as context
```

### Error Logger Architecture

The console.error interceptor writes to a log file that Claude Code can read with the Read tool. No new dependencies needed -- `tauri-plugin-fs` is already in Cargo.toml.

```typescript
// src/lib/error-logger.ts
// Intercepts console.error, console.warn
// Writes structured JSON lines to: $APP_DATA/logs/frontend-errors.log  
// Uses @tauri-apps/plugin-fs for file writes (already a dependency)
// Rotates on app start (keeps last session only)
// Format per line: { timestamp, level, message, stack?, component? }
```

Integration point: call `initErrorLogger()` in app entry point (main.tsx or App.tsx) before React renders. The interceptor wraps `console.error` and `console.warn`, calling the original then appending to the log file.

### Testing MCP Server Architecture

The testing MCP server is a NEW sidecar process (separate from the existing element-mcp-server) providing tools for test lifecycle management:

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `discover_tests` | Find all test files and test names | `{ language: "ts"\|"rust", path?: string }` | Array of test files with test names |
| `run_tests` | Execute tests with optional filter | `{ language, filter?, file?, coverage?: bool }` | Pass/fail results, duration, output |
| `read_results` | Get last test run results | `{ language, format?: "summary"\|"detail" }` | Structured results with failures |
| `generate_stub` | Create test file skeleton for source file | `{ source_file: string }` | Generated test file content |
| `check_coverage` | Analyze coverage gaps | `{ language, threshold?: number }` | Uncovered lines/functions by file |
| `suggest_tests` | Recommend what to test for changed files | `{ files: string[] }` | Prioritized test suggestions |

Stack mirrors existing mcp-server: TypeScript, @modelcontextprotocol/sdk, better-sqlite3, zod, esbuild bundling, stdio transport.

**Why separate from element-mcp-server:** Different concerns (app entities vs. test lifecycle), different update cadences, keeps each server focused. Claude Code can have both MCP servers configured simultaneously.

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Biome (keep) | ESLint + Prettier | Already installed and working. Biome 2.x is 10-25x faster, single config file, covers 85%+ of typescript-eslint rules. Adding ESLint would mean two competing linters. |
| @vitest/coverage-v8 | @vitest/coverage-istanbul | v8 is faster (no instrumentation pass), native to Node, Vitest default. Istanbul only needed for edge cases like decorators. |
| Separate testing-mcp-server | Extend existing mcp-server | Separation of concerns -- element-mcp manages app entities, testing-mcp manages test lifecycle. Different update cadences. |
| jq in hook scripts | Node.js JSON parsing in hooks | jq is simpler for one-liners in bash hooks. Node scripts would work but add complexity for simple field extraction. |
| Claude Code hooks | husky + lint-staged | Claude Code is the primary committer via terminal. Its hook system has direct feedback (exit 2 + stderr goes back to the model). husky runs in a git hook subprocess with no feedback channel to the AI. |
| Console.error log file | Sentry / error boundary service | Local-first desktop app. A log file Claude Code reads with the Read tool is simpler and more useful than cloud error tracking. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ESLint | Biome 2.4.7 already installed, covers same ground 10-25x faster | Biome (already configured) |
| Prettier | Biome handles formatting | Biome format (already configured) |
| Jest | Vitest 4.1.0 already installed with Vite integration | Vitest (already configured) |
| React Testing Library (for NEW component tests) | Project explicitly excludes new component tests -- UI verified via screenshots + feedback | Vitest for utility/store/hook tests only. Existing RTL-based component tests can remain. |
| husky / lint-staged | Claude Code hooks replace traditional git hooks -- Claude is the primary committer and hooks feed errors back to the model | Claude Code PreToolUse hooks with `if: "Bash(git commit*)"` |
| tarpaulin (Rust coverage) | Less accurate than cargo-llvm-cov, slower | cargo-llvm-cov if Rust coverage is needed later (not in this milestone) |
| Playwright / Cypress | No E2E testing planned -- Tauri WebView testing is complex and low ROI vs. screenshot verification | Manual testing + Claude Code screenshot review |
| cargo-nextest | Nice-to-have but not required -- standard `cargo test` handles the existing 38-file test suite fine | Default `cargo test` |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @vitest/coverage-v8@^4.1.0 | vitest@^4.1.0 | MUST match vitest major version exactly |
| Biome 2.4.7 | TypeScript 5.9.x | Full support for latest TS syntax |
| @modelcontextprotocol/sdk@^1.29.0 | Node 18+ | Testing MCP server needs Node 18+ |
| clippy 0.1.94 | Rust 1.94.0 | Ships together, always compatible |
| better-sqlite3@^11.0.0 | Node 18+ | Native addon, needs matching Node ABI |
| tauri-plugin-fs@2 | Tauri 2.x | Already in Cargo.toml, used by error logger |

## Package.json Script Updates

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:mcp": "cd mcp-server && npm run build",
    "build:test-mcp": "cd testing-mcp-server && npm run build",
    "preview": "vite preview",
    "tauri": "tauri",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:rust": "cd src-tauri && cargo test",
    "test:all": "npm run test && npm run test:rust",
    "lint": "biome check src/",
    "lint:rust": "cd src-tauri && cargo clippy -- -D warnings",
    "lint:all": "npm run lint && npm run lint:rust",
    "format": "biome format --write src/",
    "format:rust": "cd src-tauri && cargo fmt",
    "format:all": "npm run format && npm run format:rust",
    "check": "npm run lint:all && npm run test:all"
  }
}
```

## Sources

- [Biome v2 vs ESLint + tsc comparison (Mar 2026)](https://medium.com/@ghazikhan205/biome-v2-vs-eslint-tsc-should-you-replace-your-toolchain-b00b5b7934b3) -- Biome 2.x feature parity and performance benchmarks (MEDIUM confidence)
- [Claude Code Hooks Guide (official)](https://code.claude.com/docs/en/hooks-guide) -- Complete hook event types, matchers, exit codes, `if` field, JSON I/O (HIGH confidence)
- [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) -- Latest version 1.29.0, v2 roadmap (HIGH confidence)
- [Vitest Projects Guide (official)](https://vitest.dev/guide/projects) -- Workspace deprecated in 3.2, replaced with projects config (HIGH confidence)
- [Biome vs ESLint vs Oxlint 2026](https://www.pkgpulse.com/blog/biome-vs-eslint-vs-oxlint-2026) -- Ecosystem comparison (MEDIUM confidence)
- Existing codebase: package.json, Cargo.toml, biome.json, vite.config.ts, mcp-server/ -- Direct inspection (HIGH confidence)
- System toolchain: rustc 1.94.0, clippy 0.1.94, rustfmt 1.8.0 -- Direct version check (HIGH confidence)

---
*Stack research for: v1.7 Test Foundations -- code quality infrastructure*
*Researched: 2026-04-05*
