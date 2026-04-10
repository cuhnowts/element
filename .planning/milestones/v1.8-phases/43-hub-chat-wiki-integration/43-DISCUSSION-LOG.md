# Phase 43: Hub Chat Wiki Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 43-Hub Chat Wiki Integration
**Areas discussed:** Dynamic tool loading, System prompt filtering, Wiki command UX, Skill dispatch flow

---

## Dynamic Tool Loading

### How should plugin skills merge into hub chat's tool system?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend ACTION_REGISTRY at runtime | Plugin skills register into the same ACTION_REGISTRY array on mount. Single source of truth. | |
| Separate plugin tool registry | Keep ACTION_REGISTRY for built-ins, add new getPluginToolDefinitions(). HubChat merges both. | ✓ |
| You decide | Claude picks the approach. | |

**User's choice:** Separate plugin tool registry
**Notes:** Cleaner separation between built-in and plugin-contributed tools.

### When should plugin tools refresh in hub chat?

| Option | Description | Selected |
|--------|-------------|----------|
| On chat mount only | Fetch plugin skills once when HubChat mounts. Simple, predictable. | ✓ |
| On every message send | Re-fetch before each AI call. Always up to date but adds latency. | |
| Event-driven refresh | Listen for plugin enable/disable events. Most responsive but complex. | |

**User's choice:** On chat mount only
**Notes:** None

---

## System Prompt Filtering

### How should hub chat decide which tools to include in each AI call?

| Option | Description | Selected |
|--------|-------------|----------|
| Always core + relevant plugins | Built-in always included. Plugin tools added based on enabled plugins. | ✓ |
| Intent classification first | Lightweight first pass classifies intent, then selects matching tools. | |
| Category tags with max budget | Tools tagged with categories, included up to a token budget. | |

**User's choice:** Always core + relevant plugins
**Notes:** At MVP scale (1 wiki plugin) this is effectively "include everything enabled."

### Should the system prompt be dynamically assembled or keep static template?

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic assembly | buildSystemPrompt() pulls tool descriptions from both registries. | ✓ |
| Keep static + append | Keep hardcoded prompt for built-ins, append Plugin Tools section. | |
| You decide | Claude picks. | |

**User's choice:** Dynamic assembly
**Notes:** No more hardcoded tool list in the prompt string.

---

## Wiki Command UX

### How should users trigger wiki operations in hub chat?

| Option | Description | Selected |
|--------|-------------|----------|
| Natural language only | User says "add this to the wiki" — LLM picks the right tool. | ✓ |
| Natural language + slash shortcuts | NL works, but /wiki query, /wiki ingest also recognized. | |
| You decide | Claude picks. | |

**User's choice:** Natural language only
**Notes:** Consistent with existing chat UX where there are no slash commands.

### How should wiki ingest work from chat?

| Option | Description | Selected |
|--------|-------------|----------|
| Paste content inline | User pastes text and says "add this to the wiki." | ✓ |
| File path reference | User provides a file path like "ingest ~/notes/meeting.md." | |
| Both paste and file path | Support both, LLM detects which. | |

**User's choice:** Paste content inline
**Notes:** Simple, no file picker needed.

### How should wiki query results appear in chat?

| Option | Description | Selected |
|--------|-------------|----------|
| Synthesized answer inline | LLM provides natural language answer with wiki page citations. | ✓ |
| Raw article excerpts | Show matched article snippets directly, then brief summary. | |
| You decide | Claude picks. | |

**User's choice:** Synthesized answer inline
**Notes:** Consistent with WIKI-02 requirement.

---

## Skill Dispatch Flow

### Should wiki operations require user confirmation before executing?

| Option | Description | Selected |
|--------|-------------|----------|
| Ingest = confirm, Query/Lint = auto | Ingest shows ActionConfirmCard. Query and lint auto-execute. | ✓ |
| All auto-execute | No confirmation for any operation. | |
| All require confirmation | Every operation shows a confirmation card. | |

**User's choice:** Ingest = confirm, Query/Lint = auto
**Notes:** Ingest writes to filesystem, consistent with existing destructive action pattern.

### How should wiki operation progress appear in chat?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline status message | Brief "Ingesting document..." that resolves to result. | ✓ |
| Streaming progress | Stream updates as operation runs. | |
| You decide | Claude picks. | |

**User's choice:** Inline status message
**Notes:** Similar to existing ActionResultCard pattern.

### How should wiki operation errors appear in chat?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error in conversation | Error as natural bot message explaining the issue. | ✓ |
| ActionResultCard with error state | Structured error card component. | |
| You decide | Claude picks. | |

**User's choice:** Inline error in conversation
**Notes:** Consistent with existing chat error handling.

## Claude's Discretion

- Internal structure of the plugin tool registry
- Exact format of wiki operation status messages
- Error message wording and formatting

## Deferred Ideas

None — discussion stayed within phase scope.
