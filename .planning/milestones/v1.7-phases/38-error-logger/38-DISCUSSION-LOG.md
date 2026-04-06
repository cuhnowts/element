# Phase 38: Error Logger - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 38-error-logger
**Areas discussed:** Log file location, Log entry format, Buffer & flush strategy, Log rotation & retention

---

## Log File Location

| Option | Description | Selected |
|--------|-------------|----------|
| Project directory | .element/errors.log inside each linked project dir — Claude Code reads directly | ✓ |
| Tauri app_data_dir | ~/Library/Application Support/.../errors.log — single global log | |
| Both | Project .element/ when active, app_data_dir for hub/global errors | |

**User's choice:** Project directory
**Notes:** Claude Code runs in the project root so project-relative is the most natural location.

### Follow-up: Global errors (no project context)

| Option | Description | Selected |
|--------|-------------|----------|
| Drop them | Only log when project is active | |
| Fallback to app_data_dir | Write to app data dir when no project context | |
| You decide | Claude picks most practical approach | ✓ |

**User's choice:** You decide
**Notes:** None

---

## Log Entry Format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON lines | One JSON object per line — machine-parseable, easy to grep/filter | ✓ |
| Plain text | Human-readable format like [timestamp] Error: message | |
| You decide | Claude picks format for downstream consumers | |

**User's choice:** JSON lines
**Notes:** None

### Follow-up: Metadata fields

| Option | Description | Selected |
|--------|-------------|----------|
| Timestamp + message + stack | Core fields only | |
| Active project/view context | Which project was active, what view | |
| Error count/frequency | Dedup counter for repeated errors | |
| You decide | Claude picks sensible metadata | ✓ |

**User's choice:** You decide
**Notes:** None

---

## Buffer & Flush Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Timer-based flush | Collect in JS array, flush every N seconds via single IPC call | |
| Immediate per-error IPC | Each console.error triggers one IPC call | |
| Hybrid (timer + size cap) | Flush every N seconds OR when buffer hits M entries | |
| You decide | Claude picks strategy satisfying "no observable UI lag" criterion | ✓ |

**User's choice:** You decide
**Notes:** None

---

## Log Rotation & Retention

| Option | Description | Selected |
|--------|-------------|----------|
| Truncate on app start | Clear log each launch, current session only | |
| Max file size with rotation | Rotate at size limit (e.g., 1MB) | |
| Append forever | Never truncate, grows until deleted | |
| You decide | Claude picks approach keeping log useful without growing unbounded | ✓ |

**User's choice:** You decide
**Notes:** None

---

## Claude's Discretion

- Global error handling (project vs non-project context)
- Metadata fields per error entry
- Buffer and flush strategy
- Log rotation and retention policy

## Deferred Ideas

None — discussion stayed within phase scope
