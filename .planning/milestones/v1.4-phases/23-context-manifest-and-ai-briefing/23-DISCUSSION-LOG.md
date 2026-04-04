# Phase 23: Context Manifest and AI Briefing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 23-context-manifest-and-ai-briefing
**Areas discussed:** Manifest scope and structure, Briefing generation and delivery, Manifest refresh strategy, Briefing content and personalization

---

## Manifest Scope and Structure

### What entities should the manifest include?

| Option | Description | Selected |
|--------|-------------|----------|
| Projects + phases only | Project names, current phase, phase progress %. Stays compact within 2000 tokens even at scale. | ✓ |
| Projects + phases + overdue tasks | Add overdue/blocked tasks to the project+phase summary. Gives specific action items. | |
| Full hierarchy | Themes → projects → phases → all active tasks. Most complete but likely blows token budget. | |

**User's choice:** Projects + phases only
**Notes:** None

### How should the manifest be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Structured markdown | Sections per project with phase name, status, progress %. Easy for LLM to parse. | ✓ |
| Flat JSON object | Machine-readable JSON blob. More token-efficient but less natural for LLM consumption. | |
| Natural language paragraph | Pre-written prose summary. Most readable but hardest to keep under budget. | |

**User's choice:** Structured markdown
**Notes:** None

### Where should the manifest be built?

| Option | Description | Selected |
|--------|-------------|----------|
| Rust Tauri command | New command queries SQLite directly, formats markdown, returns string. Reusable by MCP sidecar. | ✓ |
| TypeScript in the frontend | Assemble from Zustand store data. No new command needed but duplicates data access logic. | |
| You decide | Claude picks the best approach based on architecture. | |

**User's choice:** Rust Tauri command
**Notes:** None

### Token budget enforcement?

| Option | Description | Selected |
|--------|-------------|----------|
| Character-based estimate | ~4 chars/token heuristic to estimate and truncate. Simple, no dependencies. | ✓ |
| Exact tokenizer | Use tiktoken or similar for precise count. Adds a dependency. | |
| No enforcement | Trust the format to stay within budget. Add enforcement later if needed. | |

**User's choice:** Character-based estimate
**Notes:** None

---

## Briefing Generation and Delivery

### Which AI path for generation?

| Option | Description | Selected |
|--------|-------------|----------|
| Rust AI gateway | Use existing AI provider system. Rust makes API call, streams via Tauri events. | ✓ |
| Direct frontend fetch | TypeScript calls LLM API directly. Simpler but bypasses Rust AI gateway. | |
| MCP agent generates it | Central agent generates briefing in its orchestration loop. Couples to agent availability. | |

**User's choice:** Rust AI gateway
**Notes:** None

### How should the briefing stream into the hub?

| Option | Description | Selected |
|--------|-------------|----------|
| Chunked Tauri events | Stream chunks via Tauri events. Hub component listens and appends. | ✓ |
| Single response after completion | Wait for full response, send all at once. No streaming UX. | |
| You decide | Claude picks based on existing patterns. | |

**User's choice:** Chunked Tauri events
**Notes:** None

### Auto-generate or manual trigger?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto on hub load | Generates automatically when hub mounts. Manual refresh also available. | |
| Manual trigger only | User clicks button to generate. Saves tokens but adds friction. | |
| Auto once per session | Auto on first hub visit per session. Cached result with refresh button. | |

**User's choice:** Other (free text)
**Notes:** "It should be auto, manually refreshable, but also on a time loop. Every few hours. If the user is not getting things done, tasks will start to stack up. It should nudge the user. If they are ahead, it should say, hey, great work, what else do you want to work on today?"

---

## Manifest Refresh Strategy

### When should the manifest rebuild?

| Option | Description | Selected |
|--------|-------------|----------|
| Debounced on mutations | Rebuild after task/phase status changes, debounced (~5s). | ✓ |
| On-demand only | Rebuild only when briefing requests it. Simpler but could be stale. | |
| Event-driven with dirty flag | Dirty flag on mutations, lazy rebuild on read. Most efficient but adds state tracking. | |

**User's choice:** Debounced on mutations
**Notes:** None

### Where should the cached manifest live?

| Option | Description | Selected |
|--------|-------------|----------|
| Rust-side in-memory cache | Arc<Mutex<String>>. Tauri command returns instantly. MCP sidecar can read it. | ✓ |
| Frontend Zustand store | TypeScript store holds manifest. Only accessible from frontend. | |
| You decide | Claude picks caching strategy. | |

**User's choice:** Rust-side in-memory cache
**Notes:** None

---

## Briefing Content and Personalization

### Greeting style?

| Option | Description | Selected |
|--------|-------------|----------|
| Warm and concise | "Good morning, Jake. Here's your day." Friendly but fast. | ✓ |
| Professional and minimal | No greeting — jumps to priorities. | |
| Conversational coach | "Hey Jake — solid progress yesterday." More personality. | |

**User's choice:** Warm and concise
**Notes:** None

### Edge state handling?

| Option | Description | Selected |
|--------|-------------|----------|
| Adaptive messaging | Context-appropriate messages for zero projects, all caught up, etc. | ✓ |
| Always show structure | Full layout with empty sections even when nothing exists. | |
| You decide | Claude picks edge state messaging. | |

**User's choice:** Adaptive messaging
**Notes:** None

### Time-of-day awareness?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, time-of-day aware | Greeting shifts with time. Afternoon refreshes highlight what's left. | ✓ |
| No, keep it static | Same tone regardless of time. | |
| You decide | Claude determines if time-awareness adds value. | |

**User's choice:** Yes, time-of-day aware
**Notes:** None

### Briefing rendering?

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown rendering | Stream raw markdown, render with react-markdown or similar. Flexible. | ✓ |
| Structured UI components | Parse LLM output into structured data, render with custom components. Prettier but fragile. | |
| You decide | Claude picks based on existing patterns. | |

**User's choice:** Markdown rendering
**Notes:** None

---

## Claude's Discretion

- Specific LLM system prompt content and structure
- Debounce timing tuning
- Time loop interval (2-3 hours guidance)
- Markdown rendering library choice
- Briefing loading skeleton/placeholder design
- Whether to show "last refreshed" timestamp

## Deferred Ideas

None — discussion stayed within phase scope
