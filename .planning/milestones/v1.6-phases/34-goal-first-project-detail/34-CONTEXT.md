# Phase 34: Goal-First Project Detail - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign the project detail view to lead with the project's goal and provide a fast path to workspace (directory + AI terminal). The view currently leads with name/description/progress — this phase restructures it to be goal-first with streamlined workspace entry.

</domain>

<decisions>
## Implementation Decisions

### Goal Data Model
- **D-01:** Add a new `goal` TEXT column to the `projects` table via SQLite migration. Keep the existing `description` column separate — goal is the short aspirational statement, description is longer project context/notes.
- **D-02:** Update the Rust `Project` model, create/update SQL, and Tauri commands to support the new `goal` field. Expose via existing project CRUD API.

### Hero Card Presentation
- **D-03:** Display the goal as a bordered card with a Target icon and inline edit pencil. The card sits prominently above the phases section as a distinct visual element.
- **D-04:** When no goal is set, show an empty state inside the card prompting "Set a project goal..." with the same card chrome.

### Workspace Entry Flow
- **D-05:** Replace the current separate OpenAiButton + DirectoryLink row with a single "Open Workspace" button that opens the directory in the file tree AND focuses the terminal drawer tab in one action. This achieves the 2-click requirement: open project → click button.
- **D-06:** Show the directory path next to the workspace button as a label (not a separate action). The DirectoryLink component's "link directory" functionality should remain accessible (e.g., if no directory is linked, the button becomes "Link Directory").

### Layout Restructure
- **D-07:** New layout order: Project Name (with tier badge + compact progress indicator) → Goal hero card → Workspace button row → Phases section.
- **D-08:** The description textarea moves into a collapsible "Details" accordion below the phases section (similar to TaskDetail's accordion pattern).
- **D-09:** The standalone progress bar and metadata row (created date, task count) move into the Details accordion or become compact inline indicators on the name row.
- **D-10:** Remove the separate "Change plan" button from the name row — tier selection can be accessed via the tier badge click or moved to the Details accordion.

### Claude's Discretion
- Goal card border styling, icon choice (Target vs Flag), and edit interaction details
- Exact compact progress indicator format (e.g., "3/5" text vs tiny inline bar)
- Accordion implementation details (reuse existing patterns from TaskDetail)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Detail (primary target)
- `src/components/center/ProjectDetail.tsx` — Current project detail component being redesigned
- `src/components/center/OpenAiButton.tsx` — Current AI button being replaced by workspace button
- `src/components/center/DirectoryLink.tsx` — Current directory link being consolidated

### Data Model
- `src-tauri/src/models/project.rs` — Project model with INSERT/UPDATE SQL (needs goal column)
- `src/lib/tauri.ts` — Frontend API wrapper (project goal in Tauri API types)

### Patterns to Follow
- `src/components/detail/TaskDetail.tsx` — Accordion pattern to reuse for description section
- `src/components/ui/` — shadcn/ui components (Card, Badge, Button, Input, Accordion)

### Stores
- `src/stores/useWorkspaceStore.ts` — Workspace state (openTerminal, selectTask)
- `src/stores/useTerminalSessionStore.ts` — Terminal session creation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` component from shadcn/ui — can be used for the goal hero card
- `Accordion` pattern in TaskDetail — can be reused for the description section
- `Badge` component — already used for tier display
- `Input` component — already used for inline name editing, can reuse pattern for goal editing

### Established Patterns
- Inline editing: name field uses Input with onBlur save — goal can follow the same pattern
- Auto-save with debounce: description uses 800ms setTimeout for auto-save — goal can use same
- Store selectors: useStore for project data, useWorkspaceStore for workspace actions

### Integration Points
- `ProjectDetail.tsx` is rendered by `CenterPanel.tsx` when a project is selected
- `api.updateProject()` currently takes (id, name, description) — needs goal parameter added
- Terminal sessions created via `useTerminalSessionStore.getState().createSession()`
- File tree opening via workspace store

</code_context>

<specifics>
## Specific Ideas

- ASCII wireframe selected by user:
  ```
  Project Name          [GSD] [Quick/Med]

  ┌─────────────────────────────────────┐
  │ 🎯 Goal: Ship v2 API by Q3    [✏️] │
  └─────────────────────────────────────┘

  [ Open Workspace ]   /path/to/dir

  ━ Phases ━━━━━━━━━━━━━━━━━━━━━━━━━
    Phase 1: Setup        3/5 ███░░
    Phase 2: Core         0/4 ░░░░
  ```

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-goal-first-project-detail*
*Context gathered: 2026-04-04*
