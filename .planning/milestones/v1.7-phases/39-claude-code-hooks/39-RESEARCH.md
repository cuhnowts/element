# Phase 39: Claude Code Hooks - Research

**Researched:** 2026-04-05
**Domain:** Claude Code hooks configuration (.claude/settings.json)
**Confidence:** HIGH

## Summary

Claude Code hooks are user-defined commands configured in `.claude/settings.json` that execute automatically at specific lifecycle events. Phase 39 requires configuring three categories of hooks: (1) a pre-commit gate that blocks commits on lint/test failure, (2) a post-edit hook that runs related tests when Claude edits files, and (3) a pre-commit auto-formatter. All hooks invoke CLI tooling established by Phase 36-37 -- no new tooling is created.

The hooks system is well-documented with a clear JSON schema. The project has no existing `.claude/settings.json` so this is greenfield configuration. Claude Code v2.1.92 is installed (exceeds the v2.1.85+ minimum required for the `if` conditional field). All required CLI tools are available: Biome v2.4.7, rustfmt 1.8.0, clippy 0.1.94, vitest 4.1, and cargo test.

**Primary recommendation:** Create `.claude/settings.json` with hooks configuration and shell scripts in `.claude/hooks/` for pre-commit gating, test-on-save, and auto-formatting. Use exit code 2 to block commits on failure.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Pre-commit hook runs both lint AND tests -- `biome check` for TS, `clippy` for Rust, `vitest run` and `cargo test`. Block on any failure (exit code 2). Matches HOOK-01.
- **D-02:** Auto-format staged files in pre-commit -- run `biome format --write` on staged TS files and `rustfmt` on staged Rust files, then re-stage. Both stacks formatted in the same hook.
- **D-03:** Test-on-save is **blocking** -- Claude Code waits for results before continuing. Results must be visible per success criterion SC-2.
- **D-04:** Biome format runs **before commit only**, NOT after each edit. Pre-commit hook handles formatting.
- **D-05:** Both TypeScript (Biome) and Rust (rustfmt) formatting enforced in the same pre-commit hook.
- **D-06:** Env var bypass (`SKIP_HOOKS=1` or similar) available for emergencies when hooks themselves are broken.

### Claude's Discretion
- Lint severity threshold (errors-only vs errors+warnings)
- Error output formatting when commit is blocked
- Stack scoping in pre-commit (affected stack only vs always both)
- Test matching strategy (filename convention, run-all, etc.)
- Which hook events trigger test-on-save (Edit only, Edit+Write, etc.)
- TypeScript operation timeouts
- Timeout/hang behavior (kill+block vs kill+allow)
- Cargo build timeout is 300s per HOOK-04

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOOK-01 | Pre-commit hook blocks commits when lint or test failures are detected (exit code 2) | PreToolUse matcher on `Bash` with `if: "Bash(git commit*)"` or a dedicated pre-commit script using exit code 2. Hooks schema fully supports blocking via exit 2. |
| HOOK-02 | Test-on-save hook runs related tests when Claude Code edits a file | PostToolUse matcher on `Edit\|Write` triggers test runner script. Script can inspect `tool_input` stdin JSON for file path to determine which tests to run. |
| HOOK-03 | Auto-format hook runs Biome format on TypeScript files after edits | Pre-commit hook (per D-04) runs `biome format --write` on staged TS files. Not a post-edit hook -- formatting is commit-time only. |
| HOOK-04 | Hooks configured with appropriate timeouts (300s for cargo builds) | Hook schema supports `timeout` field in seconds per hook entry. Set 300 for Rust operations, shorter for TS. |
</phase_requirements>

## Standard Stack

No new libraries required. This phase creates configuration files only.

### Core Tools (Already Installed)
| Tool | Version | Purpose | Verified |
|------|---------|---------|----------|
| Claude Code | 2.1.92 | Hook runtime -- executes `.claude/settings.json` hooks | `claude --version` |
| Biome | 2.4.7 | Lint (`biome check`) and format (`biome format --write`) for TS | `npx biome --version` |
| rustfmt | 1.8.0-stable | Format Rust source files | `rustfmt --version` |
| clippy | 0.1.94 | Rust linting | `cargo clippy --version` |
| vitest | 4.1.0 | TypeScript test runner | `package.json` devDeps |
| cargo test | (rustc toolchain) | Rust test runner | `cargo test` |

### Files Created by This Phase
| File | Purpose |
|------|---------|
| `.claude/settings.json` | Hook configuration -- event matchers, commands, timeouts |
| `.claude/hooks/pre-commit.sh` | Pre-commit gate: lint, test, format, re-stage |
| `.claude/hooks/test-on-save.sh` | Post-edit test runner: determine and run related tests |

## Architecture Patterns

### Hook System Architecture

Claude Code hooks flow:
1. Claude Code triggers a lifecycle event (e.g., `PreToolUse` when about to run `Bash(git commit)`)
2. Hooks matching the event/matcher/if-condition are executed
3. Hook receives context as JSON on stdin (tool_name, tool_input, cwd, etc.)
4. Hook exits with code 0 (allow), 2 (block), or other (non-blocking error)
5. For exit 2, stderr is fed back to Claude as the error message

### Recommended File Structure
```
.claude/
  settings.json          # Hook configuration
  hooks/
    pre-commit.sh        # Lint + test + format gate
    test-on-save.sh      # Related test runner
```

### Pattern 1: Pre-Commit Gate via PreToolUse
**What:** Intercept `git commit` commands before they execute, run lint/test/format, block on failure.
**When to use:** HOOK-01, HOOK-03 (commit-time formatting per D-04)
**How it works:** PreToolUse hook with matcher `Bash` and `if: "Bash(git commit*)"` runs the pre-commit script. The script runs lint, tests, and formatting. Exit 2 blocks the commit; stderr tells Claude what failed.

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
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pre-commit.sh",
            "timeout": 300,
            "statusMessage": "Running pre-commit checks..."
          }
        ]
      }
    ]
  }
}
```

**Pre-commit script pattern:**
```bash
#!/usr/bin/env bash
set -euo pipefail

# Emergency bypass
if [ "${SKIP_HOOKS:-0}" = "1" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
ERRORS=""

# 1. Format staged TS files (D-02, D-04, D-05)
STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM -- '*.ts' '*.tsx' || true)
if [ -n "$STAGED_TS" ]; then
  echo "$STAGED_TS" | xargs npx biome format --write 2>/dev/null
  echo "$STAGED_TS" | xargs git add
fi

# Format staged Rust files (D-05)
STAGED_RS=$(git diff --cached --name-only --diff-filter=ACM -- '*.rs' || true)
if [ -n "$STAGED_RS" ]; then
  echo "$STAGED_RS" | xargs rustfmt 2>/dev/null
  echo "$STAGED_RS" | xargs git add
fi

# 2. Lint TS
if ! npx biome check src/ 2>&1; then
  ERRORS="${ERRORS}TypeScript lint failed (biome check)\n"
fi

# 3. Lint Rust
if ! cargo clippy --manifest-path "$PROJECT_DIR/src-tauri/Cargo.toml" -- -D warnings 2>&1; then
  ERRORS="${ERRORS}Rust lint failed (cargo clippy)\n"
fi

# 4. Test TS
if ! npx vitest run 2>&1; then
  ERRORS="${ERRORS}TypeScript tests failed (vitest run)\n"
fi

# 5. Test Rust
if ! cargo test --manifest-path "$PROJECT_DIR/src-tauri/Cargo.toml" 2>&1; then
  ERRORS="${ERRORS}Rust tests failed (cargo test)\n"
fi

if [ -n "$ERRORS" ]; then
  echo -e "Pre-commit blocked. Fix these issues:\n$ERRORS" >&2
  exit 2
fi

exit 0
```

### Pattern 2: Test-on-Save via PostToolUse
**What:** After Claude edits a file, run related tests automatically.
**When to use:** HOOK-02
**How it works:** PostToolUse hook with matcher `Edit|Write` triggers a test script. The script reads stdin JSON to get the edited file path, determines which test suite to run (vitest for TS, cargo test for Rust), and runs it. Blocking behavior per D-03 means the hook is synchronous (default).

```json
{
  "PostToolUse": [
    {
      "matcher": "Edit|Write",
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/test-on-save.sh",
          "timeout": 300,
          "statusMessage": "Running related tests..."
        }
      ]
    }
  ]
}
```

**Test-on-save script pattern:**
```bash
#!/usr/bin/env bash
set -euo pipefail

if [ "${SKIP_HOOKS:-0}" = "1" ]; then exit 0; fi

# Read stdin JSON to get file path
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

# For Edit tool, the field is "file_path"; for Write tool, also "file_path"
if [ -z "$FILE_PATH" ]; then
  exit 0  # No file path found, skip
fi

# Determine stack and run related tests
case "$FILE_PATH" in
  *.ts|*.tsx)
    npx vitest run --reporter=dot 2>&1 || true
    ;;
  *.rs)
    cargo test --manifest-path "${CLAUDE_PROJECT_DIR}/src-tauri/Cargo.toml" 2>&1 || true
    ;;
esac

# Always exit 0 -- test-on-save is informational, not blocking
# Results are visible in stdout which Claude Code displays
exit 0
```

**Important note on D-03 (blocking):** "Blocking" here means Claude Code waits for the hook to complete (synchronous, which is the default -- `async: false`). The hook itself should exit 0 so it does not block Claude from continuing work. The test results are visible because stdout/stderr from the command are displayed. If tests fail, Claude sees the failure output and can act on it.

### Pattern 3: Environment Variable Bypass
**What:** `SKIP_HOOKS=1` skips all hook logic for emergencies.
**How:** Each script checks `$SKIP_HOOKS` at the top and exits 0 immediately.

### Anti-Patterns to Avoid
- **Running format after every edit:** D-04 explicitly says formatting is pre-commit only. Do NOT add a PostToolUse formatter on Edit.
- **Using `disableAllHooks: true` as bypass:** This is a config file change requiring restart. Use env var instead per D-06.
- **Blocking test-on-save with exit 2:** Test-on-save should exit 0 even on test failure. The results are visible in output. Exit 2 would block the edit tool from completing, which is not the intent.
- **Parsing stdin with jq:** Don't add a jq dependency. Use built-in bash tools (grep/cut) or read the tool_input fields simply.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git hook management | Husky/lint-staged setup | Claude Code hooks in settings.json | Project explicitly excludes Husky (REQUIREMENTS.md Out of Scope) |
| Staged file detection | Custom git plumbing | `git diff --cached --name-only --diff-filter=ACM` | Standard git command, reliable |
| JSON parsing in bash | Complex jq pipelines | Simple grep/cut for known fields | Avoid adding dependencies; stdin JSON structure is predictable |

## Common Pitfalls

### Pitfall 1: PreToolUse if-Pattern Mismatch
**What goes wrong:** Hook never fires because the `if` pattern doesn't match the actual command Claude runs.
**Why it happens:** Claude Code might run `git commit -m "msg"` or `git commit -am "msg"` -- variations on the commit command.
**How to avoid:** Use `Bash(git commit*)` with a wildcard to match all git commit variations.
**Warning signs:** Commits succeed without any hook output appearing.

### Pitfall 2: Timeout Too Short for Cargo Builds
**What goes wrong:** Hook is killed mid-compilation; build artifacts left in inconsistent state.
**Why it happens:** Cold cargo builds can take 2-5 minutes. Default timeout may be insufficient.
**How to avoid:** Set `timeout: 300` (5 minutes) on any hook that runs cargo commands. This matches HOOK-04 requirement.
**Warning signs:** Hook output shows "timed out" or cargo build errors about lock files.

### Pitfall 3: Pre-commit Formats But Doesn't Re-stage
**What goes wrong:** Formatted files are not included in the commit because they were modified after staging.
**Why it happens:** `biome format --write` modifies files on disk but git still has the pre-format version staged.
**How to avoid:** After formatting, re-stage the formatted files with `git add`.
**Warning signs:** Committed code is not formatted; next commit shows "unstaged changes".

### Pitfall 4: stdin Not Consumed
**What goes wrong:** Hook script hangs or behaves unexpectedly.
**Why it happens:** Claude Code pipes JSON to stdin. If the script doesn't read it (e.g., no `cat` or redirect), pipe buffering can cause issues.
**How to avoid:** Always read stdin in the script, even if not using the data: `INPUT=$(cat)` at the top.
**Warning signs:** Hook appears to hang, eventually times out.

### Pitfall 5: PostToolUse Exit 2 Blocks Claude's Flow
**What goes wrong:** Claude Code treats the edit as failed and may retry or abort.
**Why it happens:** Exit code 2 in PostToolUse feeds stderr to Claude as an error, making it think the edit failed.
**How to avoid:** PostToolUse test-on-save should always exit 0. Test failures are communicated via stdout/additionalContext in the JSON response, not via exit code.
**Warning signs:** Claude repeatedly tries to edit files or reports "hook blocked the action."

### Pitfall 6: Cargo Manifest Path
**What goes wrong:** `cargo test` or `cargo clippy` runs in wrong directory or can't find Cargo.toml.
**Why it happens:** Hooks run with cwd as the project root, but Cargo.toml is in `src-tauri/`.
**How to avoid:** Always pass `--manifest-path "$CLAUDE_PROJECT_DIR/src-tauri/Cargo.toml"` to cargo commands.
**Warning signs:** "could not find Cargo.toml in current directory" errors.

## Code Examples

### Complete settings.json Configuration
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
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pre-commit.sh",
            "timeout": 300,
            "statusMessage": "Running pre-commit checks (lint, test, format)..."
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
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/test-on-save.sh",
            "timeout": 300,
            "statusMessage": "Running related tests..."
          }
        ]
      }
    ]
  }
}
```

### Stdin JSON for PreToolUse (Bash tool)
```json
{
  "session_id": "abc123",
  "cwd": "/Users/cuhnowts/projects/element",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "git commit -m \"fix: something\"" }
}
```

### Stdin JSON for PostToolUse (Edit tool)
```json
{
  "session_id": "abc123",
  "cwd": "/Users/cuhnowts/projects/element",
  "hook_event_name": "PostToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/Users/cuhnowts/projects/element/src/store/goalStore.ts",
    "old_string": "...",
    "new_string": "..."
  },
  "tool_response": {}
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Husky + lint-staged for git hooks | Claude Code native hooks in settings.json | Early 2026 | No git hook setup, no npm lifecycle dependency |
| Custom pre-commit scripts in .git/hooks/ | Claude Code PreToolUse event | Early 2026 | Hooks travel with repo via .claude/, not .git/ |
| Manual formatting before commit | PostToolUse/PreToolUse auto-format | Early 2026 | Zero friction formatting |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual verification + script exit code testing |
| Config file | `.claude/settings.json` (hooks config) |
| Quick run command | `bash .claude/hooks/pre-commit.sh` (manual trigger) |
| Full suite command | N/A -- hooks are tested by triggering Claude Code actions |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOOK-01 | Pre-commit blocks on lint/test failure | manual | Introduce a lint error, attempt `git commit` in Claude Code, verify exit 2 | N/A |
| HOOK-02 | Test-on-save runs related tests after edit | manual | Edit a TS file in Claude Code, verify test output appears | N/A |
| HOOK-03 | Auto-format runs Biome on TS files at commit | manual | Stage unformatted TS, commit in Claude Code, verify file is formatted | N/A |
| HOOK-04 | Timeouts configured correctly | manual | Verify `timeout: 300` in settings.json for cargo-related hooks | N/A |

### Sampling Rate
- **Per task:** Visually verify hook fires by checking Claude Code output
- **Phase gate:** Run each scenario (commit with lint error, edit TS file, edit RS file, commit with test failure) and verify behavior

### Wave 0 Gaps
None -- hooks are configuration, not application code. Testing is done via manual scenario verification.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Claude Code | Hook runtime | Yes | 2.1.92 | -- |
| Biome CLI | Lint + format | Yes | 2.4.7 | -- |
| rustfmt | Rust formatting | Yes | 1.8.0-stable | -- |
| cargo clippy | Rust linting | Yes | 0.1.94 | -- |
| vitest | TS test runner | Yes | 4.1.0 (package.json) | -- |
| cargo test | Rust test runner | Yes | (toolchain) | -- |
| bash | Hook shell | Yes | (macOS default) | -- |
| git | Staged file detection | Yes | (system) | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Open Questions

1. **PostToolUse stdout/additionalContext for test results**
   - What we know: Exit 0 hooks can return JSON with `additionalContext` to feed results to Claude
   - What's unclear: Whether plain stdout (non-JSON) is also displayed to Claude, or if structured JSON is required for visibility
   - Recommendation: Have test-on-save output results to stderr (always shown) and exit 0. If structured output is needed, return `{"additionalContext": "test results here"}`

2. **Stack-scoping in pre-commit**
   - What we know: We can detect which stacks have staged files via `git diff --cached`
   - What's unclear: Whether running both stacks always is acceptable or if we should optimize
   - Recommendation: Scope to affected stacks only -- if no `.rs` files staged, skip cargo commands. This avoids unnecessary 300s cargo builds on TS-only commits.

## Sources

### Primary (HIGH confidence)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- Complete schema, all event types, exit codes, stdin/stdout formats, if-conditional syntax
- [Claude Code Hook Examples (Steve Kinney)](https://stevekinney.com/courses/ai-development/claude-code-hook-examples) -- Practical pre-commit and post-edit patterns

### Secondary (MEDIUM confidence)
- [Claude Code Hooks Guide (SmartScope)](https://smartscope.blog/en/generative-ai/claude/claude-code-hooks-guide/) -- Community guide, March 2026 edition

### Verified Locally (HIGH confidence)
- `claude --version` = 2.1.92 (above 2.1.85+ minimum)
- `npx biome --version` = 2.4.7
- `rustfmt --version` = 1.8.0-stable
- `cargo clippy --version` = 0.1.94
- No existing `.claude/settings.json` (greenfield)
- No existing git hooks (only .sample files)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools verified locally, no new installs needed
- Architecture: HIGH -- official docs provide complete schema with examples; patterns verified against multiple sources
- Pitfalls: HIGH -- common issues well-documented in community guides and official docs

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (hooks API is stable, 30-day validity)
