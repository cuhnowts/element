# Phase 33: Briefing Rework - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the hub briefing from an auto-fired markdown wall into an on-demand, card-based, priority-ranked briefing that lives inside a unified hub center interface. The hub center becomes a command-driven interface with action chips, not a split briefing+chat layout.

</domain>

<decisions>
## Implementation Decisions

### Hub Center Architecture
- **D-01:** The hub center is a single unified interface with: (1) greeting + LLM-flavored contextual summary at top, (2) action chips ("Run Daily Briefing", "Organize Calendar", "Organize Goals"), (3) chat stream below where action output appears, (4) "back to top" navigation button. Only "Run Daily Briefing" is wired in this phase — other chips are UI placeholders documented for a future milestone.
- **D-02:** HubCenterPanel replaces the current stacked BriefingPanel+HubChat with a single scrollable component. Briefing cards render inline in the chat stream when the user clicks "Run Daily Briefing".

### Trigger & Generation Flow
- **D-03:** No auto-fire on hub load. User sees a greeting + brief contextual summary + action chips. Briefing generates only when user clicks "Run Daily Briefing" (BRIEF-01).
- **D-04:** The contextual summary at the top is driven by a **computed scoring engine** — not shown raw to the user. The scoring engine computes tags (overdue, soon, blocked, on-track, won) and a busy score from calendar events, task counts, due dates, and free time blocks. The LLM receives this computed data and narrates 1-2 sentences of "flavor text" for the greeting area. The math is the source of truth; the LLM is the copywriter.

### Scoring Engine (New Rust Module)
- **D-05:** New `scoring.rs` module in Rust, separate from the manifest builder. Computes: item tags (overdue, approaching-deadline, blocked, on-track, recently-completed), project priority ranking (deadline-driven), busy score (% day planned, meetings vs flow time), and a structured priority list. The manifest builder calls the scoring module. This is the core intelligence layer — everything the briefing displays is derived from it.
- **D-06:** Project priority is determined by deadlines. Users can adjust priority ranking by chatting with Element AI (e.g., "move Project X up", "deprioritize Y").

### Card Sections & Visual Hierarchy
- **D-07:** Briefing output is a stack of project cards, ranked by priority (most urgent on top). Each project card contains subsections: blockers, deadlines, wins. The card order itself communicates urgency.
- **D-08:** A brief LLM-narrated summary card sits above the project cards: busiest project, biggest risk, overall day shape. Then ranked project cards below.
- **D-09:** Cards are interactive: clicking a project card navigates to that project. Sections within cards are collapsible.

### Chat/Briefing Consolidation
- **D-10:** Briefing and hub chat are one interface with shared conversation context (BRIEF-04). The chat stream includes both briefing cards and conversational messages.
- **D-11:** Regenerating a briefing replaces the previous one in-place. Only one briefing visible at a time. Chat history below is preserved.

### LLM Output Parsing
- **D-12:** LLM returns structured JSON (not markdown). Schema: `{ summary: string, projects: [{ name, blockers[], deadlines[], wins[] }] }`. Frontend renders each JSON section as a distinct card component. No regex/heading parsing.
- **D-13:** The scoring module produces the ranked data and tags; the LLM adds narrative flavor to each section within the JSON structure.

### Claude's Discretion
- Architecture of the scoring module internals (what queries, how tags are computed)
- Specific JSON schema field names and nesting
- Card component design (reuse existing Card from ui/card.tsx or create BriefingCard variant)
- How "back to top" button is implemented
- How action chip UI is structured (likely button group or command palette style)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Briefing System
- `src-tauri/src/commands/manifest_commands.rs` — Current briefing generation, system prompt, manifest building, streaming architecture
- `src-tauri/src/models/manifest.rs` — Current manifest builder (`build_manifest_string`), schedule section, undated tasks query
- `src/components/hub/BriefingPanel.tsx` — Current briefing panel (to be replaced by unified hub center)
- `src/components/hub/BriefingContent.tsx` — Current markdown rendering + DailyPlanSection + DueDateSuggestion
- `src/stores/useBriefingStore.ts` — Zustand store for briefing status/content/error
- `src/hooks/useBriefingStream.ts` — Tauri event listener for briefing-chunk/complete/error

### Hub Center (to be consolidated)
- `src/components/hub/HubCenterPanel.tsx` — Current stacked BriefingPanel+HubChat layout (to be unified)
- `src/components/hub/HubChat.tsx` — Chat interface with action dispatch, tool use, schedule change cards

### Supporting Components
- `src/components/hub/BriefingGreeting.tsx` — Greeting component (may be adapted for new top area)
- `src/components/hub/BriefingSkeleton.tsx` — Loading skeleton
- `src/components/hub/BriefingRefreshButton.tsx` — Refresh button
- `src/components/ui/card.tsx` — Existing Card component for reuse

### Requirements
- `.planning/REQUIREMENTS.md` — BRIEF-01 through BRIEF-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useBriefingStore` (Zustand): Status/content/error state machine — can be extended for JSON structured output
- `useBriefingStream` hook: Tauri event listener pattern — reusable for streaming JSON chunks
- `Card` component (ui/card.tsx): Base card with CardHeader/CardContent — can be used for briefing project cards
- `BriefingGreeting`: Time-aware greeting — adaptable for the new top-area greeting + scoring summary
- `HubChat`: Full chat with action dispatch, tool use, streaming — the foundation for the unified interface
- `ActionConfirmCard` / `ActionResultCard` / `ScheduleChangeCard`: Existing chat card patterns to follow for briefing cards

### Established Patterns
- Tauri event streaming (briefing-chunk/complete/error) for long-running LLM operations
- Zustand stores with stable selectors (per memory: never return new object/array refs)
- ReactMarkdown with remarkGfm for rich text (may still be used inside card sections)
- `invoke()` for Rust command calls from frontend
- Debounced manifest rebuild on DB mutations

### Integration Points
- `build_manifest_string` in `manifest.rs` — scoring module plugs in here or replaces the data pipeline
- `generate_briefing` command — needs new system prompt for JSON output + scoring data input
- `HubCenterPanel` — the main component that gets rewritten to unified interface
- Hub chat message store — briefing cards need to coexist with chat messages

</code_context>

<specifics>
## Specific Ideas

- The greeting summary text should feel like a concise executive brief: "Packed day — most of your time is spoken for" rather than raw numbers
- Action chips at the top should feel like slash commands for the app — natural extension points for future skills
- "Organize Calendar" and "Organize Goals" chips appear in UI but are wired in future milestones
- The scoring engine is a "data science" approach: compile everything in the app into signals, tag them, rank them, then let the LLM narrate — not the other way around

</specifics>

<deferred>
## Deferred Ideas

- **"Organize Calendar" action chip** — future milestone skill that helps users optimize their calendar layout
- **"Organize Goals" action chip** — future milestone skill that helps users structure and prioritize their goals tree
- **Additional action chips** — the UI pattern supports adding more skills as hub commands over time
- **Chat-driven priority adjustment** — user says "move Project X up" and AI adjusts ranking (D-06 captures the decision; full implementation may extend into bot skills)

</deferred>

---

*Phase: 33-briefing-rework*
*Context gathered: 2026-04-04*
