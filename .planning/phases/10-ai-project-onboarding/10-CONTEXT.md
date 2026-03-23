# Phase 10: AI Project Onboarding - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can set up new projects through an AI-guided conversation that generates a structured phase and task breakdown, plus set per-project AI assistance mode. The AI conversation is delegated to the user's preferred CLI tool (Claude Code, Cursor, etc.) running in Element's embedded terminal. Element orchestrates: writes a skill file with project context, launches the CLI tool, watches for structured output, and presents a review/edit screen before saving.

Requirements: AIOB-01, AIOB-02, AIOB-03, AIOB-04, AIAS-01

</domain>

<decisions>
## Implementation Decisions

### Onboarding Entry & Flow
- **D-01:** Two-step approach — user creates project normally (name, theme), then sees a prominent "Plan with AI" button in the empty project detail view (zero phases). Button only appears for empty projects.
- **D-02:** Clicking "Plan with AI" triggers: (1) Element writes a skill file with project context to the project's directory, (2) opens the embedded terminal, (3) launches the configured CLI tool with the skill file.
- **D-03:** Minimal input form before launching: project description/scope (free text, required) and optional goals. AI infers constraints and asks about gaps during the conversation.
- **D-04:** Cancel button returns to empty project detail view. No separate "skip" link needed.
- **D-05:** Architecture should be open to pluggable planning backends — the skill file + output contract pattern means any CLI tool that reads the skill and writes the output JSON works.

### CLI Tool Configuration
- **D-06:** Global setting in Element settings (alongside existing AI Providers): CLI tool name/path (e.g., "claude", "cursor"). One setting for all projects.
- **D-07:** Skill file defines project context (name, scope, goals), conversation guidance, and a strict output contract (JSON schema for phases and tasks). CLI tool has freedom in how it conducts the conversation.

### Data Flow & Completion
- **D-08:** Skill file + output parsing pattern: Element writes `.element/onboard.md` (skill) to project directory, CLI tool runs, user interacts in terminal, CLI writes `.element/plan-output.json`, Element reads it.
- **D-09:** File watcher detects `plan-output.json` appearing in the project directory. When detected, Element auto-transitions the center panel from waiting state to review screen.

### During Conversation UX
- **D-10:** Center panel shows a waiting state card: "AI setup in progress..." with project name, scope summary, and hint to check Terminal tab. Cancel button available.
- **D-11:** Terminal tab auto-opens and receives focus when "Plan with AI" is clicked. User immediately sees the CLI tool starting.

### Review & Edit Experience
- **D-12:** Review screen uses the same phase accordion layout as the project detail view (from Phase 7). Each phase is a collapsible section showing its tasks. Consistent with existing patterns.
- **D-13:** Full inline editing in review: rename phases/tasks, delete items, reorder phases (drag-and-drop), add new phases and tasks.
- **D-14:** "Confirm & Save" batch-creates all phases and tasks in the database. Center panel transitions to the populated project detail view. Toast confirms: "X phases and Y tasks created."
- **D-15:** "Discard" discards the AI output and returns to empty project detail view.

### AI Mode Selection
- **D-16:** AI mode dropdown in the project detail header area (alongside directory link, progress bar). Always visible and changeable.
- **D-17:** Three modes: Track+Suggest, Track+Auto-execute, On-demand. Default for new projects: On-demand.
- **D-18:** Phase 10 delivers the UI to set and persist ai_mode per project (schema column + dropdown). Actual Track+Suggest and Auto-execute behavior is implemented in Phase 11.

### Claude's Discretion
- Exact skill file template content and output JSON schema design
- File watcher implementation (Tauri fs watch, notify crate, or polling)
- How the CLI tool path is validated and errors are handled
- Review screen component structure and state management
- Batch save transaction handling
- `.element/` directory creation and cleanup

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing AI Infrastructure
- `src-tauri/src/ai/gateway.rs` — AI gateway with multi-provider support (pattern reference, not directly used for CLI delegation)
- `src-tauri/src/ai/prompts.rs` — Existing prompt/scaffold pattern (reference for skill file design)
- `src-tauri/src/commands/ai_commands.rs` — Existing AI commands (extend with CLI tool config)
- `src/stores/aiSlice.ts` — AI state management (extend with onboarding state)
- `src/types/ai.ts` — AI type definitions (extend with onboarding types)

### Project & Phase Infrastructure (Phase 7 dependencies)
- `src-tauri/src/models/project.rs` — Project model (needs ai_mode field)
- `src-tauri/src/commands/project_commands.rs` — Project commands (needs AI mode update command)
- `src/components/center/ProjectDetail.tsx` — Project detail view (add "Plan with AI" button, AI mode dropdown, review screen)

### Terminal Integration (Phase 9 dependency)
- `src/components/output/DrawerHeader.tsx` — Drawer tab system (Terminal tab auto-open)
- `src/stores/useWorkspaceStore.ts` — Workspace store (drawer open/tab control)

### Frontend Patterns
- `src/components/ui/` — shadcn/ui component library
- `src/lib/tauri.ts` — Tauri invoke wrapper
- `src/stores/projectSlice.ts` — Zustand slice pattern

### Requirements
- `.planning/REQUIREMENTS.md` — AIOB-01 through AIOB-04, AIAS-01 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AiGateway` + provider system — Multi-provider AI infrastructure (reference pattern for CLI tool abstraction)
- `aiSlice.ts` — Zustand AI state management with streaming support (extend for onboarding flow)
- `AiSuggestionPanel.tsx` — Accept/dismiss pattern for AI suggestions (reference for review screen interactions)
- `DrawerHeader.tsx` — Tab system with active/inactive states (Terminal tab auto-open)
- `useWorkspaceStore` — `drawerOpen` and tab state management
- shadcn/ui: Button, DropdownMenu, Select, ScrollArea, Dialog, Progress — all available

### Established Patterns
- State management: Zustand with slice pattern (StateCreator<AppStore>)
- Styling: Tailwind CSS with shadcn/ui design tokens
- Backend commands: `#[tauri::command]` async functions with `State<Arc<Mutex<Database>>>`
- Event system: `app.emit()` for backend-to-frontend communication
- SQL migrations: Numbered .sql files
- Tauri invoke wrapper: `api.*` methods in `src/lib/tauri.ts`

### Integration Points
- New SQL migration: add `ai_mode` column to projects table, add `cli_tool_path` to settings/config
- New Rust commands: CLI tool config CRUD, skill file generation, file watcher for plan output
- ProjectDetail.tsx: "Plan with AI" empty state, waiting state, review screen, AI mode dropdown
- Extend `useWorkspaceStore` or `aiSlice` with onboarding flow state
- Terminal integration: programmatic tab open and CLI invocation

</code_context>

<specifics>
## Specific Ideas

- The "Plan with AI" experience should mirror how GSD works — structured questioning leading to a phase/task breakdown. The architecture should support plugging in GSD itself as a planning backend in the future.
- Skill file + output contract is the key abstraction — any CLI tool that can read the skill and write the JSON output works. This is the plugin point for future CLI tool integrations.
- The review screen reuses the Phase 7 project detail layout so users are already familiar with the structure before they start working with it.
- `.element/` directory in the project root is the convention for Element's project-level files (skill files, plan output, future config).

</specifics>

<deferred>
## Deferred Ideas

- **Re-trigger AI planning for existing projects** — "Regenerate with AI" for projects that already have phases (adds merge/append complexity)
- **Per-project CLI tool override** — Different projects using different CLI tools (global setting sufficient for now)
- **Track+Suggest behavior** — Actual AI suggestion logic when mode is set (Phase 11)
- **Track+Auto-execute behavior** — Automatic task execution logic (Phase 11)
- **Skill marketplace** — Shareable/downloadable skill files for different project types (future)
- **GSD `.planning/` directory sync** — When a directory is linked to a project, scan for `.planning/ROADMAP.md` and parse existing phases/tasks into the Element database. File watcher on `.planning/` syncs updates as GSD executes phases (e.g., SUMMARY.md created → mark tasks complete). This would let users run `/gsd:new-project` in a linked directory and see the resulting phases and tasks visualized in the app. User-requested during Phase 7 verification (2026-03-22).

</deferred>

---

*Phase: 10-ai-project-onboarding*
*Context gathered: 2026-03-22*
