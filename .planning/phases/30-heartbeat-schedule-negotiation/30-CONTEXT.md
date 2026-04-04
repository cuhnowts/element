# Phase 30: Heartbeat & Schedule Negotiation - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Background deadline monitoring that periodically evaluates whether remaining work fits before deadlines, plus conversational rescheduling through hub chat. The app proactively warns about deadline risks and lets users negotiate schedule changes through natural language.

</domain>

<decisions>
## Implementation Decisions

### Heartbeat Timing & Triggers
- **D-01:** Heartbeat runs every 30 minutes by default, configurable by user in settings
- **D-02:** Risk detection is deterministic math: remaining estimated_minutes of pending tasks vs available calendar gaps before due date. No LLM needed for detection itself
- **D-03:** Heartbeat checks all projects, not just the active one -- deadlines are cross-project
- **D-04:** Tasks approaching deadlines without time estimates are flagged separately: "Task X is due in 2 days but has no time estimate"
- **D-05:** Backlog items (999.x phases) are ignored by the heartbeat -- no false alarms on intentionally unscheduled work (carries forward from project-level decision)

### Risk Summary Presentation
- **D-06:** Deadline risks surface through two channels: notification (immediate awareness) AND daily briefing update (next-session context)
- **D-07:** LLM summary format is structured with narrative: data-first risk assessment with actionable suggestion (e.g., "3 tasks at risk across 2 projects. Project Alpha: 'Write report' due Thu has 4h work but only 2h available. Suggestion: move 'Review PR' to Friday to free up time.")
- **D-08:** Risk notifications fire once per risk event. If conditions worsen (another day passes), that's a NEW risk event with updated urgency -- no daily nagging
- **D-09:** Clicking a risk notification opens hub chat with risk context pre-loaded, ready for schedule negotiation

### Schedule Negotiation Flow
- **D-10:** Negotiation initiated through natural language in hub chat ("move the report to tomorrow", "I lost my afternoon"). Bot parses intent and proposes changes
- **D-11:** Bot presents before/after summary in chat: "Moving 'Write report' from today 2-4pm to tomorrow 9-11am. This frees up today but pushes 'Code review' to tomorrow afternoon. Confirm?"
- **D-12:** Heartbeat risk notifications include a suggested fix: "Move X to Friday to resolve the conflict. Want me to do that?" Clicking opens chat with this pre-loaded
- **D-13:** Scope is single task moves only ("move this task to tomorrow", "push this to next week"). Full day replanning is out of scope for this phase
- **D-14:** All schedule changes follow suggest-never-auto-apply pattern (carries forward from project-level decision)

### Ollama vs CLI Fallback Strategy
- **D-15:** Ollama availability checked at each heartbeat tick via OllamaProvider.test_connection() (2s timeout). Handles Ollama being started/stopped between checks
- **D-16:** When Ollama unavailable, fall back to configured CLI tool with identical output format -- user can't tell which provider generated the summary
- **D-17:** When neither Ollama nor CLI is configured, heartbeat still runs with deterministic template output: "Task X: 4h needed, 2h available before deadline." Risk detection is math, not LLM
- **D-18:** User can configure a dedicated heartbeat AI provider in settings -- could be Ollama, a lightweight API key, or a CLI tool. Separate from the main AI provider setting

### Claude's Discretion
- Implementation of the background timer (tokio interval, Tauri background task, etc.)
- Exact format of the deterministic fallback template
- How to parse natural language reschedule intent (bot skill pattern from Phase 25)
- Notification priority levels for different risk severities

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- BEAT-01 through BEAT-04 define the heartbeat requirements

### Architecture
- `.planning/research/ARCHITECTURE.md` -- System architecture showing how Rust backend, React frontend, and MCP sidecar connect
- `.planning/research/FEATURES.md` -- Feature analysis including heartbeat monitoring, schedule negotiation, and anti-features (no auto-scheduling)

### Existing Code
- `src-tauri/src/ai/ollama.rs` -- OllamaProvider with complete(), test_connection(), list_models()
- `src-tauri/src/ai/gateway.rs` -- AI gateway with multi-provider dispatch
- `src-tauri/src/models/notification.rs` -- Notification model with priority, category, action_url
- `src-tauri/src/commands/notification_commands.rs` -- Notification Tauri commands
- `src-tauri/src/scheduling/types.rs` -- CalendarEvent, TaskWithPriority, ScheduleBlock types
- `src-tauri/src/scheduling/time_blocks.rs` -- Time block calculation logic
- `src-tauri/src/commands/scheduling_commands.rs` -- Scheduling Tauri commands
- `src-tauri/src/commands/manifest_commands.rs` -- generate_briefing command with streaming LLM output pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OllamaProvider` (src-tauri/src/ai/ollama.rs): Complete Ollama integration with streaming, test_connection() with 2s timeout, list_models()
- `Notification` model (src-tauri/src/models/notification.rs): Full CRUD with priority, category, project_id, action_url fields -- ready for deadline alerts
- `generate_briefing` (src-tauri/src/commands/manifest_commands.rs): Streaming LLM pattern via Tauri events (briefing-chunk, briefing-complete, briefing-error) -- reusable for risk summaries
- `AiGateway` (src-tauri/src/ai/gateway.rs): Multi-provider dispatch with Ollama, CLI, Anthropic, OpenAI support
- `TaskWithPriority` (src-tauri/src/scheduling/types.rs): Already has due_date: Option<NaiveDate> and estimated_minutes: Option<i32> -- core inputs for risk calculation

### Established Patterns
- AI providers configured in ai_providers table with credential_key in OS keychain
- Streaming LLM output via Tauri events (event_sender pattern)
- Notification system with unread count, prune, and clear operations
- Scheduling engine uses WorkHoursConfig for available time calculation

### Integration Points
- Heartbeat timer connects to: scheduling engine (capacity calc) + AI gateway (summary) + notification system (alerts) + briefing system (updates)
- Schedule negotiation connects to: hub chat (input) + scheduling commands (reschedule) + calendar view (visual update)
- Settings page needs new entries: heartbeat interval, heartbeat AI provider

</code_context>

<specifics>
## Specific Ideas

- Risk notifications should be actionable -- clicking opens hub chat with context pre-loaded for immediate negotiation
- Heartbeat model should be user-configurable independently from the main AI model (could be a cheap/fast model)
- Even without any AI provider, the core value (deadline risk detection) still works via deterministic math

</specifics>

<deferred>
## Deferred Ideas

- Full day replan ("replan my afternoon") -- broader scope rescheduling could be a future phase
- Visual diff on calendar view showing proposed changes as ghost blocks -- requires tighter Phase 27 integration
- Phase-level due dates propagating to heartbeat risk calculations -- mentioned in research but not in current requirements

</deferred>

---

*Phase: 30-heartbeat-schedule-negotiation*
*Context gathered: 2026-04-03*
