# Phase 23: Context Manifest and AI Briefing - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

An in-memory context manifest that aggregates project and phase status across all projects, plus an LLM-generated daily briefing that streams into the hub center column. The manifest is the data layer; the briefing is the presentation layer. Together they deliver CTX-01 through CTX-03 and BRIEF-01 through BRIEF-03.

</domain>

<decisions>
## Implementation Decisions

### Manifest Scope and Structure
- **D-01:** Manifest includes projects + phases only. No individual tasks — too granular for a daily overview and risks blowing the token budget.
- **D-02:** Manifest is structured markdown with sections per project (e.g., `## ProjectX\nPhase 3: Auth (In Progress, 60%)`). Easy for LLMs to parse and reference.
- **D-03:** Manifest is built by a Rust Tauri command (`build_context_manifest`) that queries SQLite directly. Single source of truth, reusable by MCP sidecar.
- **D-04:** Token budget enforced via character-based estimate (~4 chars/token heuristic). Truncate if over 2000-token budget. No external tokenizer dependency.

### Manifest Refresh Strategy
- **D-05:** Manifest rebuilds on debounced DB mutations (task/phase status changes, ~5s debounce). Stays current without rebuilding on every keystroke.
- **D-06:** Cached manifest lives Rust-side in an `Arc<Mutex<String>>`. Tauri command returns it instantly. MCP sidecar can also read it.

### Briefing Generation and Delivery
- **D-07:** Briefing generated via the Rust AI gateway (existing provider system from aiSlice/onboarding_commands). Rust makes the API call, consistent with established architecture.
- **D-08:** Response streams as chunked Tauri events (`briefing-chunk`, `briefing-complete`). Hub component listens and appends. Matches existing `ai-stream-complete` pattern.
- **D-09:** Briefing auto-generates on hub load, is manually refreshable via a button, AND regenerates on a time loop (every 2-3 hours) while the hub is visible. Acts as a productivity coach — nudges when falling behind, encourages when ahead.

### Briefing Content and Personalization
- **D-10:** Greeting style is warm and concise: "Good morning, Jake. Here's your day." Friendly but gets to the point.
- **D-11:** Time-of-day aware: greeting shifts with time (morning / afternoon / evening). Afternoon refreshes highlight what's left.
- **D-12:** Adaptive edge state messaging: zero projects gets "No projects yet — create one to get started." All caught up gets "Great work — what else do you want to tackle today?"
- **D-13:** Briefing content rendered as markdown (react-markdown or similar). Flexible — prompt iteration doesn't require code changes.

### Claude's Discretion
- Specific LLM system prompt content and structure
- Debounce timing tuning (5s is a starting point)
- Time loop interval (2-3 hours is guidance, exact value is implementation detail)
- Markdown rendering library choice
- Briefing loading skeleton/placeholder design
- Whether to show "last refreshed" timestamp on the briefing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/PROJECT.md` — Core value, constraints, tech stack, key decisions
- `.planning/REQUIREMENTS.md` — CTX-01 through CTX-03, BRIEF-01 through BRIEF-03 acceptance criteria
- `.planning/ROADMAP.md` — Phase 23 success criteria and Phase 22 dependency

### Dependencies
- Phase 22 (Hub Shell and Goals Tree) — Hub layout must exist; briefing renders in center column
- Phase 21 (Central AI Agent) — MCP sidecar can consume the manifest; agent store patterns reusable

### Existing Code — AI Gateway
- `src-tauri/src/commands/onboarding_commands.rs` — `generate_context_file` builds per-project context; pattern for manifest builder
- `src/hooks/useAiStream.ts` — Listens for `ai-stream-complete` / `ai-stream-error` Tauri events; pattern for briefing streaming
- `src/stores/aiSlice.ts` — AI provider management, streaming state (`isGenerating`, `currentRequestId`)

### Existing Code — Data Access
- `src-tauri/src/commands/project_commands.rs` — `list_projects`, `get_project` Tauri commands; manifest queries similar data
- `src/stores/projectSlice.ts` — Frontend project state
- `src/stores/phaseSlice.ts` — Frontend phase state
- `src/stores/taskSlice.ts` — Frontend task state (not in manifest, but briefing may reference counts)

### Existing Code — Agent Infrastructure
- `src/stores/useAgentStore.ts` — Agent lifecycle and activity state; pattern for briefing state management
- `src/hooks/useAgentMcp.ts` — MCP sidecar communication; sidecar could consume manifest

### Prior Phase Context
- `.planning/phases/21-central-ai-agent/21-CONTEXT.md` — Agent architecture decisions (D-05 through D-07: MCP server, sidecar, SQLite access)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `generate_context_file` (onboarding_commands.rs): Builds per-project context markdown. Manifest builder follows same pattern but aggregates across all projects.
- `useAiStream.ts`: Tauri event listener for AI streaming. Briefing streaming can follow this pattern with new event names.
- `aiSlice.ts`: Provider management and streaming state. Briefing may need its own slice or extend this one.
- `useAgentStore.ts`: Zustand store pattern for lifecycle state. Briefing state (loading, content, lastRefreshed) follows same pattern.

### Established Patterns
- **AI calls**: Rust backend makes LLM API calls, streams results via Tauri events to frontend
- **State management**: Zustand stores with slices; new briefing state fits this pattern
- **Tauri IPC**: Commands exposed in `lib.rs`, TypeScript wrappers in `tauri-commands.ts`
- **DB access**: `Arc<Mutex<Database>>` pattern for SQLite queries in Tauri commands

### Integration Points
- Hub center column (Phase 22): Briefing component renders here
- MCP sidecar (Phase 21): Can read cached manifest for agent context
- Notification system (Phase 20): Timer-based refresh could use similar interval patterns

</code_context>

<specifics>
## Specific Ideas

- Briefing acts as a productivity coach: if the user is falling behind (tasks stacking up, not enough time), it nudges. If ahead, it encourages and asks what else they want to tackle.
- Time loop refresh (every 2-3 hours) means the briefing evolves throughout the day — morning is a plan, afternoon is a progress check, evening is a wrap-up.
- The manifest staying in Rust-side memory means both the frontend (via Tauri command) and the MCP sidecar can read it without duplication.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-context-manifest-and-ai-briefing*
*Context gathered: 2026-04-01*
