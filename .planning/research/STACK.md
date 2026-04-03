# Stack Research

**Domain:** Desktop scheduling assistant -- calendar sync, local LLM heartbeat, day/week calendar view, background scheduling agent
**Researched:** 2026-04-02
**Confidence:** HIGH

## Existing Stack (DO NOT change)

Already validated and shipping. Listed for context only:

| Technology | Version | Purpose |
|------------|---------|---------|
| Tauri | ~2.10 | Desktop shell, Rust backend |
| React | ^19.2.4 | Frontend UI |
| SQLite (rusqlite) | 0.32 | Local-first storage |
| Zustand | ^5.0.11 | State management |
| shadcn/ui + Tailwind | v4.2.1 | Component library + styling |
| tokio | 1 (full) | Async runtime |
| reqwest | 0.12 | HTTP client (already used for calendar API calls) |
| chrono | 0.4 | Date/time handling |
| @modelcontextprotocol/sdk | ^1.28.0 | MCP server sidecar |
| better-sqlite3 | ^11.0.0 | MCP server DB access |
| tokio-cron-scheduler | 0.15 | Cron job scheduling |

## Recommended Stack Additions

### 1. Calendar MCP Tools -- No new libraries needed

**Decision: Extend existing MCP server with calendar SQL queries.**

The MCP server (`mcp-server/`) already reads the same SQLite DB that the Rust backend writes to. Calendar events are already stored in `calendar_events` table by the existing sync pipeline. New MCP tools (`list_calendar_events`, `create_time_block`, `move_time_block`, `delete_time_block`) are pure SQL operations against existing tables via `better-sqlite3`.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| (none new) | -- | Calendar MCP tools | Existing `better-sqlite3` + `@modelcontextprotocol/sdk` already in `mcp-server/package.json`. Tools are SQL queries, not new dependencies. |

**Critical: OAuth scope upgrade required (not a library change).** Current scopes are read-only:
- Google: `calendar.readonly` --> needs `https://www.googleapis.com/auth/calendar.events` for write
- Microsoft: `Calendars.Read` --> needs `Calendars.ReadWrite`

This is a code change in `calendar.rs` (lines 127, 143) and `calendar_commands.rs` (line 210), not a new dependency. Users with existing tokens will need to re-authenticate to get upgraded scopes.

### 2. Local LLM (Heartbeat) -- Use reqwest directly against Ollama API

**Decision: Call Ollama's HTTP API via reqwest. No Rust Ollama crate.**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Ollama (runtime) | 0.18.x | Local LLM server | De facto standard for local LLM hosting. OpenAI-compatible API at `localhost:11434`. 165k+ GitHub stars, active development (0.18.0 released March 2026). |
| reqwest (existing) | 0.12 | HTTP client for Ollama | Already a dependency. Ollama's API is two endpoints: `POST /api/chat` (streaming) and `POST /api/chat` with `"stream": false` (non-streaming). Adding a dedicated crate like `ollama-rs` is unnecessary overhead for what amounts to one HTTP POST with JSON body. |

**Why NOT add ollama-rs or ollama-rest-rs:**
- reqwest is already in `Cargo.toml` and battle-tested in this codebase (used for Google/Microsoft calendar API calls)
- Ollama's API surface is tiny: one endpoint for chat, one for health check (`GET /api/tags`)
- Adding a crate means tracking its release cycle, compatibility, and potential tokio version conflicts
- The heartbeat only needs non-streaming completions (fire request, get JSON response, parse)

**Ollama API contract for heartbeat:**
```
POST http://localhost:11434/api/chat
{
  "model": "llama3.2:3b",
  "messages": [{"role": "user", "content": "..."}],
  "stream": false
}
```
Response: `{ "message": { "role": "assistant", "content": "..." }, "done": true }`

**Model recommendation:** `llama3.2:3b` (or `phi-4-mini`) -- small enough to run on 8GB RAM Macs, fast enough for periodic background checks (< 5s response for short prompts). User should configure model name in settings.

### 3. Hub Calendar View -- Build custom with Tailwind, no calendar library

**Decision: Custom day/week calendar grid using Tailwind CSS + date-fns.**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| date-fns | ^4.1.0 | Date arithmetic (week boundaries, day iteration, formatting) | Lightweight (tree-shakeable), no moment.js baggage. Handles `startOfWeek`, `eachDayOfInterval`, `format`, `addDays` etc. |

**Why NOT react-big-calendar:**
- Brings its own CSS, event model, and drag system -- fights shadcn/ui theming
- 1.19.4 last published 10 months ago (lower maintenance cadence)
- The calendar view in Element is NOT a general-purpose calendar -- it shows two specific things: external calendar events (read-only blocks) and Element schedule blocks (work time). This is a constrained layout, not a full event management UI.
- Custom Tailwind grid gives pixel-perfect control matching existing shadcn aesthetic
- Google Calendar-style time grid is ~200 lines of TSX: a 24-row grid with positioned event/block overlays

**Why NOT @daypilot/daypilot-lite-react:**
- Heavy library for a simple need
- Its own styling system conflicts with Tailwind/shadcn

**Implementation pattern:**
```
7-column CSS grid (week) or 1-column (day)
Each column: 24 time slots (or work-hours subset)
Events/blocks: absolute-positioned divs within column, top/height calculated from start/end times
Color coding: calendar events (muted), work blocks (accent), breaks (transparent)
```

The existing `react-day-picker` (^9.14.0, already installed) handles the mini-calendar date picker in the sidebar -- keep using it for date navigation.

### 4. Background Heartbeat Timer -- Use tokio::spawn + tokio::time::interval

**Decision: Tokio interval loop spawned at app startup. No new crate.**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| tokio::time::interval (existing) | 1.x | Periodic heartbeat timer | Already available via `tokio = { features = ["full"] }` in Cargo.toml. `interval(Duration::from_secs(N))` is the standard Rust async pattern for periodic work. |

**Why NOT tokio-cron-scheduler for this:**
- Already used for workflow cron jobs, but cron is overkill for a simple "every N minutes" check
- `tokio::time::interval` is simpler, more precise, and doesn't need cron expression parsing
- The heartbeat period should be configurable (default: 30 min) via a settings value, not a cron string

**Architecture:**
```rust
// Spawned once in setup() or after app.run()
tauri::async_runtime::spawn(async move {
    let mut interval = tokio::time::interval(Duration::from_secs(1800)); // 30 min
    loop {
        interval.tick().await;
        // 1. Check if Ollama is running (GET /api/tags)
        // 2. If yes: build context (deadlines, schedule, overdue tasks)
        // 3. POST /api/chat with context prompt
        // 4. Parse response for flags/suggestions
        // 5. Emit event to frontend or create notification
    }
});
```

### 5. MCP SDK Version -- Stay on v1.x

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @modelcontextprotocol/sdk | ^1.29.0 | MCP server tools | Bump from ^1.28.0 to ^1.29.0. v2 was anticipated Q1 2026 but v1.x is still recommended for production. v1.x will get security fixes for 6+ months post-v2 ship. Upgrade to v2 later as a separate task. |

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date math for calendar view | Week boundaries, day ranges, time formatting in the calendar grid component |

This is the ONLY new npm dependency. Everything else uses existing packages.

## Installation

```bash
# Frontend -- single new dependency
cd /Users/cuhnowts/projects/element
npm install date-fns@^4.1.0

# MCP server -- bump SDK
cd /Users/cuhnowts/projects/element/mcp-server
npm install @modelcontextprotocol/sdk@^1.29.0

# Rust -- no new crates needed
# Ollama API calls use existing reqwest
# Background timer uses existing tokio
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Custom calendar grid | react-big-calendar | If you later need drag-and-drop event creation, multi-resource views, or recurring event display. Element's current needs don't justify the styling overhead. |
| reqwest direct to Ollama | ollama-rs crate | If Ollama API surface grows significantly (model management, embeddings, multimodal) and you need a typed client for many endpoints. Currently only need chat + health check. |
| date-fns | dayjs / luxon | If you already had one of these. date-fns is tree-shakeable and aligns with react-day-picker's internal date handling. |
| Ollama | LM Studio / llamafile | If user wants a GUI for model management. Ollama is CLI/API-first which fits Element's headless integration better. Support both by making the base URL configurable. |
| tokio::time::interval | tokio-cron-scheduler | If heartbeat needs complex scheduling (different intervals on weekdays vs weekends). Simple interval covers the "every N minutes" requirement. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-big-calendar | Styling conflicts with shadcn/ui, overkill for constrained layout, stale release cadence | Custom Tailwind CSS grid |
| moment.js / moment-timezone | Deprecated, huge bundle size, mutable API | date-fns (tree-shakeable, immutable) |
| ollama-rs / ollama-rest-rs | Unnecessary abstraction over a 2-endpoint API when reqwest is already in the project | reqwest direct HTTP calls |
| Full calendar libraries (FullCalendar, DayPilot Pro) | Commercial licenses, heavy bundles, their own theming systems | Custom build |
| Separate Node.js process for heartbeat | Adds process management complexity, Rust already has tokio + reqwest | Rust tokio::spawn in the Tauri backend |
| OpenAI SDK for Ollama | Ollama has OpenAI-compatible endpoints, but adding the SDK means another dependency for the same HTTP calls reqwest already handles | reqwest with Ollama's native `/api/chat` endpoint |

## Stack Patterns by Variant

**If Ollama is not installed/running:**
- Heartbeat degrades gracefully -- skip LLM analysis, still check deadlines via pure date math
- Fall back to CLI AI provider (already implemented in v1.4) for on-demand schedule analysis
- Show a settings hint: "Install Ollama for automatic schedule monitoring"

**If user wants cloud LLM for heartbeat instead of local:**
- Make the heartbeat endpoint configurable: `base_url` + `model` + `api_key` (optional)
- Ollama and OpenAI-compatible APIs use the same request format
- Default to `http://localhost:11434` (Ollama), but allow `https://api.openai.com` with key

**If calendar write-back to Google/Outlook is needed (v1.5 or future):**
- OAuth scope upgrade is the main change (code, not library)
- Google Calendar API write: `POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events` (reqwest, already available)
- Microsoft Graph API write: `POST https://graph.microsoft.com/v1.0/me/events` (reqwest, already available)
- No new dependencies -- just different HTTP endpoints and upgraded OAuth scopes

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| date-fns@4.x | react-day-picker@9.x | react-day-picker uses date-fns internally. Version 9 supports date-fns v4 adapters. Shared dependency reduces bundle. |
| @modelcontextprotocol/sdk@1.29 | better-sqlite3@11.x | Already working together in mcp-server. Minor version bump is safe. |
| reqwest@0.12 + tokio@1 | Tauri 2.10 | Already validated in the codebase. Ollama calls use the same client. |
| Ollama 0.18.x | llama3.2:3b, phi-4-mini, qwen2.5:3b | Small models that run on 8GB Macs. User picks model in settings. |

## Integration Points Summary

| New Feature | Touches Backend (Rust) | Touches Frontend (TS) | Touches MCP Server |
|-------------|----------------------|----------------------|-------------------|
| Calendar MCP tools | No | No | Yes -- new tool handlers reading calendar_events + schedule_blocks tables |
| OAuth scope upgrade | Yes -- calendar.rs scope strings | No | No |
| Heartbeat timer | Yes -- new tokio::spawn loop, reqwest to Ollama, emit events | Yes -- listen for heartbeat events, show notifications | No |
| Calendar view | No | Yes -- new CalendarDayView + CalendarWeekView components replacing CalendarPlaceholder | No |
| Schedule negotiation | Yes -- new scheduling_commands for move/swap | Yes -- chat skill UI | Yes -- new MCP tools for block manipulation |
| Ollama settings | Yes -- new settings table fields | Yes -- settings UI for model/URL/interval | No |

## Sources

- [Ollama GitHub](https://github.com/ollama/ollama) -- API docs, current version 0.18.x (HIGH confidence)
- [Ollama API docs](https://github.com/ollama/ollama/blob/main/docs/api.md) -- endpoint format verified (HIGH confidence)
- [@modelcontextprotocol/sdk npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) -- v1.29.0 latest, v2 pending (HIGH confidence)
- [react-big-calendar npm](https://www.npmjs.com/package/react-big-calendar) -- v1.19.4, last published 10 months ago (HIGH confidence)
- [@daypilot/daypilot-lite-react npm](https://www.npmjs.com/package/@daypilot/daypilot-lite-react) -- v5.4.0 (HIGH confidence)
- [shadcn-ui-big-calendar](https://github.com/list-jonas/shadcn-ui-big-calendar) -- community integration reference (MEDIUM confidence)
- [tokio::time::interval docs](https://docs.rs/tokio/latest/tokio/time/fn.interval.html) -- standard periodic timer (HIGH confidence)
- [ollama-rs](https://github.com/pepperoni21/ollama-rs) -- evaluated but not recommended (HIGH confidence)
- Existing codebase: `calendar.rs`, `scheduling_commands.rs`, `mcp-server/src/index.ts`, `calendarSlice.ts` -- verified current state (HIGH confidence)

---
*Stack research for: Element v1.5 Time Bounded features*
*Researched: 2026-04-02*
