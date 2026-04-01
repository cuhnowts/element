# Phase 24: Hub Chat - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 24-hub-chat
**Areas discussed:** Chat UI layout, Streaming & markdown, Conversation model, Agent panel boundary

---

## Chat UI Layout

### Message Display Style

| Option | Description | Selected |
|--------|-------------|----------|
| Bubble style | User messages right-aligned, bot left-aligned with distinct backgrounds -- iMessage/Discord pattern | ✓ |
| Flat thread | Single column, differentiated by avatar/name label -- Slack/GitHub pattern | |
| You decide | Claude picks based on hub column structure | |

**User's choice:** Bubble style
**Notes:** None

### Chat Placement in Hub

| Option | Description | Selected |
|--------|-------------|----------|
| Below briefing | Briefing at top, chat below, input pinned to bottom of center column | ✓ |
| Replaces briefing | Briefing transforms into chat on first message | |
| Tabbed view | Briefing / Chat tabs at top of center column | |

**User's choice:** Below briefing
**Notes:** None

### Input Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-expand | Textarea grows up to ~4 lines, Enter sends, Shift+Enter newline | ✓ |
| Single-line | Fixed single-line, Enter sends | |
| You decide | Claude picks | |

**User's choice:** Auto-expand
**Notes:** None

### Empty State

| Option | Description | Selected |
|--------|-------------|----------|
| Suggestion chips | 3-4 clickable prompt suggestions below briefing | ✓ |
| Just the input | No suggestions, briefing flows into input | |
| You decide | Claude picks | |

**User's choice:** Suggestion chips
**Notes:** None

---

## Streaming & Markdown

### Streaming Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Token-by-token render | Markdown renders progressively with blinking cursor, uses existing complete_stream() | ✓ |
| Chunked render | Buffer tokens, render in sentence-sized chunks | |
| You decide | Claude picks | |

**User's choice:** Token-by-token render
**Notes:** None

### Markdown Fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Full markdown | Headers, bold/italic, lists, code blocks with syntax highlighting, tables, links | ✓ |
| Basic markdown | Bold, italic, lists, inline code, code blocks without syntax highlighting | |
| You decide | Claude picks | |

**User's choice:** Full markdown
**Notes:** None

### Stop Generation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, stop button | Show "Stop generating" while streaming, cancel and keep partial output | ✓ |
| No stop button | Let it finish | |
| You decide | Claude decides | |

**User's choice:** Yes, stop button
**Notes:** None

---

## Conversation Model

### Context Injection

| Option | Description | Selected |
|--------|-------------|----------|
| System prompt injection | Manifest injected into system prompt on every LLM call | ✓ |
| On-demand retrieval | Fetch project state only when user asks about specific project | |
| You decide | Claude picks | |

**User's choice:** System prompt injection
**Notes:** None

### History Management

| Option | Description | Selected |
|--------|-------------|----------|
| Full history, capped | All messages sent, capped at ~20 turns, trimmed from front | ✓ |
| Sliding window | Only last N messages regardless of total | |
| You decide | Claude picks | |

**User's choice:** Full history, capped
**Notes:** None

### History Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Session-only | Chat clears on app restart, HUB-14 deferred | ✓ |
| Persist to SQLite | Save to DB, restore on launch | |
| You decide | Claude picks | |

**User's choice:** Session-only
**Notes:** None

### Deep Context Access

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-fetch on mention | System detects project mention, injects .planning/ files into next LLM call | ✓ |
| Explicit "dig in" command | User types /details to trigger deep context loading | |
| You decide | Claude picks | |

**User's choice:** Auto-fetch on mention
**Notes:** User described the pattern as "have enough knowledge to slide by until pressed about it" -- manifest for broad awareness, .planning/ files for depth on demand. Like a skill that loads context lazily.

---

## Agent Panel Boundary

### Shared State

| Option | Description | Selected |
|--------|-------------|----------|
| Fully separate | Own Zustand store (useHubChatStore), no shared state with useAgentStore | ✓ |
| Shared AI provider only | Same provider from Settings, nothing else shared | |
| You decide | Claude decides | |

**User's choice:** Fully separate
**Notes:** None

### Agent Panel Visibility on Hub

| Option | Description | Selected |
|--------|-------------|----------|
| Available but closed | Toggle button visible, doesn't auto-open, hub chat doesn't trigger it | ✓ |
| Hidden on hub | Agent panel toggle hidden when on hub view | |
| You decide | Claude picks | |

**User's choice:** Available but closed
**Notes:** None

### Notification Routing

| Option | Description | Selected |
|--------|-------------|----------|
| Agent panel + toast only | Notifications to agent badge + Sonner toast, chat stays focused | ✓ |
| Inject into chat | Agent notifications appear as system messages in chat | |
| You decide | Claude decides | |

**User's choice:** Agent panel + toast only
**Notes:** None

---

## Claude's Discretion

- Suggestion chip content and exact wording
- Markdown plugin selection (specific remark/rehype plugins)
- Project mention detection strategy
- Token budget allocation between system prompt, manifest, deep context, and history
- Streaming event protocol (Tauri event names, payload format)
- Error states (provider unavailable, rate limit, network failure)

## Deferred Ideas

- Chat history persistence (HUB-14) -- already in future requirements
- Chat-to-agent handoff -- belongs in Phase 25 (Bot Skills)
