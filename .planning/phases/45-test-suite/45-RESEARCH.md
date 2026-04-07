# Phase 45: Test Suite - Research

**Researched:** 2026-04-06
**Domain:** Comprehensive test coverage for v1.8 features
**Confidence:** HIGH

## Summary

Phase 45 adds tests for all v1.8 features (Phases 41-44). The codebase already has extensive test infrastructure and existing tests that serve as patterns. Research confirms that most of the code under test already exists with well-defined APIs, making this a straightforward test-writing phase with no architectural decisions needed.

**Key finding:** Significant test coverage already exists in the codebase from Phase 37 (Test Infrastructure & Core Tests) and from v1.8 feature phases themselves. Several modules already have inline `#[cfg(test)]` blocks with comprehensive tests. The remaining gaps are primarily:
1. PluginHost lifecycle tests (enable/disable with skills + MCP tools + directories)
2. PluginHost dispatch_skill routing tests
3. Frontend usePluginTools hook tests
4. Frontend pluginToolRegistry tests
5. Hub chat store tests (currently all `.todo()`)

MCP server wiki tools already have full test coverage in `mcp-server/src/__tests__/wiki-tools.test.ts`.

## Existing Test Coverage Audit

### Rust — Already Well Covered

| Module | File | Tests | Status |
|--------|------|-------|--------|
| manifest.rs | src-tauri/src/plugins/manifest.rs | 14 tests | Full v2 field coverage including skills, mcp_tools, owned_directories, lifecycle hooks, backward compat |
| registry.rs | src-tauri/src/plugins/registry.rs | 13 tests | PluginRegistry + SkillRegistry + McpToolRegistry all covered, including collision detection and namespace isolation |
| directory.rs | src-tauri/src/plugins/directory.rs | 10 tests | Path validation, scope resolution, create, purge, symlink escape — comprehensive |
| core/mod.rs | src-tauri/src/plugins/core/mod.rs | 6 tests | Core plugin registration, capabilities, step_types |
| mod.rs | src-tauri/src/plugins/mod.rs | 6 tests | PluginHost scan_and_load, get_plugin, set_enabled, list_plugins |
| frontmatter.rs | src-tauri/src/knowledge/frontmatter.rs | 4 tests | Round-trip, special chars, parse_article |
| index.rs | src-tauri/src/knowledge/index.rs | 6 tests | Write/read round-trip, add/replace/remove entry, tag cloud, alphabetical sort |
| ingest.rs | src-tauri/src/knowledge/ingest.rs | 7 tests | Create article, store raw, update index, noop re-ingest, changed source update, slug collision, URL source, HTML stripping |
| query.rs | src-tauri/src/knowledge/query.rs | 4 tests | Synthesized answer, empty wiki, footnote citations, 5-article cap |
| lint.rs | src-tauri/src/knowledge/lint.rs | 7 tests | All 5 lint categories + clean wiki + summary counts |
| mod.rs (engine) | src-tauri/src/knowledge/mod.rs | 1 test | Concurrent ingest serialization |

### Frontend — Partial Coverage

| Module | File | Tests | Status |
|--------|------|-------|--------|
| useHubChatStore | src/stores/__tests__/useHubChatStore.test.ts | 9 todo tests | Placeholder only — all `.todo()` |
| actionRegistry | src/lib/actionRegistry.test.ts | Existing tests | Covered but not v1.8 specific |
| pluginToolRegistry | src/lib/pluginToolRegistry.ts | No test file | **GAP** |
| usePluginTools | src/hooks/usePluginTools.ts | No test file | **GAP** |

### MCP Server — Fully Covered

| Module | File | Tests | Status |
|--------|------|-------|--------|
| wiki-tools | mcp-server/src/__tests__/wiki-tools.test.ts | 9 tests | Full coverage — query (error/no-match/match/case-insensitive/multiple), ingest (error/not-found/success/operationId) |

## Gaps to Fill (TEST-01 through TEST-04)

### TEST-01: Rust Plugin Tests (Gaps)

Existing coverage is strong. Remaining gaps:
1. **PluginHost.set_enabled() with skills** — verify that enabling a plugin with skills registers them in SkillRegistry, and disabling unregisters them
2. **PluginHost.dispatch_skill()** — verify routing to registered skills, error for unregistered
3. **PluginHost.list_skills()** — verify it returns PluginSkillInfo with correct fields
4. **PluginHost.set_enabled() with lifecycle hooks** — verify `create_dirs` hook creates directories, unknown hooks are tolerated
5. **Namespace collision via PluginHost** — two plugins with same skill name should not collide due to prefixed namespace

### TEST-02: Rust Wiki Integration Tests (Status: ALREADY COVERED)

The existing in-module tests in `knowledge/` modules are actually integration-level tests (they create temp directories, write files, use mock providers). The concurrent ingest serialization test in `mod.rs` specifically tests the operation queue. All TEST-02 success criteria are met by existing tests:
- Ingest produces articles + index: `test_ingest_creates_article`, `test_ingest_updates_index`
- Query retrieves relevant content: `test_query_returns_synthesized_answer`
- Lint detects issues: `test_lint_detects_stale_sources`, `test_lint_detects_broken_wikilinks`, `test_lint_detects_thin_articles`, `test_lint_detects_orphan_pages`
- Operation queue serializes: `test_concurrent_ingest_serializes`

### TEST-03: Frontend Tests (Gaps)

1. **pluginToolRegistry.ts** — unit tests for `getPluginToolDefinitions()` and `dispatchPluginSkill()` with mocked Tauri invoke
2. **usePluginTools hook** — test fetch-on-mount, `isPluginTool()`, `isPluginToolDestructive()`, `getToolDefs()` conversion
3. **useHubChatStore** — fill in the 9 `.todo()` tests: message adding, history cap, streaming lifecycle, stop generation, retry, independence, clearChat

### TEST-04: MCP Server Tests (Status: ALREADY COVERED)

`mcp-server/src/__tests__/wiki-tools.test.ts` already has 9 tests covering all `wiki_query` and `wiki_ingest` contracts.

## Test Infrastructure Notes

### Rust
- Test helper module: `src-tauri/src/knowledge/test_helpers.rs` — `MockProvider` and `SequentialMockProvider` implementing `AiProvider` trait
- Fixture module: `src-tauri/src/test_fixtures/` — `manifests.rs`, `calendar_responses.rs`
- Temp directories via `tempfile::tempdir()` pattern used consistently
- Async tests use `#[tokio::test]`

### Frontend
- Vitest + RTL configured in `vitest.config.ts`
- Coverage: v8 provider, reports to `./coverage`, includes `src/lib/**/*.ts`
- Mock Tauri: `vi.mock("@tauri-apps/api/core")` for invoke mocking
- Test patterns: co-located `.test.ts`/`.test.tsx` files or `__tests__/` subdirectories

### MCP Server
- Separate vitest config in `mcp-server/vitest.config.ts`
- Tests in `mcp-server/src/__tests__/`
- Uses temp directories with `mkdtempSync`/`rmSync` cleanup

## Validation Architecture

### What to validate
- **TEST-01:** `cargo test --lib` passes with plugin host lifecycle tests
- **TEST-02:** `cargo test --lib` passes — existing knowledge tests already cover
- **TEST-03:** `npx vitest run` passes with new pluginToolRegistry and usePluginTools tests, plus filled useHubChatStore tests
- **TEST-04:** `cd mcp-server && npx vitest run` passes — already covered

### Verification commands
```bash
# Rust tests
cd src-tauri && cargo test --lib 2>&1 | tail -5

# Frontend tests  
npx vitest run 2>&1 | tail -10

# MCP server tests
cd mcp-server && npx vitest run 2>&1 | tail -5
```

## RESEARCH COMPLETE
