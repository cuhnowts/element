# Phase 5: AI and Smart Scheduling - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Model-agnostic AI assistance for task creation/editing and intelligent time-block scheduling that auto-fills open calendar slots with prioritized work. Users can configure AI providers (Claude, GPT, local models via Ollama or custom endpoints), get AI-scaffolded tasks, and have their day automatically scheduled around meetings. Plugin marketplace, Pulse ingestion, memory system, and pattern detection are separate phases (v2).

</domain>

<decisions>
## Implementation Decisions

### AI provider configuration
- Dedicated 'AI Providers' section in app settings, alongside the existing credential vault
- Add provider flow: select provider type (Claude, OpenAI, Ollama, Custom endpoint), enter API key (or auto-detect for Ollama), select model
- One global default provider/model for all AI features — user sets it once, AI works everywhere
- Local model support via two paths: first-class Ollama auto-detection (discovers available models, no key needed) + generic OpenAI-compatible endpoint (user provides base URL + optional API key) for LM Studio, llama.cpp, etc.
- API keys stored in the Phase 4 credential vault (OS keychain via Tauri secure storage) — no separate key management
- When no AI provider is configured, all AI features are hidden — app is 100% functional without AI, it's an enhancement not a dependency

### AI assistance UX
- On-demand 'AI Assist' sparkle button on task creation and editing — AI only acts when user clicks
- Two modes of AI assistance:
  1. **Built-in AI assist** — uses configured provider to scaffold the task inline
  2. **CLI/agent invocation** — user can open a command interface within Element to invoke external tools (Claude Code, code-puppy, or any CLI integration) to build out tasks/workflows
- Built-in AI generates full task scaffold: structured description, workflow steps (if multi-step detected), priority suggestion, estimated duration, related tasks, and relevant tags
- Inline diff-style presentation: AI fills task fields directly with suggestions highlighted/marked, user accepts individual fields, edits, or dismisses (like GitHub Copilot but for task fields)
- Available on both new and existing tasks — on existing tasks, AI can suggest improvements, add missing steps, or expand sparse descriptions

### Time block detection
- User-configured work hours in settings: start time, end time, work days (default 9am-5pm Mon-Fri)
- Open blocks detected only within configured work hours
- Minimum useful block size: 30 minutes — shorter gaps are ignored
- User-configurable buffer time between meetings and work blocks (default 10min, range 0-30min)
- Detected blocks shown as colored overlay in the existing calendar panel (Phase 4) — meetings in one color, suggested work blocks in another

### Task-to-block assignment
- Auto-suggest with user confirmation: app fills blocks with prioritized tasks and shows proposed schedule, user can accept whole day, swap tasks between blocks, or remove assignments
- Priority logic: priority + due date combined — urgent/high tasks fill first blocks, approaching due dates get a priority boost
- Tasks too long for any single block are split across multiple blocks with continuation indicator
- Schedule regenerates fresh each morning (or on app launch) based on current priorities and today's calendar — yesterday's unfinished tasks carry forward automatically

### Claude's Discretion
- AI Gateway abstraction layer design (provider trait, response normalization, error handling)
- Prompt engineering for task scaffolding (what context to include, output format)
- Time block calculation algorithm specifics
- Calendar overlay visual design (colors, opacity, indicators)
- CLI/agent invocation interface implementation details
- Loading states during AI generation
- Schedule regeneration trigger logic (app launch vs time-based)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.planning/research/ARCHITECTURE.md` — AI Gateway component design, component boundaries, data flow patterns
- `.planning/research/PITFALLS.md` — Scope creep warnings, security boundaries

### Stack and patterns
- `.planning/research/STACK.md` — Tauri 2.x APIs, Rust backend patterns, React 19 frontend
- `.planning/research/SUMMARY.md` — Research synthesis, architecture rationale

### Requirements
- `.planning/REQUIREMENTS.md` — AI-01, AI-02, SCHED-01, SCHED-02 define exact capabilities this phase delivers
- `.planning/ROADMAP.md` §Phase 5 — Success criteria, dependency on Phase 4

### Prior phase context
- `.planning/phases/01-desktop-shell-and-task-foundation/01-CONTEXT.md` — Task data model, SQLite layer, Tauri IPC patterns
- `.planning/phases/02-task-ui-and-execution-history/02-CONTEXT.md` — Multi-panel layout, calendar panel in sidebar
- `.planning/phases/03-workflows-and-automation/03-CONTEXT.md` — Workflow step types, BSD-style piping, cron scheduling
- `.planning/phases/04-plugin-system/04-CONTEXT.md` — Credential vault (OS keychain), calendar integration (OAuth, 5-min poll, color-coded accounts), plugin manifest/API patterns

### Project context
- `.planning/PROJECT.md` — Model-agnostic AI layer constraint, local-first data, native desktop feel, orchestrator boundary (Element orchestrates, external tools execute)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Credential vault** (Phase 4): OS keychain storage via Tauri secure storage — AI API keys stored here, no new key management needed
- **Calendar panel** (Phase 4): MiniCalendar component with react-day-picker — time blocks overlay here
- **Calendar integration** (Phase 4): OAuth flow, 5-min background poll, event data already flowing into the app
- **Task CRUD** (Phase 1): Full create/update/delete flow with Tauri IPC + event emission — AI assist hooks into task creation
- **shadcn/ui components**: Dialog, Input, Select, Switch, Badge, Skeleton — all available for settings UI and AI suggestion presentation
- **Zustand store slices**: Established pattern (taskSlice, projectSlice, uiSlice) — new aiSlice and schedulingSlice follow same pattern

### Established Patterns
- Tauri IPC (invoke commands) for all frontend-backend communication
- Rust backend owns all data — no frontend DB bypass
- Zustand for centralized state management with slice pattern
- shadcn/ui + Tailwind v4 + oklch dark theme for consistent UI
- Event-driven updates: Tauri event emission on state changes, frontend listens reactively
- Debounced save pattern (TaskDetail.tsx) for inline editing

### Integration Points
- AI Gateway module (new Rust module) integrates with credential vault for API keys
- AI assist button integrates into existing TaskDetail component and task creation flow
- Time block detection reads calendar events from Phase 4's calendar integration data
- Schedule overlay renders in existing calendar panel component
- Settings page (Phase 4) extended with AI Providers and Work Hours sections
- New database tables: ai_config, scheduled_blocks (extend existing migration system)

</code_context>

<specifics>
## Specific Ideas

- CLI/agent invocation is core to the vision — Element is an orchestrator, so users should be able to invoke their preferred CLI tools (Claude Code, code-puppy, etc.) from within the app to help build tasks/workflows
- Built-in AI is the fallback/convenience layer — it scaffolds tasks for users who don't have CLI tools set up
- Calendar overlay should make the schedule feel like a real time-blocking app (like Reclaim.ai or Clockwise) — not just a task list with times
- Schedule regeneration each morning aligns with the "daily briefing" vision from PROJECT.md — wake up to a structured workday

</specifics>

<deferred>
## Deferred Ideas

- Memory system learning user preferences and patterns — INTEL-02 in v2
- Pattern detection suggesting automations from repeated manual tasks — INTEL-03 in v2
- Pulse system ingesting email/Slack/GitHub signals — INTEL-01 in v2
- AI-ranked task assignment (using AI to rank instead of priority + due date) — could revisit if simple heuristic proves insufficient
- Per-feature or per-task model overrides — start with global default, add granularity if users request it

</deferred>

---

*Phase: 05-ai-and-smart-scheduling*
*Context gathered: 2026-03-15*
