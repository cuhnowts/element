# Phase 41: Plugin Infrastructure Evolution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 41-plugin-infrastructure-evolution
**Areas discussed:** Skill dispatch model, Owned directory lifecycle, Manifest schema design, MCP tool registration

---

## Skill Dispatch Model

### Q1: How should plugin skills integrate with the existing action registry?

| Option | Description | Selected |
|--------|-------------|----------|
| Unified registry | Plugin skills merge into same registry as built-in actions at load time | |
| Separate registries | Built-in actions stay in actionRegistry.ts, plugin skills in parallel registry | ✓ |
| You decide | Claude picks | |

**User's choice:** Separate registries
**Notes:** None

### Q2: When should plugin skills be loaded into the frontend registry?

| Option | Description | Selected |
|--------|-------------|----------|
| On app startup | Fetch all enabled plugin skills once at startup, store in Zustand | ✓ |
| On hub chat mount | Fetch each time HubChat mounts | |
| You decide | Claude picks | |

**User's choice:** On app startup
**Notes:** None

### Q3: How should skill name collisions between plugins be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Prefix enforcement | All plugin skills namespaced as plugin_name:skill_name | ✓ |
| First-registered wins | No prefixing, first loaded wins | |
| You decide | Claude picks | |

**User's choice:** Prefix enforcement
**Notes:** None

### Q4: Should plugin skills support a 'destructive' flag?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, manifest-declared | Plugin manifest includes destructive flag per skill | ✓ |
| All plugin skills confirm | Every plugin skill requires confirmation | |
| No confirmation needed | Execute without confirmation | |
| You decide | Claude picks | |

**User's choice:** Yes, manifest-declared
**Notes:** None

---

## Owned Directory Lifecycle

### Q1: Where should plugin-owned directories be created relative to?

| Option | Description | Selected |
|--------|-------------|----------|
| Project root | Relative to project's linked directory | |
| App data directory | In Tauri's app_data_dir, global | |
| Global home directory | Relative to user home | |

**User's choice:** Initially selected project root, but corrected after requirements review — supports both scopes (see Q2)
**Notes:** Requirements specify global .knowledge/ directory; per-project scoping is out of scope for knowledge plugin

### Q2: Should plugin directory system support both global and per-project?

| Option | Description | Selected |
|--------|-------------|----------|
| Support both scopes | Manifest declares scope: global or project | ✓ |
| Global only for now | All plugin dirs in app_data_dir | |
| You decide | Claude picks | |

**User's choice:** Support both scopes
**Notes:** "The knowledge plugin will be global, but other plugins might want to create local. That's something it would have to decide while it's being created."

### Q3: How should directory paths be validated (PathBuf security fix)?

| Option | Description | Selected |
|--------|-------------|----------|
| Allowlist + sanitize | Relative paths only, no .., no symlinks, resolve against root | ✓ |
| You decide | Claude picks | |
| Chroot-style jail | Each plugin gets dedicated subdirectory | |

**User's choice:** Allowlist + sanitize
**Notes:** None

### Q4: Cleanup mechanism when plugin is disabled?

| Option | Description | Selected |
|--------|-------------|----------|
| No cleanup | Disable preserves everything, no delete mechanism | |
| Optional purge command | Explicit user action to delete owned directories | ✓ |
| You decide | Claude picks | |

**User's choice:** Optional purge command
**Notes:** None

---

## Manifest Schema Design

### Q1: How should lifecycle hooks be defined?

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest-declared | Named actions in plugin.json, host interprets known types | ✓ |
| Convention-based | Exported functions in entry JS file | |
| Implicit from capabilities | Behavior inferred from manifest fields | |
| You decide | Claude picks | |

**User's choice:** Manifest-declared
**Notes:** None

### Q2: Should manifest have a version/schema field?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, manifest_version field | Add manifest_version: 2, old files treated as v1 | ✓ |
| No versioning yet | Rely on optional fields | |
| You decide | Claude picks | |

**User's choice:** Yes, manifest_version field
**Notes:** None

### Q3: How should skill input/output schemas be defined?

| Option | Description | Selected |
|--------|-------------|----------|
| JSON Schema | Same pattern as step_types, input_schema + output_schema | ✓ |
| Minimal (name + description only) | No formal schema | |
| You decide | Claude picks | |

**User's choice:** JSON Schema
**Notes:** None

---

## MCP Tool Registration

### Q1: How should plugin MCP tools be registered with the MCP server?

| Option | Description | Selected |
|--------|-------------|----------|
| DB-backed registry | Plugin host writes to SQLite, MCP server reads on ListTools | ✓ |
| File-based registry | Plugin host writes plugin-tools.json | |
| In-memory shared state | Arc<RwLock> between plugin host and MCP server | |
| You decide | Claude picks | |

**User's choice:** DB-backed registry
**Notes:** None

### Q2: Should plugin MCP tools use same namespace prefixing as skills?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same prefixing | plugin_name:tool_name for both skills and MCP tools | ✓ |
| No prefix for MCP | Bare names for MCP tools | |
| You decide | Claude picks | |

**User's choice:** Yes, same prefixing
**Notes:** None

### Q3: How should plugin MCP tool calls be dispatched?

| Option | Description | Selected |
|--------|-------------|----------|
| Agent queue | Reuses existing MCP-to-Tauri bridge pattern | ✓ |
| Direct HTTP/IPC to Tauri | New communication channel | |
| You decide | Claude picks | |

**User's choice:** Agent queue
**Notes:** None

---

## Claude's Discretion

None — all areas decided by user.

## Deferred Ideas

None — discussion stayed within phase scope.
