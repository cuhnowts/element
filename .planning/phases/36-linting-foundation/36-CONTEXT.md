# Phase 36: Linting Foundation - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate Biome to v2 schema, resolve all clippy warnings, enforce rustfmt, and create a unified `check:all` script. The full codebase passes lint and format checks across both TypeScript and Rust with zero warnings and zero config errors.

</domain>

<decisions>
## Implementation Decisions

### Biome Rule Strictness
- **D-01:** Keep `"recommended": true` as the rule set. Do not add strict or project-specific rules unless a real gap is discovered during the migration. Minimizes churn.
- **D-02:** Migrate the `$schema` from `1.9.4` to the Biome v2 schema. Fix any config breaking changes from the v1→v2 migration.

### Unified Check Script
- **D-03:** `npm run check:all` runs TypeScript (biome check) and Rust (clippy + rustfmt) checks **in parallel** for speed.
- **D-04:** Collect and report all results from both TS and Rust checks. Exit non-zero if any check fails. User sees the full picture, not just the first failure.

### Rustfmt Configuration
- **D-05:** Use Rust default formatting — no `rustfmt.toml`. Standard community style, zero config.

### Fix Strategy
- **D-06:** Auto-fix everything Biome and rustfmt can handle automatically (formatting, import ordering, simple lint fixes).
- **D-07:** Manually fix violations that require code judgment — specifically the `await_holding_lock` concurrency bug in `calendar.rs` and any other logic-affecting clippy warnings.

### Claude's Discretion
- Biome v2 schema migration details (field renames, deprecated options)
- Exact structure of the parallel check:all script (shell scripting approach)
- Order of operations for applying auto-fixes vs manual fixes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Linting Configuration
- `biome.json` — Current Biome config (v1.9.4 schema, needs migration to v2)
- `package.json` — Current lint/format scripts (`npm run lint`, `npm run format`)

### Rust Source
- `src-tauri/src/` — Rust codebase that must pass clippy and rustfmt
- `src-tauri/Cargo.toml` — Rust project configuration

### Requirements
- `.planning/REQUIREMENTS.md` §Linting — LINT-01 through LINT-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Biome v2.4.7 already installed (`@biomejs/biome: ^2.4.7` in package.json) — only the config schema is outdated
- Existing `npm run lint` and `npm run format` scripts to build on
- clippy 0.1.94 and rustfmt 1.8.0-stable available on the system

### Established Patterns
- Biome handles both linting and formatting for TypeScript (no ESLint)
- No rustfmt.toml exists — Rust side has never been formally formatted
- Package scripts use simple direct commands (no build tooling wrappers)

### Integration Points
- `package.json` scripts section — add `check:all` here
- `biome.json` — schema migration target
- `src-tauri/` — clippy and rustfmt targets

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 36-linting-foundation*
*Context gathered: 2026-04-05*
