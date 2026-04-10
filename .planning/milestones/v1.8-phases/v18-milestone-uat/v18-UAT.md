---
status: complete
phase: v1.8-milestone
source: [41-SUMMARY, 42-SUMMARY, 43-SUMMARY, 44-SUMMARY, 45-SUMMARY, 46-SUMMARY]
started: 2026-04-10T21:00:00Z
updated: 2026-04-10T21:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start — App Launches Clean
expected: App boots without errors after rebuild. No white screen, no console migration errors. Sidebar + center panel render.
result: pass

### 2. Drawer Resize — Full Range
expected: Drag the drawer handle up and down freely. It should expand up to ~80% of the screen and collapse fully. No snapping back, no stuck max height.
result: pass

### 3. Plugin System — Core Plugins Loaded
expected: Open Settings. The Plugins section should list 5 core plugins (shell, http, filesystem, calendar, knowledge) all enabled. No error states.
result: pass

### 4. Knowledge Plugin — Skills Registered
expected: The core-knowledge plugin should show as enabled with skills (ingest, query, lint) and owned directory (.knowledge/). Disabling and re-enabling it should work without errors.
result: pass

### 5. Hub Chat — Plugin Tools in Prompt
expected: Open the Element AI tab in the drawer. Start a chat. The AI should have access to plugin-provided tools (wiki query, wiki ingest). Ask it "what tools do you have?" — it should mention knowledge/wiki capabilities.
result: pass (fixed: skills not registered at startup, fresh fetch at send time)

### 6. Hub Chat — Plugin Skill Dispatch
expected: In the hub chat, ask the AI to search the wiki or ingest a page. The dispatch should route through the plugin system (not hardcoded commands). If no wiki content exists, it should return an empty result gracefully, not crash.
result: pass

### 7. MCP Server — Plugin Tools Discoverable
expected: If MCP is configured, the MCP server should list core-knowledge:wiki_query and core-knowledge:wiki_ingest in its available tools. These come from the plugin_mcp_tools DB table, not hardcoded.
result: pass

### 8. TaskDetail — No Black Screen on Bad Task
expected: Select any task. It should render without crashing. If you had a task that previously caused a black screen, it should now gracefully deselect instead of crashing.
result: pass

### 9. Modal Escape Key — CalendarAccounts
expected: Open Settings > Calendar. If a calendar account exists, click disconnect. The confirmation dialog should dismiss when you press Escape.
result: pass

### 10. Modal Escape Key — Phase Delete
expected: If you have a phase/project with a delete option, trigger the delete confirmation. It should dismiss on Escape key.
result: pass (fixed: standaloneTasks not filtered on delete)

### 11. AI Provider — Credential Storage
expected: Go to Settings > AI Providers. Add or edit a provider with an API key. Save it. The key should persist (stored in SQLite now, not OS keychain). Re-opening settings should show the provider still configured.
result: pass

### 12. Test Suite — All Tests Pass
expected: Run `npm test` and `cargo test` from the terminal. All tests should pass with no failures.
result: pass (fixed: terminal cwd fallback to home dir)

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — all issues resolved during UAT]

## Fixes Applied During UAT

1. **Drawer stuck at max height** — react-resizable-panels v4 treats bare numbers as pixels, not percentages. Changed all size props to "N%" string format. Added comments to prevent regression.
2. **Missing secrets table** — Credential storage migrated from OS keychain to SQLite but migration 014 was never created. Added 014_secrets.sql.
3. **Plugin skills not registered at startup** — scan_and_load() registered core plugins but never called skill/MCP registration. Added auto-registration after scan.
4. **Hub chat plugin tools race condition** — System prompt built with stale empty pluginTools state. Now fetches fresh from backend at send time.
5. **Task delete UI not refreshing** — deleteTask filtered `tasks` but not `standaloneTasks`. Added standaloneTasks filter.
6. **Terminal exit code 1** — Invalid cwd caused shell to fail. Added fallback to home directory with warning.
7. **Delete error handling** — Added try/catch to TaskDetail and AppLayout delete handlers.
