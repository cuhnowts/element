# Phase 38: Error Logger - Research

**Researched:** 2026-04-05
**Domain:** Frontend error capture pipeline (TypeScript interceptor + Tauri IPC + Rust file writer)
**Confidence:** HIGH

## Summary

This phase builds a pipeline that intercepts `console.error()` calls in the frontend, batches them, and sends them via Tauri IPC to a Rust command that appends structured JSON lines to `.element/errors.log` in the active project directory. The goal is to give Claude Code and MCP tools a simple `cat .element/errors.log` for frontend observability.

The implementation is straightforward: a TypeScript module patches `console.error` with a re-entrancy guard and buffer, a single Tauri command receives batched entries, and the Rust side does append-only file I/O. The codebase already has all necessary patterns established -- `.element/` directory creation, IPC invoke, project directory resolution, and Rust command registration.

**Primary recommendation:** Build a standalone TypeScript module (not a React hook) that patches `console.error` at app startup in `main.tsx`, paired with a single `log_errors` Rust command that accepts a batch of entries and appends them as JSON lines.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Write to `.element/errors.log` inside each linked project directory. Claude Code runs in the project root and can read it directly without needing a full system path.
- **D-03:** Use JSON lines format -- one JSON object per line. Machine-parseable by Claude Code and MCP tools. Easy to grep and filter.

### Claude's Discretion
- **D-02:** Handle errors outside a project context (hub view, no project selected) -- pick the most practical approach (likely fallback to app_data_dir or drop).
- **Metadata fields:** Claude picks sensible fields for debugging utility (timestamp and message are minimum; stack trace, source file, active view context are reasonable additions).
- **Buffer & flush strategy:** Must satisfy the "no observable UI lag during rapid error sequences" success criterion. Timer-based flush, hybrid, or per-call -- Claude decides based on implementation constraints.
- **Log rotation & retention:** Keep the log useful for debugging without growing unbounded. Truncate on app start, max size rotation, or similar -- Claude decides.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ELOG-01 | Console.error interceptor captures frontend errors and writes to `.element/errors.log` via Tauri IPC | Monkey-patch pattern for `console.error`, Tauri `invoke()` IPC, Rust `OpenOptions::append` file writer, `.element/` directory pattern from onboarding_commands.rs |
| ELOG-02 | Error logger has re-entrancy guard and buffered writes to prevent performance impact | Boolean guard flag prevents recursion, timer-based batch flush (500ms debounce), batch IPC reduces overhead |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tauri-apps/api | 2.x (existing) | `invoke()` for IPC calls to Rust backend | Already in project, standard Tauri IPC mechanism |
| serde / serde_json | 1.x (existing) | Serialize/deserialize log entries in Rust | Already in Cargo.toml |
| chrono | 0.4 (existing) | Server-side timestamps on log entries | Already in Cargo.toml |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| std::fs::OpenOptions | stdlib | Append-mode file writes in Rust | For the log writer -- no external crate needed |

No new dependencies are required. Everything needed is already in the project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── errorLogger.ts        # Standalone module (NOT a hook) -- patches console.error
src-tauri/src/
├── commands/
│   └── error_log_commands.rs  # Single Tauri command: log_errors
```

### Pattern 1: Standalone Module (not React Hook)
**What:** The error logger must be a plain TypeScript module, not a React hook. It patches `console.error` once at app startup and runs outside the React lifecycle.
**When to use:** Always -- this runs before React mounts.
**Why:** A React hook would only work inside components, would re-attach on re-renders, and cannot capture errors during initial load. The interceptor must be active from the moment the app starts.

**Example initialization in main.tsx:**
```typescript
// src/main.tsx -- add before renderApp()
import { initErrorLogger } from "./lib/errorLogger";
initErrorLogger();
```

### Pattern 2: Monkey-Patch with Re-entrancy Guard
**What:** Save the original `console.error`, replace it with a wrapper that captures arguments, guards against recursion, buffers entries, and calls the original.
**When to use:** The core ELOG-01 + ELOG-02 pattern.

```typescript
// src/lib/errorLogger.ts
const originalConsoleError = console.error;
let isLogging = false; // re-entrancy guard
let buffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

console.error = (...args: unknown[]) => {
  // Always call original first
  originalConsoleError.apply(console, args);
  
  // Re-entrancy guard: if we're already inside the logger, bail
  if (isLogging) return;
  isLogging = true;
  
  try {
    buffer.push(formatEntry(args));
    scheduleFlush();
  } finally {
    isLogging = false;
  }
};
```

### Pattern 3: Timer-Based Batch Flush
**What:** Buffer entries and flush via a single IPC call on a 500ms debounce timer. If the buffer exceeds a threshold (e.g., 20 entries), flush immediately.
**When to use:** Satisfies ELOG-02 "no observable UI lag" requirement.

```typescript
function scheduleFlush() {
  if (flushTimer) return; // already scheduled
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 500);
}

function flush() {
  if (buffer.length === 0) return;
  const entries = buffer.splice(0);
  // Fire-and-forget -- do NOT await, do NOT log errors from this path
  invoke("log_errors", { entries }).catch(() => {
    // Silently drop -- logging errors about logging causes infinite loops
  });
}
```

### Pattern 4: Rust Append-Only Writer
**What:** The Rust command receives a batch of entries, opens the file in append mode, writes JSON lines, and closes.
**When to use:** The backend half of the pipeline.

```rust
#[tauri::command]
pub async fn log_errors(
    project_dir: String,
    entries: Vec<ErrorLogEntry>,
) -> Result<(), String> {
    let log_path = PathBuf::from(&project_dir)
        .join(".element")
        .join("errors.log");
    
    // Ensure .element/ exists
    if let Some(parent) = log_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create .element dir: {}", e))?;
    }
    
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("Failed to open error log: {}", e))?;
    
    for entry in &entries {
        let line = serde_json::to_string(entry)
            .map_err(|e| format!("Failed to serialize: {}", e))?;
        writeln!(file, "{}", line)
            .map_err(|e| format!("Failed to write: {}", e))?;
    }
    
    Ok(())
}
```

### Pattern 5: Project Directory Resolution
**What:** The frontend must pass the active project's `directoryPath` to the IPC call. When no project is selected, either drop errors or fall back to `app_data_dir`.
**When to use:** Every flush call.

The project store (`projectSlice.ts`) has `selectedProjectId` and projects have `directoryPath`. The error logger module needs a way to get the current project directory. Options:

1. **Recommended:** Export a setter function `setProjectDirectory(path: string | null)` that the App component calls when the active project changes. The logger stores this as module-level state.
2. This avoids coupling the logger to Zustand and keeps it as a standalone module.

```typescript
// In the logger module
let currentProjectDir: string | null = null;

export function setProjectDirectory(dir: string | null) {
  currentProjectDir = dir;
}

// In flush():
if (!currentProjectDir) return; // drop errors when no project context
```

**Recommendation for D-02:** Drop errors when no project is selected. The hub view rarely produces actionable frontend errors, and writing to `app_data_dir` creates a file Claude Code cannot find. Simplicity wins.

### Anti-Patterns to Avoid
- **React hook for the interceptor:** Would only work inside mounted components, misses errors during startup, and re-attaches on every render.
- **Awaiting the invoke call:** Creates backpressure -- if the IPC is slow, the error handler blocks. Fire-and-forget with `.catch(() => {})`.
- **Logging errors from the error logger:** Any `console.error` inside the flush path triggers infinite recursion. The re-entrancy guard handles this, but additionally, all error handling in the flush path must be silent.
- **Per-call IPC:** Each `console.error` triggering a separate `invoke()` causes observable lag during rapid error sequences (React error boundaries can fire dozens of errors).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON serialization | Custom string formatting | `serde_json::to_string` (Rust) / `JSON.stringify` (TS) | Edge cases with special characters, nested objects |
| File locking | Cross-process mutex | `OpenOptions::append` | Append mode is atomic for writes under PIPE_BUF (4KB) on POSIX -- single-process is fine here |
| Timestamp formatting | Manual date formatting | `chrono::Utc::now().to_rfc3339()` (Rust) | Consistent ISO 8601 format |
| Stack trace extraction | Regex parsing | `new Error().stack` in JS, pass as string | Browser engines produce consistent stack traces |

## Common Pitfalls

### Pitfall 1: Infinite Recursion
**What goes wrong:** An error inside the logging path calls `console.error`, which triggers the interceptor again, causing a stack overflow.
**Why it happens:** The invoke call fails, the catch handler logs the error, which re-enters the interceptor.
**How to avoid:** Boolean re-entrancy guard (`isLogging` flag) checked before any processing. All error handling in the flush path must silently swallow errors.
**Warning signs:** App freezes or crashes immediately after the first `console.error` call.

### Pitfall 2: Missing .element Directory
**What goes wrong:** The Rust command tries to open `errors.log` but `.element/` does not exist yet in the project directory.
**Why it happens:** Fresh project, or directory not yet created by onboarding flow.
**How to avoid:** Always `create_dir_all` before opening the file. The onboarding_commands.rs pattern already does this.
**Warning signs:** "Failed to open error log" errors silently dropped.

### Pitfall 3: Unbounded Log Growth
**What goes wrong:** The log file grows to megabytes over days/weeks, becoming slow to read and wasting disk.
**Why it happens:** No rotation or truncation mechanism.
**How to avoid:** Truncate on app start (simplest) or rotate when file exceeds 1MB. Truncation on start is recommended -- Claude Code only needs errors from the current session.
**Warning signs:** `.element/errors.log` larger than a few hundred KB.

### Pitfall 4: Capability Permission Missing
**What goes wrong:** The `invoke("log_errors", ...)` call silently fails because the command is not listed in Tauri's capability permissions.
**Why it happens:** Tauri v2 requires explicit command permissions in `default.json`.
**How to avoid:** Tauri v2 auto-generates permissions for `#[tauri::command]` handlers registered in `generate_handler!`. Custom commands registered this way do NOT need manual permission entries in `default.json` -- they are allowed by default. Only plugin commands need explicit permissions.
**Warning signs:** IPC calls fail with permission denied errors.

### Pitfall 5: Serialization of Complex Arguments
**What goes wrong:** `console.error` is called with DOM elements, circular references, or Error objects that don't serialize cleanly.
**Why it happens:** `console.error(someElement, new Error("..."))` is common.
**How to avoid:** Convert all arguments to strings before buffering: `args.map(a => typeof a === 'string' ? a : a instanceof Error ? a.stack || a.message : String(a)).join(' ')`.
**Warning signs:** JSON.stringify throws or produces `[object Object]`.

## Code Examples

### Log Entry Format (JSON Lines)
```json
{"timestamp":"2026-04-05T14:30:00.000Z","level":"error","message":"Failed to fetch tasks","stack":"Error: Failed to fetch tasks\n    at fetchTasks (taskSlice.ts:42)","view":"project-detail","source":"console.error"}
```

### Recommended Metadata Fields
```typescript
interface ErrorLogEntry {
  timestamp: string;    // ISO 8601 from frontend (Date.now())
  level: "error";       // Always "error" for this phase
  message: string;      // First argument stringified
  stack?: string;       // If an Error object is in args
  view?: string;        // Active view from UI state (optional enrichment)
}
```

### Rust Struct
```rust
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ErrorLogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub view: Option<String>,
}
```

### Truncation on App Start
```rust
// In the Tauri command, or called once during setup
fn truncate_if_oversized(path: &Path, max_bytes: u64) -> std::io::Result<()> {
    if let Ok(meta) = std::fs::metadata(path) {
        if meta.len() > max_bytes {
            // Truncate to empty -- start fresh
            std::fs::write(path, "")?;
        }
    }
    Ok(())
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 (TS) + cargo test (Rust) |
| Config file | None for Vitest (uses vite.config.ts defaults), Cargo.toml for Rust |
| Quick run command | `npx vitest run src/lib/errorLogger.test.ts` |
| Full suite command | `npx vitest run && cargo test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ELOG-01 | console.error interceptor captures and formats entries | unit | `npx vitest run src/lib/errorLogger.test.ts -t "captures"` | No -- Wave 0 |
| ELOG-01 | Rust command writes JSON lines to file | unit | `cargo test -p element --lib error_log` | No -- Wave 0 |
| ELOG-02 | Re-entrancy guard prevents infinite recursion | unit | `npx vitest run src/lib/errorLogger.test.ts -t "reentran"` | No -- Wave 0 |
| ELOG-02 | Buffer flushes on timer, not per-call | unit | `npx vitest run src/lib/errorLogger.test.ts -t "buffer"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/errorLogger.test.ts`
- **Per wave merge:** `npx vitest run && cargo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/errorLogger.test.ts` -- covers ELOG-01 interceptor + ELOG-02 guard/buffer
- [ ] Rust test in `error_log_commands.rs` -- covers ELOG-01 file write
- [ ] Vitest config may need to be created if Phase 37 hasn't run yet (check at execution time)

## Open Questions

1. **Vitest configuration status**
   - What we know: `package.json` has vitest 4.1.0 as devDependency and test scripts, but no `vitest.config.ts` exists yet
   - What's unclear: Whether Phase 37 (Backend Testing) will have run before Phase 38, creating the config
   - Recommendation: Phase 38 should check for vitest config and create a minimal one if absent. The test files for the error logger are simple unit tests that don't need React/DOM setup.

2. **Active view context enrichment**
   - What we know: The UI store has `activeView` state that could be included in log entries
   - What's unclear: Whether coupling the logger to the UI store is worth the debugging value
   - Recommendation: Start without it (keep the module standalone). Add it later if logs prove hard to contextualize. The `view` field should be optional in the schema.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src-tauri/src/commands/onboarding_commands.rs` -- `.element/` directory pattern
- Codebase analysis: `src-tauri/src/lib.rs` -- Command registration, plugin setup, IPC handler pattern
- Codebase analysis: `src-tauri/src/commands/mod.rs` -- Module organization
- Codebase analysis: `src/main.tsx` -- App entry point for interceptor initialization
- Codebase analysis: `src/hooks/useAgentQueue.ts` -- `invoke()` IPC usage pattern
- Codebase analysis: `src/stores/projectSlice.ts` -- Project directory path access

### Secondary (MEDIUM confidence)
- Tauri v2 command permissions -- verified that `generate_handler!` commands are auto-permitted (no `default.json` entry needed for custom commands)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing crate/package usage
- Architecture: HIGH -- directly follows established codebase patterns for IPC, file I/O, and `.element/` usage
- Pitfalls: HIGH -- common patterns well-understood (re-entrancy, serialization edge cases, file rotation)

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable domain, no moving parts)
