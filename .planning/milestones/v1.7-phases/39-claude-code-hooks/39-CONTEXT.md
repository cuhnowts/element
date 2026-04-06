# Phase 39: Claude Code Hooks - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure Claude Code's hook system (`.claude/settings.json`) to automatically enforce code quality. Pre-commit hooks block on lint/test failures, auto-format staged files before commit, and test-on-save runs related tests when Claude Code edits a file. This phase creates the `.claude/settings.json` configuration — it does NOT create the lint/test tooling (that's Phase 36-37).

</domain>

<decisions>
## Implementation Decisions

### Commit Gate Strategy
- **D-01:** Pre-commit hook runs both lint AND tests — `biome check` for TS, `clippy` for Rust, `vitest run` and `cargo test`. Block on any failure (exit code 2). Matches HOOK-01.
- **D-02:** Auto-format staged files in pre-commit — run `biome format --write` on staged TS files and `rustfmt` on staged Rust files, then re-stage. Both stacks formatted in the same hook.

### Claude's Discretion
- Lint severity threshold (errors-only vs errors+warnings) — Claude decides based on what Biome/clippy default severities produce
- Error output formatting when commit is blocked — Claude decides how to structure stderr for Claude Code readability
- Stack scoping in pre-commit (affected stack only vs always both) — Claude decides based on what's practical

### Test-on-save Scope
- **D-03:** Test-on-save is **blocking** — Claude Code waits for results before continuing. Results must be visible per success criterion SC-2.

### Claude's Discretion
- Test matching strategy (filename convention, run-all, etc.) — Claude decides
- Which hook events trigger test-on-save (Edit only, Edit+Write, etc.) — Claude decides

### Auto-format Behavior
- **D-04:** Biome format runs **before commit only**, NOT after each edit. Pre-commit hook handles formatting.
- **D-05:** Both TypeScript (Biome) and Rust (rustfmt) formatting enforced in the same pre-commit hook.

### Timeout & Reliability
- **D-06:** Env var bypass (`SKIP_HOOKS=1` or similar) available for emergencies when hooks themselves are broken.

### Claude's Discretion
- TypeScript operation timeouts — Claude decides appropriate values
- Timeout/hang behavior (kill+block vs kill+allow) — Claude decides
- Cargo build timeout is 300s per HOOK-04

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Claude Code Hooks Documentation
- Claude Code hooks are configured in `.claude/settings.json` under a `hooks` key — downstream agents should reference Claude Code's hook system documentation for the exact schema (PreToolUse, PostToolUse, PreCommit event types)

### Project Configuration
- `biome.json` — Current Biome config (v1.9.4 schema, recommended rules, space indent, 100 line width)
- `package.json` — Scripts: `lint` → `biome check src/`, `format` → `biome format --write src/`, `test` → `vitest run`
- `src-tauri/Cargo.toml` — Rust project config

### Requirements
- `.planning/REQUIREMENTS.md` §Claude Code Hooks — HOOK-01 through HOOK-04 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `biome.json` already configured with linter + formatter settings
- `package.json` has `lint`, `format`, `test`, `test:watch` scripts ready to invoke
- Rust test modules exist across multiple files with `#[cfg(test)]` and `setup_test_db()` pattern
- `@biomejs/biome` v2.4.7 installed in node_modules (note: biome.json schema still references v1.9.4 — Phase 36 will migrate)

### Established Patterns
- No existing `.claude/settings.json` — hooks are greenfield
- No existing git hooks (only `.sample` files in `.git/hooks/`)
- No `.husky/` or other hook managers

### Integration Points
- `.claude/settings.json` is the sole configuration file — no Tauri/React code changes needed
- Hooks invoke CLI commands (`biome check`, `vitest run`, `cargo test`, `cargo clippy`, `biome format --write`, `rustfmt`)
- All commands must already work (established by Phase 36-37) before hooks can enforce them

</code_context>

<specifics>
## Specific Ideas

- User wants env var bypass for emergencies — not a permanent disable, just an escape hatch when hooks themselves break
- Formatting is pre-commit only (not per-edit) — user prefers less interruption during editing, clean formatting enforced at commit time
- Both TS and Rust stacks should be formatted in the same pre-commit flow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-claude-code-hooks*
*Context gathered: 2026-04-05*
