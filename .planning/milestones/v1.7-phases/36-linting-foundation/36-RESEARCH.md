# Phase 36: Linting Foundation - Research

**Researched:** 2026-04-05
**Domain:** Biome v2 migration, Rust clippy/rustfmt, unified lint scripts
**Confidence:** HIGH

## Summary

Phase 36 requires migrating a stale Biome v1.9.4 config to v2.4.7 schema, resolving all TypeScript lint violations (651 total, most auto-fixable), fixing 69 clippy warnings in Rust (including a real concurrency bug), formatting 287 Rust files with rustfmt, and wiring everything into a single `npm run check:all` script.

The migration path is well-defined. `npx biome migrate --write` handles the schema change automatically (moves `organizeImports` to `assist.actions.source.organizeImports`). After migration, `biome check --write` auto-fixes ~400 formatting + import ordering violations, and `--unsafe` handles another ~100 (template literals, exhaustive deps). Approximately 48 violations require manual attention or rule suppression. On the Rust side, `cargo fmt` handles all 287 files automatically. Clippy has 69 warnings: ~50 are mechanical (redundant closures, `map_or` simplification, dead code), and 1 is a real concurrency bug (`await_holding_lock` in calendar.rs:762).

**Primary recommendation:** Run auto-fixers first (biome + rustfmt), then batch-fix clippy warnings by category, manually fix the `await_holding_lock` bug, and handle remaining Biome violations through a combination of code fixes and targeted rule configuration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Keep `"recommended": true` as the rule set. Do not add strict or project-specific rules unless a real gap is discovered during the migration. Minimizes churn.
- **D-02:** Migrate the `$schema` from `1.9.4` to the Biome v2 schema. Fix any config breaking changes from the v1->v2 migration.
- **D-03:** `npm run check:all` runs TypeScript (biome check) and Rust (clippy + rustfmt) checks **in parallel** for speed.
- **D-04:** Collect and report all results from both TS and Rust checks. Exit non-zero if any check fails. User sees the full picture, not just the first failure.
- **D-05:** Use Rust default formatting -- no `rustfmt.toml`. Standard community style, zero config.
- **D-06:** Auto-fix everything Biome and rustfmt can handle automatically (formatting, import ordering, simple lint fixes).
- **D-07:** Manually fix violations that require code judgment -- specifically the `await_holding_lock` concurrency bug in `calendar.rs` and any other logic-affecting clippy warnings.

### Claude's Discretion
- Biome v2 schema migration details (field renames, deprecated options)
- Exact structure of the parallel check:all script (shell scripting approach)
- Order of operations for applying auto-fixes vs manual fixes

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LINT-01 | Biome schema migrated from v1.9.4 to v2.x and `biome check` passes on full codebase | `npx biome migrate --write` handles schema; 651 violations found, ~600 auto-fixable, ~48 manual |
| LINT-02 | Biome rules incrementally tightened with project-specific TypeScript/React rules enforced | D-01 locks `recommended: true`; remaining violations after auto-fix are from recommended rules already -- fixing them satisfies tightening within the recommended set |
| LINT-03 | All clippy warnings resolved including `await_holding_lock` concurrency bug in calendar.rs | 69 warnings catalogued by type; `await_holding_lock` at calendar.rs:762 needs `tokio::sync::Mutex` |
| LINT-04 | rustfmt enforced across all Rust source files with consistent formatting config | 287 files need formatting; D-05 locks default style (no rustfmt.toml); `cargo fmt` handles all |
</phase_requirements>

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| @biomejs/biome | 2.4.7 | TS/React linting + formatting | Already installed; replaces ESLint + Prettier |
| cargo clippy | 0.1.94 | Rust linting | Ships with rustup, standard Rust linter |
| rustfmt | 1.8.0-stable | Rust formatting | Ships with rustup, community standard |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| npm scripts | - | Unified check orchestration | `check:all` script runs both TS and Rust checks |

### Alternatives Considered
None -- all tools are locked by decisions and already installed.

## Architecture Patterns

### Biome v2 Config (Post-Migration)
The migrated `biome.json` will look like:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.7/schema.json",
  "assist": { "actions": { "source": { "organizeImports": "on" } } },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

Key v1 -> v2 change: `organizeImports` top-level key moved to `assist.actions.source.organizeImports`. This is the only breaking change for this project's config.

### check:all Script Pattern (Parallel Execution)
Per D-03 and D-04, the script must run TS and Rust checks in parallel and report all failures:

```bash
#!/bin/bash
# Run checks in parallel, collect all results
ts_result=0
rust_result=0

biome check src/ &
ts_pid=$!

(cd src-tauri && cargo clippy -- -D warnings && cargo fmt --check) &
rust_pid=$!

wait $ts_pid || ts_result=$?
wait $rust_pid || rust_result=$?

if [ $ts_result -ne 0 ] || [ $rust_result -ne 0 ]; then
  echo "Checks failed: TS=$ts_result Rust=$rust_result"
  exit 1
fi
echo "All checks passed"
```

Alternative: Use `npm-run-all` or `concurrently` -- but a simple shell script avoids adding dependencies. Per established project pattern (simple direct commands in package.json), a shell script or inline `bash -c` is preferred.

### await_holding_lock Fix Pattern
The bug at calendar.rs:762 holds a `std::sync::Mutex` guard across `.await` points. The fix is to replace `std::sync::Mutex` with `tokio::sync::Mutex`:

```rust
// Before (buggy): std::sync::Mutex held across await
static TOKEN_REFRESH_LOCK: Mutex<()> = Mutex::new(());
// ... 
let _lock = TOKEN_REFRESH_LOCK.lock().map_err(...)?;
match account.provider.as_str() {
    "google" => refresh_google_token(&client, &refresh_token).await?,
    // ...
}

// After (fixed): tokio::sync::Mutex is async-aware
use tokio::sync::Mutex as AsyncMutex;
use once_cell::sync::Lazy; // or std::sync::LazyLock on Rust 1.80+
static TOKEN_REFRESH_LOCK: Lazy<AsyncMutex<()>> = Lazy::new(|| AsyncMutex::new(()));
// ...
let _lock = TOKEN_REFRESH_LOCK.lock().await;
```

Note: `tokio::sync::Mutex` cannot be used in a `static` without `Lazy` or `LazyLock` since its `new()` is not `const`. Since Rust 1.94 is available (well past 1.80), `std::sync::LazyLock` can be used without adding `once_cell`:

```rust
use std::sync::LazyLock;
use tokio::sync::Mutex as AsyncMutex;

static TOKEN_REFRESH_LOCK: LazyLock<AsyncMutex<()>> = LazyLock::new(|| AsyncMutex::new(()));
```

The error handling changes slightly: `tokio::sync::Mutex::lock()` returns the guard directly (no `Result`), so the `.map_err(...)` call is removed.

### Anti-Patterns to Avoid
- **Suppressing lint rules globally to pass:** Fix violations or suppress per-line with justification, never disable a recommended rule project-wide
- **Running `biome check --write --unsafe` blindly:** Unsafe fixes (e.g., adding deps to useEffect) can change runtime behavior -- review each category first
- **Fixing clippy dead code warnings by deleting code:** Some "dead" code may be used via Tauri command registration or future features -- prefix with `#[allow(dead_code)]` with a comment explaining why

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema migration | Manual JSON editing | `npx biome migrate --write` | Handles all field renames, deprecations |
| Import sorting | Manual reordering | `biome check --write` (assist/source/organizeImports) | 194 files affected, deterministic |
| Rust formatting | Manual style fixes | `cargo fmt` | 287 files, zero-config |
| Parallel script runner | npm package (concurrently) | Shell `&` + `wait` | No new dependency, project pattern is simple commands |

## Common Pitfalls

### Pitfall 1: Biome Unsafe Fixes Change Runtime Behavior
**What goes wrong:** `biome check --write --unsafe` auto-fixes `useExhaustiveDependencies` by adding missing deps to useEffect arrays, which can cause infinite re-render loops if the dep is an unstable reference (object/array created in render).
**Why it happens:** Biome doesn't analyze reference stability -- it mechanically adds missing deps.
**How to avoid:** After unsafe auto-fix, review all `useExhaustiveDependencies` changes. For Zustand selectors and callback refs, ensure the dep is stable (see project memory: never return new object/array refs from Zustand selectors).
**Warning signs:** UI freezes or rapid re-renders after applying fixes.

### Pitfall 2: noNonNullAssertion Has No Auto-Fix
**What goes wrong:** 21 `noNonNullAssertion` violations remain after all auto-fixes. Each requires manual judgment -- either add a null check or suppress with `// biome-ignore lint/style/noNonNullAssertion: <reason>`.
**Why it happens:** The `!` operator is used extensively where TypeScript's type narrowing doesn't cover Tauri/runtime state that's guaranteed non-null by context.
**How to avoid:** Batch these: review each, add proper null checks where possible, suppress with justification where the assertion is safe.
**Warning signs:** Suppressing without review can hide real null reference bugs.

### Pitfall 3: Clippy Dead Code Warnings on Tauri Commands
**What goes wrong:** Clippy reports functions/structs as "never used" even though they're invoked by the Tauri command system at runtime.
**Why it happens:** Tauri's `#[tauri::command]` proc macro wires functions at compile time, but clippy's dead code analysis may not trace through all macro expansions.
**How to avoid:** For genuinely Tauri-invoked code, use `#[allow(dead_code)]` with a comment. For actually dead code (unused structs like `CalendarPlugin`, `InMemoryStore`, etc.), consider removing it.
**Warning signs:** Look at the git history to determine if "dead" code is actually unused or just macro-invoked.

### Pitfall 4: cargo fmt Reformats Entire Codebase
**What goes wrong:** 287 files get reformatted, creating a massive diff that's hard to review and may conflict with in-progress work.
**Why it happens:** Rust source has never been formally formatted (per CONTEXT.md).
**How to avoid:** Run `cargo fmt` in its own dedicated commit before any other changes. This makes the formatting-only commit reviewable separately.
**Warning signs:** Mixed commits with formatting + logic changes.

### Pitfall 5: tokio::sync::Mutex Performance
**What goes wrong:** Replacing `std::sync::Mutex` with `tokio::sync::Mutex` everywhere "just in case."
**Why it happens:** Over-correcting from the `await_holding_lock` bug.
**How to avoid:** Only replace the specific mutex that's held across await points (`TOKEN_REFRESH_LOCK`). Other `std::sync::Mutex` uses that don't cross await boundaries are fine and more efficient.
**Warning signs:** N/A -- only one instance identified in this codebase.

## Violation Inventory

### Biome (TypeScript) -- 651 Total Violations

**After `biome check --write` (safe auto-fix):** ~400 fixed automatically
- 194 import ordering (assist/source/organizeImports) -- all auto-fixed
- 206 formatting violations -- all auto-fixed

**After `biome check --write --unsafe`:** ~100 more fixed
- 42 useExhaustiveDependencies -- auto-fixed (REVIEW NEEDED)
- 19 noNonNullAssertion -- auto-fixed via unsafe
- 25 useTemplate -- auto-fixed
- 13 useImportType -- auto-fixed

**Remaining after all auto-fixes:** ~48 violations requiring manual work
| Rule | Count | Fix Strategy |
|------|-------|-------------|
| noNonNullAssertion | 21 | Add null checks or per-line biome-ignore |
| noArrayIndexKey | 11 | Add stable keys or per-line biome-ignore with justification |
| noExplicitAny | 4 | Type properly or biome-ignore |
| useExhaustiveDependencies | 4 | Analyze deps, fix or suppress |
| useIterableCallbackReturn | 2 | Fix callback return values |
| noInvalidUseBeforeDeclaration | 2 | Reorder declarations |
| noImplicitAnyLet | 1 | Add type annotation |
| noGlobalIsNan | 1 | Use Number.isNaN() |
| noAssignInExpressions | 1 | Extract assignment |
| noUselessFragments | 1 | Remove fragment |
| noNonNullAssertedOptionalChain | 1 | Fix chain |
| noUnusedVariables | 1 | Remove or prefix with _ |

### Clippy (Rust) -- 69 Total Warnings

| Category | Count | Fix Strategy |
|----------|-------|-------------|
| Redundant closure | 10 | `cargo clippy --fix` auto-fixes |
| Unnecessary map_or | 3 | Use `is_some_and()` -- auto-fixable |
| Identity map | 4 | Remove `.map(\|x\| x)` -- auto-fixable |
| Unused imports | 6 | Remove -- auto-fixable |
| Dead code (structs/functions/fields) | ~25 | Review each: remove if truly dead, `#[allow(dead_code)]` if macro-invoked |
| Deref/borrow simplification | 2 | Auto-fixable |
| Range contains | 2 | Use `.contains()` -- auto-fixable |
| Trim before split_whitespace | 1 | Remove redundant trim |
| Strip prefix manually | 2 | Use `strip_prefix()` |
| Too many arguments | 3 | Refactor into config struct (manual) |
| If-statement collapse | 1 | Combine conditions |
| await_holding_lock | 1 | Replace with tokio::sync::Mutex (manual, D-07) |
| Unused variables | 3 | Prefix with _ or remove |

### Rustfmt -- 287 Files
All handled by `cargo fmt` with no configuration needed (D-05).

## Code Examples

### biome-ignore Suppression Pattern
```typescript
// For intentional non-null assertions where runtime guarantees non-null:
// biome-ignore lint/style/noNonNullAssertion: Tauri state guaranteed initialized by app setup
const workspace = store.getState().activeWorkspace!;
```

### Clippy Auto-Fix Command
```bash
# Fix mechanical clippy warnings automatically
cd src-tauri && cargo clippy --fix --allow-dirty --allow-staged
```
Note: `--allow-dirty` and `--allow-staged` are needed when working tree has uncommitted changes.

### check:all package.json Script
```json
{
  "scripts": {
    "check:all": "bash -c 'biome check src/ & P1=$!; (cd src-tauri && cargo clippy -- -D warnings && cargo fmt --check) & P2=$!; wait $P1; R1=$?; wait $P2; R2=$?; [ $R1 -eq 0 ] && [ $R2 -eq 0 ]'"
  }
}
```

Alternative (more readable, separate script file):
```json
{
  "scripts": {
    "check:all": "bash scripts/check-all.sh"
  }
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Biome 2.4.7 (TS) + clippy 0.1.94 + rustfmt 1.8.0 (Rust) |
| Config file | `biome.json` (TS), no rustfmt.toml (Rust) |
| Quick run command | `npx biome check src/ && cd src-tauri && cargo clippy -- -D warnings` |
| Full suite command | `npm run check:all` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LINT-01 | Biome config valid + check passes | smoke | `npx biome check src/` | N/A (tool output) |
| LINT-02 | Recommended rules enforced, violations resolved | smoke | `npx biome check src/` | N/A (tool output) |
| LINT-03 | Zero clippy warnings | smoke | `cd src-tauri && cargo clippy -- -D warnings` | N/A (tool output) |
| LINT-04 | Consistent Rust formatting | smoke | `cd src-tauri && cargo fmt --check` | N/A (tool output) |

### Sampling Rate
- **Per task commit:** Run the specific check relevant to the task (biome or clippy/fmt)
- **Per wave merge:** `npm run check:all`
- **Phase gate:** `npm run check:all` exits 0

### Wave 0 Gaps
- [ ] `scripts/check-all.sh` or inline script -- covers unified check (LINT-01 through LINT-04)
- [ ] `biome.json` migrated to v2 schema -- prerequisite for any Biome check

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @biomejs/biome | LINT-01, LINT-02 | Yes | 2.4.7 | -- |
| cargo clippy | LINT-03 | Yes | 0.1.94 | -- |
| rustfmt | LINT-04 | Yes | 1.8.0-stable | -- |
| Node.js | npm scripts | Yes | 22.18.0 | -- |
| Rust toolchain | Clippy + fmt | Yes | 1.94.0 | -- |
| bash | check:all script | Yes | (macOS default) | -- |

**Missing dependencies:** None. All tools available at required versions.

## Open Questions

1. **LINT-02 vs D-01 tension**
   - What we know: LINT-02 says "incrementally tightened with project-specific rules." D-01 says "keep recommended, don't add rules unless gap found."
   - Resolution: D-01 is the locked decision. Fixing all recommended-rule violations (48 manual fixes) satisfies "tightening" within the recommended set. If specific patterns emerge during fixing (e.g., many `noNonNullAssertion` that should be allowed), configure per-rule overrides rather than disabling globally.

2. **Dead code volume**
   - What we know: ~25 clippy dead code warnings across structs, functions, and fields.
   - What's unclear: How much is genuinely dead vs. macro-invoked or planned-for-future.
   - Recommendation: Implementer should check git blame and Tauri command registration before deleting. Default to `#[allow(dead_code)]` with comment for ambiguous cases.

3. **useExhaustiveDependencies unsafe fixes**
   - What we know: 42 violations auto-fixed by `--unsafe`, 4 remaining.
   - What's unclear: Whether any of the 42 auto-fixes introduce re-render loops due to unstable deps.
   - Recommendation: After applying unsafe fixes, grep for changed `useEffect`/`useCallback` deps and verify each added dep is a stable reference (primitives, refs, or memoized values).

## Sources

### Primary (HIGH confidence)
- Direct tool execution: `npx biome check`, `cargo clippy`, `cargo fmt --check` -- actual violation counts from this codebase
- `npx biome migrate` -- verified migration path from v1.9.4 to v2.4.7 schema
- biome.json -- current config inspected directly
- Cargo.toml -- current Rust dependencies inspected directly

### Secondary (MEDIUM confidence)
- `tokio::sync::Mutex` as fix for `await_holding_lock` -- standard Rust async pattern, verified by clippy's own suggestion
- `std::sync::LazyLock` availability on Rust 1.80+ -- verified rustc 1.94.0 installed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools already installed and version-verified
- Architecture: HIGH -- migration path tested with dry run, violation inventory complete
- Pitfalls: HIGH -- based on actual violation analysis, not hypothetical

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable tools, locked versions)
