# Phase 37: Test Infrastructure & Core Tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 37-test-infrastructure-core-tests
**Areas discussed:** Vitest setup & coverage, Rust test scope & priority, Tauri command integration tests, Coverage baseline format

---

## Vitest Setup & Coverage

### Q1: Coverage Target

| Option | Description | Selected |
|--------|-------------|----------|
| Utility functions only (Recommended) | Focus on src/lib/ (date-utils, actionRegistry, shellAllowlist, utils) and pure store logic. Skip component tests | ✓ |
| Utilities + stores | Also add coverage for Zustand store files beyond existing tests | |
| Everything testable | Cover all non-component TS: lib/, stores/, hooks/ | |

**User's choice:** Utility functions only
**Notes:** Aligns with PROJECT.md — UI verified via screenshots, not component tests

### Q2: Coverage Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| No threshold yet (Recommended) | Just establish reporting — let Phase 39 hooks enforce thresholds | ✓ |
| Set a low floor (e.g. 50%) | Prevent major regressions from the start | |
| Per-file thresholds | Different thresholds for different modules | |

**User's choice:** No threshold yet
**Notes:** Phase 39 hooks will enforce once baselines are established

### Q3: Vitest Config Location

| Option | Description | Selected |
|--------|-------------|----------|
| Root vitest.config.ts (Recommended) | Single config at project root, extending vite.config.ts | ✓ |
| Separate test workspace | vitest.workspace.ts coordinating root + mcp-server | |
| You decide | Claude picks simplest approach | |

**User's choice:** Root vitest.config.ts
**Notes:** None

---

## Rust Test Scope & Priority

### Q1: Which Rust Modules Get Tests

| Option | Description | Selected |
|--------|-------------|----------|
| Models + scheduling (Recommended) | 12 model files + scheduling engine. Pure data/logic, highest value | ✓ |
| Models only | Just the 12 model files — CRUD, validation, serialization | |
| Models + scheduling + heartbeat | Add heartbeat risk engine for critical logic coverage | |

**User's choice:** Models + scheduling
**Notes:** None

### Q2: setup_test_db() Sharing

| Option | Description | Selected |
|--------|-------------|----------|
| Shared test_fixtures module (Recommended) | Extract from calendar.rs into test_fixtures/mod.rs | ✓ |
| Per-module setup functions | Each module defines its own — simpler but duplicated | |
| You decide | Claude picks approach for TEST-02 isolation requirement | |

**User's choice:** Shared test_fixtures module
**Notes:** test_fixtures/mod.rs already exists — natural home for shared test DB setup

---

## Tauri Command Integration Tests

### Q1: Core Commands Selection

| Option | Description | Selected |
|--------|-------------|----------|
| CRUD commands (Recommended) | task, project, theme, phase commands — data backbone | |
| CRUD + planning sync | Add planning_sync_commands — critical but more complex | |
| All DB-backed commands | Everything touching SQLite | |
| You decide | Claude picks minimum set for TEST-03 | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on which commands qualify as "core"

### Q2: External State Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Skip them for now (Recommended) | Only test DB-backed commands. Keychain, OAuth, AI out of scope | ✓ |
| Mock everything | Trait objects or conditional compilation for all deps | |
| Test happy paths only | Test external-state commands but skip actual external calls | |

**User's choice:** Skip them for now
**Notes:** None

---

## Coverage Baseline Format

### Q1: Documentation Format

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown summary (Recommended) | COVERAGE.md listing tested vs untested modules. Human-readable, diffable | ✓ |
| Generated reports only | Just coverage tool output (HTML/stdout) | |
| You decide | Claude picks for TEST-04 visibility requirement | |

**User's choice:** Markdown summary
**Notes:** Also parseable by Testing MCP Server in Phase 40

### Q2: Rust Coverage Tool

| Option | Description | Selected |
|--------|-------------|----------|
| Module inventory only (Recommended) | List which .rs files have tests vs don't | |
| cargo-tarpaulin | Full line-level coverage — slower, potential Tauri issues | |
| You decide | Claude picks based on practicality | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion — tarpaulin has known Tauri linker compatibility issues

---

## Claude's Discretion

- Which CRUD commands to integration-test (user said "you decide")
- Rust coverage approach: module inventory vs cargo-tarpaulin (user said "you decide")
- vitest.config.ts implementation details

## Deferred Ideas

None — discussion stayed within phase scope
