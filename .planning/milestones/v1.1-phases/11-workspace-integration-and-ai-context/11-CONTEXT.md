# Phase 11: Workspace Integration and AI Context - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can click an "Open AI" button in any project to seed full project context into the embedded terminal. Element writes a context/skill file to the project directory, kills any existing PTY, and spawns the configured CLI tool (claude, cursor, etc.) pointed at the context file. The AI immediately knows the project state — phases, tasks, progress, what's next — and can assist. For empty projects, the context file includes onboarding instructions so the AI guides project setup (replacing the old ScopeInputForm flow). Manual terminal usage (without clicking the button) remains context-free.

Per-project workspace state (active center tab, drawer state) is restored on project switch for a seamless multi-project experience.

Requirements: AIAS-02, AIAS-03 — revised to match "Open AI" button approach (no persistent AI modes, no summary cards, no suggestion cards).

</domain>

<decisions>
## Implementation Decisions

### Context Seeding Mechanism
- **D-01:** Skill file + launch pattern. Element writes `.element/context.md` with project state, then spawns the configured CLI tool pointed at it. Reuses Phase 10's skill file concept. Tool-agnostic — any CLI that can read a file works.
- **D-02:** Always fresh session. Clicking "Open AI" kills existing PTY and spawns a new CLI session with the context file. No injection into running sessions.
- **D-03:** CLI tool configured globally in Element settings (one setting for all projects). Reuses Phase 10's D-06 decision.
- **D-04:** When no CLI tool is configured, show a toast: "No AI tool configured" with a button navigating to Settings. Non-blocking.

### Button & Trigger
- **D-05:** "Open AI" button in the header area of ProjectDetail, next to the project name/directory link. Always visible when viewing a project.
- **D-06:** "Open AI" replaces the existing "Plan with AI" button entirely. The context file adapts: empty projects get onboarding instructions, populated projects get progress context. One button, one flow.
- **D-07:** Clicking "Open AI" auto-switches drawer to Terminal tab (opens drawer if closed). User immediately sees the CLI tool starting.

### Context Content
- **D-08:** Full structured dump modeled after GSD's project context: project overview, all phases with tasks (name, status, description), progress metrics, current phase focus, and actionable next steps. Comprehensive enough that the AI can answer any project question without follow-up.
- **D-09:** For empty projects (no phases), context file includes onboarding instructions for the AI to guide project setup — ask about scope/goals, break down into phases and tasks.
- **D-10:** Output contract (JSON schema for phases/tasks) included in context file. File watcher from Phase 10 picks up `plan-output.json` and shows the AiPlanReview screen. Reuses existing infrastructure.

### Workspace Assembly
- **D-11:** Auto-switch to project detail view on project selection in sidebar.
- **D-12:** Per-project tab memory — workspace remembers which center panel tab (Detail vs Files) was last active per project. Switching back restores the last-active tab.
- **D-13:** Per-project drawer state — drawer open/closed state and active tab saved per project. Switching back restores drawer state.
- **D-14:** Per-project state stored in session-only Zustand (in-memory map, resets on app restart). No persistence, no migration needed.

### Claude's Discretion
- Context file format and template design (markdown structure, how to represent phases/tasks/progress)
- Onboarding prompt wording for empty projects
- How the CLI tool path is validated and errors are handled
- How per-project workspace state map is structured in Zustand
- Whether to reuse `.element/onboard.md` naming or consolidate to a single `.element/context.md`
- Loading state while CLI tool spawns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Terminal Infrastructure
- `src/hooks/useTerminal.ts` — PTY spawn, pty.write(), kill, resize. Must be extended to support kill+respawn for "Open AI" flow.
- `src/components/output/TerminalTab.tsx` — Terminal UI component. Currently takes cwd + isVisible.
- `src/stores/useWorkspaceStore.ts` — Workspace state (drawer, tabs). Extend with per-project state map.

### AI Onboarding (Phase 10 — reuse)
- `src/components/center/PlanWithAiButton.tsx` — Existing button to replace with "Open AI"
- `src/components/center/ScopeInputForm.tsx` — To be removed (replaced by context file onboarding)
- `src/components/center/OnboardingWaitingCard.tsx` — To be removed (replaced by terminal view)
- `src/components/center/AiPlanReview.tsx` — Keep: review screen for structured AI output
- `src/types/onboarding.ts` — PlanOutput type definition for file watcher

### Project & Phase Data
- `src-tauri/src/models/project.rs` — Project model (name, directory, phases, tasks)
- `src-tauri/src/commands/project_commands.rs` — Project CRUD commands
- `src/components/center/ProjectDetail.tsx` — Project detail view where "Open AI" button lives
- `src/stores/projectSlice.ts` — Zustand project state

### Settings Infrastructure
- `src-tauri/src/commands/ai_commands.rs` — Existing AI commands (CLI tool config may live here)

### Prior Phase Context
- `.planning/phases/09-embedded-terminal/09-CONTEXT.md` — Terminal auto-open, kill-on-switch, session-only state
- `.planning/phases/10-ai-project-onboarding/10-CONTEXT.md` — Skill file pattern, file watcher, CLI tool config, output contract

### Requirements
- `.planning/REQUIREMENTS.md` — AIAS-02, AIAS-03 acceptance criteria (to be revised)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTerminal` hook — PTY lifecycle (spawn, write, kill, resize). Needs extension to support external kill+respawn trigger.
- `AiPlanReview` component — Review/edit screen for AI-generated phases/tasks. Fully functional from Phase 10.
- `PlanWithAiButton` — Existing button component to repurpose as "Open AI"
- `useWorkspaceStore` — Zustand persist store with `openDrawerToTab()` and `openTerminal()` actions
- File watcher infrastructure from Phase 10 — watches for `plan-output.json` in project directory

### Established Patterns
- Terminal: `tauri-pty` spawn() with bidirectional data flow via onData/write
- State: Zustand slices in combined store + separate persist stores
- CLI tool config: global `app_settings` table (key-value) from Phase 10
- Skill files: `.element/` directory convention for Element's project-level files

### Integration Points
- `ProjectDetail.tsx` — Replace PlanWithAiButton with "Open AI", remove ScopeInputForm and OnboardingWaitingCard
- `useTerminal.ts` — Expose kill/respawn capability for programmatic session management
- `useWorkspaceStore.ts` — Add per-project state map (Map<projectId, {activeTab, drawerOpen, drawerTab}>)
- Context file generation — new Rust command to build `.element/context.md` from project data

</code_context>

<specifics>
## Specific Ideas

- Context file modeled after GSD's project context format — structured, comprehensive, immediately actionable
- "Open AI" is the single entry point for all AI interactions — empty projects get onboarding, populated projects get progress context
- The skill file concept from Phase 10 is preserved as the underlying mechanism but is invisible to the user
- Removing ScopeInputForm, OnboardingWaitingCard, and the multi-step onboarding state machine simplifies the codebase significantly
- Manual terminal (user opens drawer > Terminal tab) stays context-free — just a plain shell in the project directory

</specifics>

<deferred>
## Deferred Ideas

- **Per-project CLI tool override** — Different projects using different CLI tools (from Phase 10 deferred)
- **Re-trigger AI planning for existing projects** — "Regenerate with AI" for projects with existing phases (from Phase 10 deferred)
- **GSD `.planning/` directory sync** — Scan linked directories for `.planning/ROADMAP.md` and sync phases/tasks (from Phase 10 deferred)
- **AI assistance modes** — Per-project AI mode may return in simpler form later
- **"Where was I?" summary cards** — Removed from Phase 11. Could return as an optional feature if users want it.
- **AI suggestion cards** — Removed from Phase 11. Could return as an optional feature.

</deferred>

---

*Phase: 11-workspace-integration-and-ai-context*
*Context gathered: 2026-03-24*
