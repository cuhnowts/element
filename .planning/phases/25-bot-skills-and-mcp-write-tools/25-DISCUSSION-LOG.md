# Phase 25: Bot Skills and MCP Write Tools - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 25-bot-skills-and-mcp-write-tools
**Areas discussed:** Action dispatch model, Confirmation UX, Shell execution scope, Write tool surface

---

## Action Dispatch Model

### Q1: How should the hub chat LLM produce actions?

| Option | Description | Selected |
|--------|-------------|----------|
| Tool-use native | LLM calls structured tool_use blocks. Chat frontend parses tool_use from streaming response and dispatches to Tauri commands. | ✓ |
| JSON action blocks | LLM outputs JSON block in text response. Chat frontend extracts and parses it. | |
| You decide | Claude picks based on existing AI gateway support. | |

**User's choice:** Tool-use native
**Notes:** Preferred because it's type-safe and provider-native. AI gateway already supports tool definitions.

### Q2: Should hub chat and background agent share the same action registry?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared registry | One action registry defines all skills with metadata. Both paths validate against same schema. | ✓ |
| Separate paths | Hub chat dispatches directly to Tauri invoke(). MCP server has its own handlers. Share Tauri commands but not registry. | |
| You decide | Claude picks based on codebase. | |

**User's choice:** Shared registry
**Notes:** Single source of truth for action definitions.

### Q3: How should action results appear in chat?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline result card | Compact card inline in chat showing what was created/changed. | |
| Text confirmation only | Bot says "Done" with markdown text. | |
| You decide | Claude picks best UX. | ✓ |

**User's choice:** You decide
**Notes:** Deferred to Claude's discretion.

---

## Confirmation UX

### Q1: Where should destructive action confirmations appear in hub chat?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline chat prompt | Bot renders warning with Approve/Reject buttons inline in conversation. | ✓ |
| Reuse approval queue | Destructive actions go through existing agent approval queue in Activity tab. | |
| You decide | Claude picks based on existing infrastructure. | |

**User's choice:** Inline chat prompt
**Notes:** Keeps flow in the conversation rather than switching to agent panel.

### Q2: What should count as 'destructive'?

| Option | Description | Selected |
|--------|-------------|----------|
| Deletes + shell commands | Only delete operations and shell command execution require confirmation. | |
| Deletes + shell + status changes | Adds status changes that could lose data. | |
| Registry-flagged | Each action has destructive boolean in registry. Starts with deletes + shell, extensible. | ✓ |

**User's choice:** Registry-flagged
**Notes:** Registry is single source of truth for destructive classification.

### Q3: Background agent destructive action path?

| Option | Description | Selected |
|--------|-------------|----------|
| Approval queue | Background agent keeps using existing approval queue. Chat confirmation is only for interactive hub chat. | ✓ |
| Route to hub chat | Background agent surfaces destructive actions in hub chat. | |
| You decide | Claude picks. | |

**User's choice:** Approval queue
**Notes:** Existing infrastructure already handles this. No need to change background agent flow.

---

## Shell Execution Scope

### Q1: How restrictive should the shell command allowlist be?

| Option | Description | Selected |
|--------|-------------|----------|
| Tight allowlist | Explicit list of allowed commands. Anything not on list is rejected. User-extensible via settings. | ✓ |
| Blocklist approach | Allow everything except dangerous commands. | |
| All commands + confirmation | No allowlist, every command requires confirmation. | |

**User's choice:** Tight allowlist
**Notes:** Safe default. Includes git, npm/yarn/pnpm, ls, cat, head, tail, wc, echo, date, pwd.

### Q2: CWD behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Project CWD auto | Default to project's linked directory. Falls back to home directory. | ✓ |
| Always explicit CWD | Every command must specify working directory. | |
| You decide | Claude picks. | |

**User's choice:** Project CWD auto
**Notes:** Natural default based on chat context.

### Q3: Shell output display?

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible block | Collapsible code block. Expanded for <20 lines, collapsed for longer. Truncated at ~200 lines. | ✓ |
| Inline code block | Standard markdown code block, no collapse. | |
| You decide | Claude picks. | |

**User's choice:** Collapsible block

---

## Write Tool Surface

### Q1: Which write operations for MCP?

| Option | Description | Selected |
|--------|-------------|----------|
| Task CRUD | create_task, update_task, update_task_status, delete_task | ✓ |
| Phase status updates | update_phase_status | ✓ |
| File creation | create_file to project linked directory | ✓ |
| Project/theme CRUD | create_project, create_theme | ✓ |

**User's choice:** All four categories
**Notes:** Full write surface for maximum agent capability.

### Q2: Delete operations for background agent?

| Option | Description | Selected |
|--------|-------------|----------|
| Both paths with approval | Background agent can delete but must go through approval queue. Chat uses inline confirmation. | ✓ |
| Chat-only deletes | Background agent cannot delete. Only interactive chat with confirmation. | |
| You decide | Claude picks. | |

**User's choice:** Both paths with approval
**Notes:** Deletes always require human approval regardless of path.

---

## Claude's Discretion

- Action result feedback UX in hub chat (inline card vs text confirmation)
- Shell command timeout values
- MCP write tool input schema details
- Specific Tauri command wiring for new operations

## Deferred Ideas

None -- discussion stayed within phase scope
