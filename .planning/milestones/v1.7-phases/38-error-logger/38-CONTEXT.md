# Phase 38: Error Logger - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Frontend error capture pipeline: intercept `console.error()` calls, batch them, send via Tauri IPC to a Rust command that writes structured entries to `.element/errors.log` in the project directory. Provides frontend observability without component tests — Claude Code and MCP tools read this log to diagnose issues.

</domain>

<decisions>
## Implementation Decisions

### Log File Location
- **D-01:** Write to `.element/errors.log` inside each linked project directory. Claude Code runs in the project root and can read it directly without needing a full system path.
- **D-02:** (Claude's Discretion) Handle errors outside a project context (hub view, no project selected) — pick the most practical approach (likely fallback to app_data_dir or drop).

### Log Entry Format
- **D-03:** Use JSON lines format — one JSON object per line. Machine-parseable by Claude Code and MCP tools. Easy to grep and filter.

### Claude's Discretion
- **Metadata fields:** Claude picks sensible fields for debugging utility (timestamp and message are minimum; stack trace, source file, active view context are reasonable additions).
- **Buffer & flush strategy:** Must satisfy the "no observable UI lag during rapid error sequences" success criterion. Timer-based flush, hybrid, or per-call — Claude decides based on implementation constraints.
- **Log rotation & retention:** Keep the log useful for debugging without growing unbounded. Truncate on app start, max size rotation, or similar — Claude decides.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ELOG-01 (console.error interceptor → .element/errors.log via Tauri IPC), ELOG-02 (re-entrancy guard + buffered writes)

### Existing Patterns
- `src-tauri/src/db/connection.rs` — Tauri `app_data_dir` pattern for resolving data directories
- `src-tauri/src/lib.rs` — App setup, plugin registration, `app_data_dir` usage
- `src-tauri/src/commands/` — Command module organization pattern (new command file goes here)
- `src/hooks/` — Frontend hook patterns (new hook for error interception goes here)

### Codebase Context
- `src-tauri/src/commands/mod.rs` — Command registration (new log_error command must be registered)
- `src-tauri/capabilities/default.json` — Tauri capability permissions (new command needs permission)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Tauri invoke pattern:** Well-established across hooks (useAgentQueue, useTerminal, etc.) — same pattern for log_error IPC call
- **app_data_dir resolution:** `connection.rs` shows how to get Tauri app data directory, create subdirs
- **Command module pattern:** Each domain has its own `*_commands.rs` file registered in `mod.rs`

### Established Patterns
- **State management:** Zustand stores for frontend state; Rust uses `tauri::State<>` for managed state
- **IPC:** Frontend calls `invoke("command_name", { args })` → Rust `#[tauri::command]` handler
- **File I/O in Rust:** tokio async for file operations (see heartbeat, planning_sync)

### Integration Points
- **Frontend:** New hook or module that patches `console.error` globally, likely initialized in app entry point
- **Rust backend:** New command file `error_log_commands.rs` in `src-tauri/src/commands/`
- **Capabilities:** `default.json` needs the new command permission added

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The key constraint is that Claude Code must be able to simply `cat .element/errors.log` from a project directory to see recent frontend errors.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-error-logger*
*Context gathered: 2026-04-05*
