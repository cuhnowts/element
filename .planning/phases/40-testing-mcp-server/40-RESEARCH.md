# Phase 40: Testing MCP Server - Research

**Researched:** 2026-04-05
**Domain:** MCP server development, test CLI output parsing, secure child process execution
**Confidence:** HIGH

## Summary

This phase builds a standalone MCP server (`testing-mcp-server/`) that exposes three tools -- `discover_tests`, `run_tests`, and `check_coverage_gaps` -- enabling Claude Code to act as a self-directed test-writing agent. The project already has a fully working MCP server (`mcp-server/`) that provides the exact architectural template: `@modelcontextprotocol/sdk` 1.28+, stdio transport, esbuild bundling, tool-file organization. The new server has no database dependency, replacing it with `child_process.spawn` for invoking `vitest` and `cargo test` commands.

The critical technical challenges are: (1) parsing Vitest and cargo test CLI output into structured per-test results, (2) parsing `@vitest/coverage-v8` JSON reports for gap analysis, and (3) ensuring all command execution uses `spawn` with argument arrays (never `exec` or shell string interpolation) to prevent injection attacks per TMCP-04.

**Primary recommendation:** Clone the `mcp-server/` architecture exactly (package.json, build.ts, index.ts structure), replace database handlers with three tool handlers that use `child_process.spawn` to invoke test runners and parse their structured output (Vitest JSON reporter, cargo test line-based output). Accept `projectRoot` as a server argument for project-agnostic operation.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-03: Stdio transport (same as element-mcp)
- D-09: Per-test results -- each test gets its own pass/fail/error entry with name, file, duration, and error message
- D-10: Full error output -- stack traces and assertion diffs included per failed test
- D-11: Flexible targeting -- accept file path, test name pattern, or runner as params

### Claude's Discretion
- D-01: Separate server vs extending element-mcp (recommendation: separate `testing-mcp-server/` package)
- D-02: Generic (project-agnostic) vs Element-specific (recommendation: generic, configured via args/env)
- D-04: Discovery approach (recommendation: CLI output parsing with file scanning fallback)
- D-05: Metadata level (recommendation: rich metadata -- file, suite/module, test name, line number)
- D-06: Filtering (recommendation: support optional `runner` and `file` params)
- D-07: Coverage tools (recommendation: start with `@vitest/coverage-v8` JSON parsing)
- D-08: Gap definition (recommendation: uncovered files + uncovered functions within partially-tested files)

### Deferred Ideas (OUT OF SCOPE)
- TMCP-10: Test stub generation from coverage gap analysis
- TMCP-11: "Suggest what to test next" AI-powered recommendation

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TMCP-01 | Testing MCP server discovers available test suites (Vitest + cargo test) and lists test files/modules | `vitest list` outputs test names; `cargo test -- --list` outputs `module::test_name: test` format. Both verified on this project. |
| TMCP-02 | Testing MCP server runs specified tests and returns structured results (pass/fail/error per test) | Vitest `--reporter=json` produces per-test JSON with assertionResults; cargo test produces `test name ... ok/FAILED` lines parseable with regex. |
| TMCP-03 | Testing MCP server reads coverage reports and identifies uncovered files/functions | `@vitest/coverage-v8` with `reporter: ['json']` writes `coverage/coverage-final.json` in Istanbul format with per-file function/statement maps. |
| TMCP-04 | Testing MCP server uses argument arrays for command execution (no shell string interpolation) | Node.js `child_process.spawn(cmd, args)` with `shell: false` (default) prevents injection. Never use `exec()` or `spawn` with `shell: true`. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | ^1.28.0 | MCP server framework | Already used in element-mcp, proven pattern |
| `zod` | ^3.23.0 | Input schema validation | Already used in element-mcp for schema definition |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `esbuild` | ^0.25.0 | Bundle to single dist/index.js | Build step, matches element-mcp pattern |
| `tsx` | ^4.0.0 | Dev-mode execution | Development only |
| `typescript` | ^5.5.0 | Type checking | Development only |
| `vitest` | ^4.1.0 | Testing the MCP server itself | Dev dependency for server tests |

### No New Dependencies Needed

The testing MCP server has zero runtime dependencies beyond `@modelcontextprotocol/sdk` and `zod`. It uses Node.js built-in `child_process.spawn` for command execution and built-in `fs` for reading coverage reports. No `better-sqlite3` (no database access needed).

**Installation:**
```bash
# In testing-mcp-server/ directory
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D esbuild tsx typescript vitest
```

## Architecture Patterns

### Recommended Project Structure
```
testing-mcp-server/
  package.json          # type: "module", scripts: build/dev/test
  tsconfig.json         # Node18 target, ESM
  build.ts              # esbuild bundler (clone from mcp-server/)
  src/
    index.ts            # Server setup, tool registration, dispatch
    runner.ts           # Shared spawn helper with security constraints
    tools/
      discover-tests.ts # discover_tests handler
      run-tests.ts      # run_tests handler
      coverage-gaps.ts  # check_coverage_gaps handler
    parsers/
      vitest-parser.ts  # Parse vitest JSON output
      cargo-parser.ts   # Parse cargo test text output
      coverage-parser.ts # Parse Istanbul JSON coverage
    __tests__/
      discover-tests.test.ts
      run-tests.test.ts
      coverage-gaps.test.ts
      vitest-parser.test.ts
      cargo-parser.test.ts
```

### Pattern 1: Secure Command Execution (TMCP-04)
**What:** All test commands executed via `child_process.spawn` with argument arrays, never shell interpolation
**When to use:** Every invocation of vitest or cargo test
**Example:**
```typescript
import { spawn } from "node:child_process";

interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number = 120_000
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    // CRITICAL: shell: false is the default, but be explicit
    const proc = spawn(command, args, {
      cwd,
      shell: false,          // NEVER set to true
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    proc.stdout.on("data", (d) => chunks.push(d));
    proc.stderr.on("data", (d) => errChunks.push(d));

    proc.on("close", (code) => {
      resolve({
        stdout: Buffer.concat(chunks).toString("utf-8"),
        stderr: Buffer.concat(errChunks).toString("utf-8"),
        exitCode: code ?? 1,
      });
    });

    proc.on("error", reject);
  });
}
```

### Pattern 2: Tool Handler (matching element-mcp)
**What:** Each tool is a function that returns MCP-formatted `{ content: [{ type: "text", text: string }] }`
**When to use:** All three tool handlers
**Example:**
```typescript
export async function handleDiscoverTests(
  projectRoot: string,
  args: { runner?: "vitest" | "cargo" | "all"; file?: string }
) {
  const results: TestEntry[] = [];

  if (args.runner !== "cargo") {
    const vitestTests = await discoverVitestTests(projectRoot, args.file);
    results.push(...vitestTests);
  }
  if (args.runner !== "vitest") {
    const cargoTests = await discoverCargoTests(projectRoot);
    results.push(...cargoTests);
  }

  return {
    content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
  };
}
```

### Pattern 3: Server Startup with Project Root
**What:** Accept project root as CLI arg or env var for project-agnostic operation
**Example:**
```typescript
const projectRoot = process.argv[2] || process.env.PROJECT_ROOT || process.cwd();

if (!existsSync(projectRoot)) {
  console.error(`Project root does not exist: ${projectRoot}`);
  process.exit(1);
}
```

### Anti-Patterns to Avoid
- **Using `exec()` or `execSync()`:** These invoke a shell, enabling injection. Always use `spawn()` with argument arrays.
- **String-interpolating user input into commands:** `spawn("vitest", ["run", userInput])` is safe; `` exec(`vitest run ${userInput}`) `` is not.
- **Parsing human-readable output when structured output exists:** Vitest has `--reporter=json`; always prefer it over parsing colored terminal output.
- **Blocking on large test suites without timeout:** Always set a timeout on spawn to prevent hanging.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol handling | Custom JSON-RPC | `@modelcontextprotocol/sdk` | Protocol compliance, transport handling, error formatting |
| Schema validation | Manual param checking | zod (via SDK inputSchema) | Consistent with element-mcp, type inference |
| Vitest test output parsing | Regex on terminal output | `--reporter=json` flag | Vitest provides structured JSON with assertionResults per test |
| Bundle for distribution | Manual build scripts | esbuild (clone build.ts) | Proven pattern from element-mcp, single-file output |

## Common Pitfalls

### Pitfall 1: Vitest JSON Reporter Outputs to Stdout Mixed with Console Logs
**What goes wrong:** Tests that use `console.log` mix their output with the JSON reporter output on stdout, corrupting JSON parsing.
**Why it happens:** Vitest JSON reporter writes to stdout; test code also writes to stdout.
**How to avoid:** Use `--reporter=json --outputFile=<temp>` to write JSON to a file instead of stdout, then read the file. Alternatively use `--silent` flag.
**Warning signs:** JSON.parse errors on vitest output.

### Pitfall 2: Cargo Test Stderr vs Stdout Split
**What goes wrong:** `cargo test` sends compilation warnings to stderr and test results to stdout, but compilation errors also go to stderr.
**Why it happens:** Cargo separates compiler output (stderr) from test runner output (stdout).
**How to avoid:** Capture both streams. Parse stdout for test results. Check exit code first -- non-zero with no test output means compilation failure, report that distinctly.
**Warning signs:** Empty test results with non-zero exit code.

### Pitfall 3: Shell Injection via Test Name Patterns
**What goes wrong:** If a test name pattern like `"; rm -rf /"` is passed and command is constructed via string concatenation, arbitrary commands execute.
**Why it happens:** Using `exec()` or `spawn` with `shell: true`.
**How to avoid:** Always use `spawn(cmd, [...args])` with default `shell: false`. The pattern is passed as an array element, never interpolated into a shell string.
**Warning signs:** Any use of template literals or string concatenation to build command strings.

### Pitfall 4: Coverage Report Not Found
**What goes wrong:** `check_coverage_gaps` fails because no coverage report exists (tests haven't been run with `--coverage`).
**Why it happens:** Coverage reports are generated on-demand, not always present.
**How to avoid:** Check for the coverage JSON file first. If missing, return a clear error message saying "Run tests with --coverage first" rather than throwing. Optionally, the tool could run `vitest run --coverage` itself.
**Warning signs:** ENOENT errors on coverage file paths.

### Pitfall 5: Vitest List Fails on Import Errors
**What goes wrong:** `vitest list` tries to resolve imports and fails if dependencies are missing (as observed with `better-sqlite3` in worktree MCP tests).
**Why it happens:** Vitest resolves the full module graph even for listing.
**How to avoid:** Handle non-zero exit codes from `vitest list` gracefully -- return partial results if available, or fall back to file-system scanning (`glob` for `*.test.ts`, `*.spec.ts`).
**Warning signs:** Exit code 1 from vitest list with import resolution errors in stderr.

## Code Examples

### Vitest JSON Reporter Output Structure (verified on this project)
```typescript
// Output of: vitest run --reporter=json
interface VitestJsonOutput {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults: Array<{
    name: string;           // Absolute file path
    status: "passed" | "failed";
    startTime: number;
    endTime: number;
    assertionResults: Array<{
      ancestorTitles: string[];     // describe() nesting
      fullName: string;             // Full test name
      status: "passed" | "failed" | "pending" | "todo";
      title: string;                // it() title
      duration: number;             // ms
      failureMessages: string[];    // Stack traces + diffs
    }>;
  }>;
}
```

### Cargo Test Output Format (verified on this project)
```
# cargo test -- --list output:
commands::file_explorer_commands::tests::test_list_directory_hides_gitignored_and_excludes: test
commands::shell_commands::tests::test_is_command_allowed_defaults: test

# cargo test run output:
running 284 tests
test commands::manifest_commands::briefing_json_tests::test_strip_json_fences_clean_json ... ok
test commands::file_explorer_commands::tests::test_list_directory_invalid_path_returns_error ... ok
test some_module::tests::test_that_fails ... FAILED

failures:
---- some_module::tests::test_that_fails stdout ----
thread 'some_module::tests::test_that_fails' panicked at 'assertion failed: ...'

test result: FAILED. 283 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out
```

### Cargo Test Result Parsing
```typescript
interface CargoTestResult {
  name: string;
  module: string;
  status: "passed" | "failed" | "ignored";
  duration?: number;
  error?: string;
}

function parseCargoTestOutput(stdout: string, stderr: string): CargoTestResult[] {
  const results: CargoTestResult[] = [];
  const testLineRegex = /^test (.+) \.\.\. (ok|FAILED|ignored)$/gm;

  let match: RegExpExecArray | null;
  while ((match = testLineRegex.exec(stdout)) !== null) {
    const fullName = match[1];
    const status = match[2] === "ok" ? "passed"
                 : match[2] === "FAILED" ? "failed"
                 : "ignored";

    const parts = fullName.split("::");
    const testName = parts[parts.length - 1];
    const module = parts.slice(0, -1).join("::");

    results.push({ name: testName, module, status });
  }

  // Extract failure details from the "failures:" section
  if (stdout.includes("failures:")) {
    const failureSection = stdout.split("failures:")[1];
    const failureRegex = /---- (.+) stdout ----\n([\s\S]*?)(?=---- |test result:)/g;
    while ((match = failureRegex.exec(failureSection)) !== null) {
      const failedTest = results.find(
        (r) => `${r.module}::${r.name}` === match![1]
      );
      if (failedTest) {
        failedTest.error = match[2].trim();
      }
    }
  }

  return results;
}
```

### Istanbul Coverage JSON Structure (from @vitest/coverage-v8)
```typescript
// coverage/coverage-final.json structure
interface IstanbulCoverage {
  [filePath: string]: {
    path: string;
    statementMap: Record<string, { start: { line: number; column: number }; end: { line: number; column: number } }>;
    fnMap: Record<string, { name: string; decl: { start: { line: number }; end: { line: number } }; loc: { start: { line: number }; end: { line: number } } }>;
    branchMap: Record<string, { type: string; loc: { start: { line: number }; end: { line: number } } }>;
    s: Record<string, number>;  // statement hit counts
    f: Record<string, number>;  // function hit counts
    b: Record<string, number[]>; // branch hit counts
  };
}

// Gap detection: find functions with f[key] === 0
function findUncoveredFunctions(coverage: IstanbulCoverage): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  for (const [filePath, fileCov] of Object.entries(coverage)) {
    const uncoveredFns = Object.entries(fileCov.fnMap)
      .filter(([key]) => fileCov.f[key] === 0)
      .map(([, fn]) => fn.name);

    if (uncoveredFns.length > 0) {
      gaps.push({
        file: filePath,
        uncoveredFunctions: uncoveredFns,
        totalFunctions: Object.keys(fileCov.fnMap).length,
        coveredFunctions: Object.keys(fileCov.fnMap).length - uncoveredFns.length,
      });
    }
  }

  return gaps;
}
```

### MCP Tool Registration (matching element-mcp pattern)
```typescript
// Tool definitions for ListToolsRequestSchema handler
const TOOLS = [
  {
    name: "discover_tests",
    description: "Discover available test suites, files, and test names for Vitest and/or cargo test",
    inputSchema: {
      type: "object" as const,
      properties: {
        runner: {
          type: "string",
          enum: ["vitest", "cargo", "all"],
          description: "Which test runner to query (default: all)",
        },
        file: {
          type: "string",
          description: "Optional file path pattern to filter results",
        },
      },
    },
  },
  {
    name: "run_tests",
    description: "Run specified tests and return structured pass/fail/error results per test",
    inputSchema: {
      type: "object" as const,
      properties: {
        runner: {
          type: "string",
          enum: ["vitest", "cargo"],
          description: "Which test runner to use",
        },
        file: {
          type: "string",
          description: "Specific test file to run",
        },
        testName: {
          type: "string",
          description: "Test name pattern to filter (regex for vitest, substring for cargo)",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 120000)",
        },
      },
      required: ["runner"],
    },
  },
  {
    name: "check_coverage_gaps",
    description: "Read coverage reports and identify uncovered files and functions",
    inputSchema: {
      type: "object" as const,
      properties: {
        runner: {
          type: "string",
          enum: ["vitest"],
          description: "Coverage source (currently vitest only)",
        },
      },
    },
  },
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `child_process.exec()` | `child_process.spawn()` with arg arrays | Always preferred | Prevents shell injection (TMCP-04) |
| Custom MCP protocol | `@modelcontextprotocol/sdk` | 2024 | Standard protocol, transport handling |
| Regex parsing of colored output | `--reporter=json` for vitest | Vitest 1.0+ | Reliable structured data |
| Global vitest config only | `vitest list --config <path>` | Vitest 2.0+ | Explicit config targeting |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | MCP server runtime | Yes | v22.18.0 | -- |
| npm | Package management | Yes | (bundled with node) | -- |
| vitest | Test discovery/running (TS) | Yes | 4.1.0 | -- |
| cargo | Test discovery/running (Rust) | Yes | 1.94.0 | -- |
| esbuild | Build step | Yes | ^0.25.0 (in mcp-server) | -- |
| @vitest/coverage-v8 | Coverage gap analysis | Not yet | -- | Phase 37 installs it; tool returns "coverage not configured" |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:**
- `@vitest/coverage-v8` -- Phase 37 dependency. The `check_coverage_gaps` tool should handle its absence gracefully with a clear error message.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `testing-mcp-server/vitest.config.ts` (new -- Wave 0) |
| Quick run command | `cd testing-mcp-server && npx vitest run` |
| Full suite command | `cd testing-mcp-server && npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TMCP-01 | discover_tests returns structured test list for vitest and cargo | unit | `cd testing-mcp-server && npx vitest run src/__tests__/discover-tests.test.ts -x` | Wave 0 |
| TMCP-02 | run_tests returns per-test pass/fail/error with full error output | unit | `cd testing-mcp-server && npx vitest run src/__tests__/run-tests.test.ts -x` | Wave 0 |
| TMCP-03 | check_coverage_gaps returns uncovered files/functions | unit | `cd testing-mcp-server && npx vitest run src/__tests__/coverage-gaps.test.ts -x` | Wave 0 |
| TMCP-04 | All commands use spawn with arg arrays, never exec/shell | unit | `cd testing-mcp-server && npx vitest run src/__tests__/runner.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd testing-mcp-server && npx vitest run`
- **Per wave merge:** `cd testing-mcp-server && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `testing-mcp-server/vitest.config.ts` -- test framework config
- [ ] `testing-mcp-server/tsconfig.json` -- TypeScript config
- [ ] `testing-mcp-server/src/__tests__/discover-tests.test.ts` -- covers TMCP-01
- [ ] `testing-mcp-server/src/__tests__/run-tests.test.ts` -- covers TMCP-02
- [ ] `testing-mcp-server/src/__tests__/coverage-gaps.test.ts` -- covers TMCP-03
- [ ] `testing-mcp-server/src/__tests__/runner.test.ts` -- covers TMCP-04 (verify spawn, not exec)
- [ ] `testing-mcp-server/src/__tests__/vitest-parser.test.ts` -- parser unit tests
- [ ] `testing-mcp-server/src/__tests__/cargo-parser.test.ts` -- parser unit tests

**Testing strategy:** Parser tests use fixture strings (captured real output) -- no actual subprocess spawning needed. Tool handler tests can mock the runner module to verify correct argument construction without running real test suites.

## Open Questions

1. **Cargo test JSON output**
   - What we know: `cargo test -- --format json` appears to require nightly Rust or unstable flags. The project uses stable Rust 1.94.0.
   - What's unclear: Whether `cargo test -- -Z unstable-options --format=json` works on stable 1.94.
   - Recommendation: Use text parsing for cargo test output (the format is stable and simple). The regex approach is proven reliable. JSON format for cargo test is not worth a nightly dependency.

2. **Vitest list reliability**
   - What we know: `vitest list` can fail if imports cannot be resolved (observed with better-sqlite3 in worktree).
   - What's unclear: How common this is in practice for the main project tests.
   - Recommendation: Implement `vitest list --json` as primary, with graceful error handling that falls back to file-system glob scanning (`**/*.test.ts`, `**/*.spec.ts`) when vitest list fails.

3. **Coverage report path configuration**
   - What we know: Phase 37 will set up `@vitest/coverage-v8` with default config. Default output is `coverage/coverage-final.json`.
   - What's unclear: Whether Phase 37 will customize the output path.
   - Recommendation: Default to `coverage/coverage-final.json` relative to project root, but accept an optional `coveragePath` parameter in the tool.

## Sources

### Primary (HIGH confidence)
- `mcp-server/src/index.ts` -- Verified MCP server architecture pattern (tool registration, dispatch, stdio transport)
- `mcp-server/package.json` -- Verified dependency versions (@modelcontextprotocol/sdk ^1.28.0)
- `mcp-server/build.ts` -- Verified esbuild bundling pattern
- Vitest JSON output -- Verified by running `npx vitest run --reporter=json` on this project (464KB output captured)
- Cargo test output -- Verified by running `cargo test -- --list` and `cargo test` on this project (284 tests)

### Secondary (MEDIUM confidence)
- Istanbul coverage format -- Standard format used by v8-to-istanbul which powers @vitest/coverage-v8
- Node.js child_process.spawn security model -- Well-documented in Node.js official docs

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- directly cloning proven element-mcp patterns with verified dependencies
- Architecture: HIGH -- tool-file organization, esbuild bundling, stdio transport all verified in existing codebase
- Pitfalls: HIGH -- output format pitfalls verified by running actual commands on this project

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable domain -- MCP SDK, Vitest, cargo test are mature)
