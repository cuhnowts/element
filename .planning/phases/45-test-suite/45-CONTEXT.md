# Phase 45: Test Suite - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Comprehensive unit test coverage for all v1.8 features — plugin infrastructure, wiki engine, hub chat integration, and MCP tools. The goal is ensuring hooks catch regressions going forward.

**Note:** Phases 41-44 were planned before the "tests alongside features" rule was established. Phase 45 is the retroactive catch-up — it provides comprehensive test coverage for all v1.8 features. Future milestones will include tests within each feature phase.

</domain>

<decisions>
## Implementation Decisions

### Test Timing Strategy
- **D-01:** Phase 45 is the sole test phase for v1.8 — it covers all unit and integration tests for Phases 41-44, which were planned without tests baked in. This is a one-time catch-up; future milestones will include tests in each feature phase.
- **D-02:** User does not have testing expertise — tests should be straightforward, well-commented, and follow existing patterns in the codebase.

### Rust Test Boundaries
- **D-03:** Unit tests go in-module with `#[cfg(test)]` — this matches the existing pattern used across `plugins/manifest.rs`, `plugins/registry.rs`, and all core plugin modules.
- **D-04:** Integration tests (cross-module, real DB/filesystem) go in `src-tauri/tests/` directory. Wiki operation serialization (concurrent request queuing) is the primary integration test target.
- **D-05:** Use the existing `test_fixtures/` pattern for test data (manifests, wiki sources, etc.).

### Frontend Test Scope
- **D-06:** Vitest + RTL tests cover hub chat dynamic tool loading, plugin skill registry merge, and tool filtering logic (per TEST-03).
- **D-07:** Follow existing test patterns in `src/stores/` and `src/components/` — no new test infrastructure needed.
- **D-08:** Coverage configuration already targets `src/lib/` — extend to cover new hub chat and wiki-related lib code.

### MCP Test Approach
- **D-09:** MCP tool handler tests (wiki_query, wiki_ingest) should unit test the handler functions with mocked wiki engine responses — verify input parsing, output contracts, and error handling.
- **D-10:** No need for end-to-end MCP protocol tests — focus on the handler logic.

### Claude's Discretion
- Test organization within each phase (file naming, grouping)
- Specific assertion patterns and test helper design
- Which edge cases warrant dedicated tests vs being covered by happy-path tests
- Whether to use snapshot testing for any outputs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Test Patterns
- `src-tauri/src/plugins/manifest.rs` — Rust unit test pattern for plugin manifest parsing
- `src-tauri/src/plugins/registry.rs` — Rust unit test pattern for plugin registry
- `src-tauri/src/test_fixtures/` — Test fixture organization (manifests, responses)
- `src/stores/useTaskStore.test.ts` — Frontend store test pattern
- `src/components/settings/PluginList.test.tsx` — Frontend component test pattern
- `vitest.config.ts` — Vitest configuration with v8 coverage

### Requirements
- `.planning/REQUIREMENTS.md` §TEST-01 through §TEST-04 — Test requirements for v1.8

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src-tauri/src/test_fixtures/` — Existing fixture module with `manifests.rs` and `calendar_responses.rs`; extend for wiki and MCP fixtures
- Vitest + RTL + coverage already configured in `vitest.config.ts` and `package.json`
- ~20 existing frontend test files establish patterns for store and component testing

### Established Patterns
- Rust: `#[cfg(test)] mod tests { ... }` at bottom of each module file
- Frontend: Co-located `.test.ts`/`.test.tsx` files next to source, or `__tests__/` subdirectory
- Coverage: v8 provider, reports to `./coverage`, includes `src/lib/**/*.ts`

### Integration Points
- Phase 41 (plugins): Tests extend existing `plugins/manifest.rs` and `plugins/registry.rs` test modules with new fields (skills, mcp_tools, owned_directories)
- Phase 42 (wiki): New `src-tauri/tests/` integration tests for wiki operation queue serialization
- Phase 43 (hub chat): Vitest tests for dynamic tool loading, plugging into existing store test patterns
- Phase 44 (MCP): Unit tests for new MCP tool handler functions

</code_context>

<specifics>
## Specific Ideas

- User wants to "make sure everything works" — emphasis on functional correctness over coverage metrics
- Tests should be easy to understand for someone without deep testing expertise
- Follow existing codebase patterns rather than introducing new testing frameworks or paradigms

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 45-test-suite*
*Context gathered: 2026-04-06*
