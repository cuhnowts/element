# Phase 45: Test Suite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 45-test-suite
**Areas discussed:** Test timing strategy, Rust test boundaries, Frontend test scope, MCP test approach

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Test timing strategy | Write tests after all features (Phase 45 as-is), or fold tests into each feature phase (41-44)? | |
| Rust test boundaries | Where to draw the line between unit tests and integration tests. What gets mocked vs real? | |
| Frontend test scope | What to cover in Vitest — just hub chat tool loading/filtering, or also component rendering? | |
| MCP test approach | How to test MCP tool handlers — mock the wiki engine, use a real test wiki, or contract-test? | |

**User's choice:** "Use your best judgement, I don't know much about testing and just want to make sure everything works from a unit testing perspective"
**Notes:** User deferred all four areas to Claude's judgment. Prior feedback (feedback_tests_with_features.md) established preference for writing tests alongside features, not as a separate step — this informed the key D-01 decision to fold tests into Phases 41-44.

---

## Claude's Discretion

All four gray areas were delegated to Claude based on:
- Existing codebase patterns (Rust #[cfg(test)] modules, Vitest + RTL setup)
- Prior user feedback about co-locating tests with features
- Focus on functional correctness over coverage metrics

## Deferred Ideas

None
