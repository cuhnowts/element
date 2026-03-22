# Phase 11: Workspace Integration and AI Context - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users experience a unified project workspace with intelligent context switching and AI-driven progress awareness. This phase delivers: workspace state management that assembles file tree, terminal, phases, and tasks into a cohesive per-project view with remembered layout; AI-generated "where was I?" context summaries on project switch; and AI-driven progress suggestions in Track+Suggest mode.

Requirements: AIAS-02, AIAS-03

</domain>

<decisions>
## Implementation Decisions

### Workspace Assembly
- **D-01:** Auto-switch to project view on project selection. Center panel shows project detail (phases/tasks) by default. Files tab available but not auto-selected. Terminal auto-opens per Phase 9 decision (D-03). AI summary card appears at top of project detail.
- **D-02:** Per-project tab memory — workspace remembers which center panel tab (Detail vs Files) was last active per project. Switching back to a project restores the last-active tab.
- **D-03:** Per-project drawer state — drawer open/closed state and active tab (Logs/History/Terminal) saved per project. Switching back to a project restores the drawer state.

### Context Switching Summaries (AIAS-02)
- **D-04:** "Where was I?" summary triggers on project switch after 30+ minutes of idle from that project. First project open in a session always shows summary (in-memory timestamps reset on app restart).
- **D-05:** Summary content includes: recent task completions, current phase status, and AI-suggested next actions. Concise — 3-5 bullet points max.
- **D-06:** Summary generated via configured AI provider (AiGateway). Fallback when no provider configured: simple template summary showing task counts and phase progress with a note to configure AI for smarter summaries.
- **D-07:** Summary appears as a dismissible card at the top of project detail view, above the directory link and progress bar. First thing the user sees.

### AI Progress Suggestions (AIAS-03)
- **D-08:** Track+Suggest mode surfaces task-focused suggestions: next tasks to work on, stalled phase alerts, untouched task reminders, phase completion nudges. Stays within the task/phase domain.
- **D-09:** Suggestions presented as dismissible cards below the "where was I?" summary in the project detail view. Each card has an action button ("Go to task", "Scaffold with AI") and a dismiss button.
- **D-10:** Suggestions refresh on project switch only — generated alongside the "where was I?" summary. No background polling, no mid-session regeneration. Dismissed suggestions don't reappear until next project switch.
- **D-11:** On-demand AI mode shows no auto-generated AI features. No summary card, no suggestion cards. Clean project view with just phases and progress. User can still trigger AI scaffold on individual tasks via existing flow.
- **D-12:** Track+Auto-execute mode shows the same summary and suggestions as Track+Suggest. The difference is that auto-execute can act on suggestions without user confirmation (scope of auto-execute behavior defined by Phase 10).

### Data & State Tracking
- **D-13:** AI context fed from existing task data only — task completions, status changes, creation dates, phase progress. All queryable from existing SQLite tables. No new tracking infrastructure or tables needed.
- **D-14:** Last-viewed timestamp per project stored in Zustand in-memory state (not persisted). Resets on app restart — so first project open in a session always triggers summary. No migration needed.

### Claude's Discretion
- AI prompt design for context summary and suggestion generation
- Exact idle threshold (30min suggested but adjustable)
- How per-project workspace state is structured in Zustand (map keyed by project ID, etc.)
- Loading/skeleton state while AI summary generates
- Animation/transition for summary card appearance and dismissal
- How suggestion action buttons route to the relevant task or phase

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AI Layer
- `src-tauri/src/ai/prompts.rs` — Existing prompt building pattern (build_scaffold_request). Add context summary and suggestion prompts here.
- `src-tauri/src/ai/gateway.rs` — AiGateway for model-agnostic AI calls
- `src-tauri/src/commands/ai_commands.rs` — Existing AI Tauri commands. Add context summary command here.
- `src/stores/aiSlice.ts` — Zustand AI state with request/suggestion lifecycle pattern
- `src/components/detail/AiSuggestionPanel.tsx` — Existing AI suggestion card pattern (accept/dismiss per field)

### Workspace Layout
- `src/stores/useWorkspaceStore.ts` — Current workspace state (drawer, calendar). Extend with per-project state.
- `src/components/layout/AppLayout.tsx` — Three-panel layout: Sidebar, CenterPanel, OutputDrawer
- `src/components/center/ProjectDetail.tsx` — Project detail view where summary and suggestion cards will live

### Prior Phase Context
- `.planning/phases/07-project-phases-and-directory-linking/07-CONTEXT.md` — Project detail layout decisions (stacked sections, progress bars)
- `.planning/phases/08-file-explorer/08-CONTEXT.md` — File tree as center panel tab
- `.planning/phases/09-embedded-terminal/09-CONTEXT.md` — Terminal tab in drawer, kill-on-switch, auto-open behavior

### Requirements
- `.planning/REQUIREMENTS.md` — AIAS-02, AIAS-03 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AiGateway` + provider abstraction — model-agnostic AI completion with streaming support
- `aiSlice.ts` — Zustand AI state pattern (isGenerating, pendingSuggestions, accept/dismiss lifecycle)
- `AiSuggestionPanel.tsx` — Card-based AI suggestion UI with per-field accept/dismiss. Reusable pattern for suggestion cards.
- `prompts.rs` — Prompt construction and JSON response parsing. Extend for context summaries.
- `useWorkspaceStore.ts` — Persisted workspace layout state via Zustand persist middleware
- `app.emit()` event system — Backend-to-frontend communication for streaming AI responses

### Established Patterns
- AI flow: Rust command -> AiGateway -> provider -> emit events -> frontend receives via Tauri event listeners
- State: Zustand slices in combined store + separate persist stores (useWorkspaceStore, useWorkflowStore)
- Backend: `#[tauri::command]` async fns with `State<Arc<Mutex<Database>>>` and `AppHandle` for events
- SQL queries for task/phase data already exist in models — extend with aggregation queries for AI context

### Integration Points
- `ProjectDetail.tsx` — Add AI summary card and suggestion cards at top
- `useWorkspaceStore.ts` — Add per-project state map (last tab, drawer state, last-viewed timestamp)
- `prompts.rs` — Add `build_context_summary_request` and `build_suggestions_request` functions
- `ai_commands.rs` — Add `generate_context_summary` and `generate_suggestions` Tauri commands
- Phase 10's ai_mode field on projects — determines whether AI features render (Track+Suggest vs On-demand)

</code_context>

<specifics>
## Specific Ideas

- Summary card matches the existing AiSuggestionPanel visual language — card with subtle left border accent, dismiss button
- Suggestion cards use a lightbulb icon to distinguish from the summary card's robot icon
- Per-project workspace state avoids persisting to DB — Zustand in-memory map is sufficient since it's UI-only state
- Fallback template summary ensures the feature is useful even without an AI provider configured
- "Where was I?" phrasing is user-facing — appears as the card header

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-workspace-integration-and-ai-context*
*Context gathered: 2026-03-22*
