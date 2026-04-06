# Phase 36: Linting Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 36-linting-foundation
**Areas discussed:** Biome rule strictness, Unified check script, Rustfmt config, Fix strategy

---

## Biome Rule Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Recommended only | Keep recommended: true, fix violations. Only add project-specific rules if recommended set misses something real. Least churn. | ✓ |
| Recommended + strict subset | Enable specific strict rules: noExplicitAny, useConst, noNonNullAssertion, consistent naming. Moderate churn. | |
| Full strict | Enable all strict rules. Maximum enforcement but likely hundreds of violations. | |

**User's choice:** Recommended only
**Notes:** Minimizes churn. Only add rules if a real gap is found.

---

## Unified Check Script

| Option | Description | Selected |
|--------|-------------|----------|
| Run all, report all | Run TS lint, Rust clippy, and rustfmt in sequence. Collect all results, report everything. | |
| Fail fast | Stop at the first failure. Faster feedback but only one problem at a time. | |
| Parallel, report all | Run TS and Rust checks in parallel for speed. Interleaved output may be harder to read. | ✓ |

**User's choice:** Parallel, report all
**Notes:** Fast and complete. CI-friendly.

---

## Rustfmt Config

| Option | Description | Selected |
|--------|-------------|----------|
| Rust defaults | No rustfmt.toml needed. Standard Rust community style. Zero decisions, maximum compatibility. | ✓ |
| Match Biome style | Create rustfmt.toml with max_width=100 to match Biome's lineWidth=100. | |
| You decide | Claude picks sensible defaults based on codebase patterns. | |

**User's choice:** Rust defaults
**Notes:** No config file needed.

---

## Fix Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-fix + targeted manual | Let Biome and rustfmt auto-fix everything they can. Manually fix only judgment calls like await_holding_lock. | ✓ |
| All manual review | Review every change before applying. Safest but slowest. | |
| Full auto-fix | Auto-fix everything including unsafe suggestions. Fastest but risky for logic-affecting changes. | |

**User's choice:** Auto-fix + targeted manual
**Notes:** Auto-fix formatting/imports/simple lint. Manual attention for the concurrency bug in calendar.rs.

---

## Claude's Discretion

- Biome v2 schema migration details
- Exact structure of the parallel check:all script
- Order of operations for auto-fixes vs manual fixes

## Deferred Ideas

None — discussion stayed within phase scope.
