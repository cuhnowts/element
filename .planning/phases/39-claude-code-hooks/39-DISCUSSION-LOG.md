# Phase 39: Claude Code Hooks - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 39-claude-code-hooks
**Areas discussed:** Commit gate strategy, Test-on-save scope, Auto-format behavior, Timeout & reliability

---

## Commit Gate Strategy

### What should the pre-commit hook check?

| Option | Description | Selected |
|--------|-------------|----------|
| Lint + tests | Run both `biome check` on staged TS files AND `vitest run` + `cargo test` — block on any failure | ✓ |
| Lint only, tests separate | Pre-commit only runs lint. Tests run via test-on-save hook instead | |
| Staged-file lint + affected tests | Lint only staged files, run only tests related to staged files | |

**User's choice:** Lint + tests
**Notes:** Most thorough approach, matches HOOK-01 requirement directly.

### Should lint block on warnings or only errors?

| Option | Description | Selected |
|--------|-------------|----------|
| Errors only | Block commits only on lint errors. Warnings reported but don't prevent commit | |
| Errors + warnings | Block on any lint diagnostic | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide

### Error output when commit is blocked?

| Option | Description | Selected |
|--------|-------------|----------|
| Full tool output | Pass through raw lint/test output | |
| Summary + details | Structured summary line followed by full output | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide

### Should pre-commit run both TS and Rust checks, or only affected stack?

| Option | Description | Selected |
|--------|-------------|----------|
| Only affected stack | Skip irrelevant stack based on staged files | |
| Always run both | Run full lint+test for both stacks on every commit | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide

---

## Test-on-save Scope

### How should 'related tests' be determined?

| Option | Description | Selected |
|--------|-------------|----------|
| Filename convention | Match by naming: `foo.ts` runs `foo.test.ts` | |
| Run all tests | Always run full test suite after any edit | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide

### Which hook event triggers test-on-save?

| Option | Description | Selected |
|--------|-------------|----------|
| PostToolUse: Edit | Run tests after Edit tool completes | |
| PostToolUse: Write + Edit | Also trigger on Write tool | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide

### Blocking or non-blocking?

| Option | Description | Selected |
|--------|-------------|----------|
| Blocking | Claude Code waits for results before continuing | ✓ |
| Non-blocking | Tests run in background, results appear later | |
| You decide | Claude's discretion | |

**User's choice:** Blocking
**Notes:** Matches success criterion "results are visible" — Claude Code needs to see failures immediately.

---

## Auto-format Behavior

### When should Biome auto-format run?

| Option | Description | Selected |
|--------|-------------|----------|
| After each edit | PostToolUse hook on Edit tool | |
| Before commit only | Format all staged TS files as part of pre-commit hook | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Before commit only
**Notes:** User prefers less interruption during editing, clean formatting enforced at commit time.

### Auto-fix + re-stage, or block if formatting is off?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-fix + re-stage | Run format, re-stage fixed files, commit proceeds | |
| Block and report | Block commit if formatting wrong | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide

### Should rustfmt also run in the same pre-commit hook?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, both stacks | Pre-commit formats both TS (Biome) and Rust (rustfmt) | ✓ |
| TS only for now | Only Biome formatting in hooks | |
| You decide | Claude's discretion | |

**User's choice:** Yes, both stacks

---

## Timeout & Reliability

### TypeScript operation timeout?

| Option | Description | Selected |
|--------|-------------|----------|
| 60s | Biome and Vitest are fast — 60s is generous | |
| 120s | More conservative headroom | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide

### What happens when a hook hangs or times out?

| Option | Description | Selected |
|--------|-------------|----------|
| Kill + block | Kill hung process, exit code 2, treat timeout as failure | |
| Kill + allow | Kill hung process but let action proceed | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide

### Should there be a bypass for emergency commits?

| Option | Description | Selected |
|--------|-------------|----------|
| No bypass | Hooks always enforce | |
| Env var bypass | Set SKIP_HOOKS=1 to bypass for emergencies | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Env var bypass
**Notes:** Escape hatch for when hooks themselves are broken, not a permanent disable.

---

## Claude's Discretion

- Lint severity threshold (errors vs warnings)
- Error output formatting for blocked commits
- Stack scoping in pre-commit (affected only vs both)
- Test matching strategy for test-on-save
- Hook event selection for test-on-save
- TS operation timeouts
- Timeout/hang behavior
- Auto-fix + re-stage vs block for formatting

## Deferred Ideas

None — discussion stayed within phase scope
