# Phase 6: Data Foundation and Theme System - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can organize their projects and tasks under themed categories with a restructured sidebar. This phase delivers: schema migration to support themes and standalone tasks, theme CRUD operations, and a sidebar restructured around theme-based navigation with collapsible sections.

</domain>

<decisions>
## Implementation Decisions

### Theme Management UX
- **D-01:** Theme creation uses inline "+" button in sidebar for quick creation, plus a dialog accessible for editing details (name, color) after creation
- **D-02:** Theme rename/delete via both right-click context menu (full options) and subtle hover icons for quick actions
- **D-03:** Themes display a color dot/accent from a preset palette of 8-10 colors for visual distinction
- **D-04:** Deleting a theme with items shows confirmation dialog with item count: "Delete 'Business'? 3 projects and 5 tasks will become uncategorized."

### Sidebar Restructure
- **D-05:** Sidebar uses accordion-style theme sections. Each theme is a collapsible section containing its projects (with expand arrow), then standalone tasks below. Uncategorized bucket at bottom for items with no theme.
- **D-06:** Calendar toggle and mini-calendar stay at the top of the sidebar, above themes (global feature, not theme-specific)
- **D-07:** Workflows remain in their own section below themes, separated by a divider
- **D-08:** Themes are manually reorderable via drag-and-drop, stored as sort_order column
- **D-09:** Reassigning items between themes uses right-click context menu → "Move to theme" submenu (no drag-and-drop reassignment)
- **D-10:** Clicking a project: arrow icon expands to show tasks inline in sidebar; clicking the project name navigates to project detail view in center panel

### Standalone Tasks
- **D-11:** Existing task creation flow stays, but project becomes optional. If created from a theme section, auto-assigns that theme. Quick capture creates standalone tasks.
- **D-12:** Standalone tasks appear in sidebar under their theme, listed after projects with a task icon (○)
- **D-13:** Standalone tasks appear in Today View the same as project tasks — no visual distinction
- **D-14:** Existing tasks (all currently linked to projects) keep their project_id during migration. No data changes for existing rows.

### Migration Strategy
- **D-15:** Single migration file (007_themes.sql): creates themes table, adds theme_id to projects and tasks, makes project_id nullable on tasks
- **D-16:** Existing projects and tasks get NULL theme_id. UI renders them in an "Uncategorized" bucket. No auto-created default theme row.
- **D-17:** Themes table schema includes color from the start: themes(id, name, color, sort_order, created_at, updated_at)
- **D-18:** SQLite table recreation pattern for making tasks.project_id nullable (create new table, copy data, drop old, rename)

### Claude's Discretion
- Technical implementation details of drag-and-drop reordering (library choice, event handling)
- Exact preset color palette selection
- Internal Zustand store structure for themes
- Rust command naming and API design patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Data Layer
- `src-tauri/src/db/sql/001_initial.sql` — Current projects and tasks schema (the baseline being migrated)
- `src-tauri/src/db/sql/` — All existing migrations (001-006) to understand numbering and patterns

### Frontend Patterns
- `src/components/layout/Sidebar.tsx` — Current sidebar structure being restructured
- `src/components/sidebar/ProjectList.tsx` — Existing project list with DropdownMenu pattern (reuse for themes)
- `src/components/sidebar/TaskList.tsx` — Existing task list component
- `src/stores/projectSlice.ts` — Zustand slice pattern to follow for theme store

### Requirements
- `.planning/REQUIREMENTS.md` — THEME-01 through THEME-04 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProjectList.tsx` — DropdownMenu with context menu pattern, ScrollArea, plus button header. Directly reusable as template for theme sections.
- `shadcn/ui` components — Button, DropdownMenu, ScrollArea, Dialog all available
- `useStore` Zustand pattern — Combined store with slices (projectSlice, taskSlice, etc.)
- `api` module (`src/lib/tauri.ts`) — Established Tauri invoke wrapper for backend calls

### Established Patterns
- State management: Zustand with slice pattern (StateCreator<AppStore>)
- Styling: Tailwind CSS with shadcn/ui design tokens (bg-card, text-muted-foreground, etc.)
- Backend commands: Rust commands in `src-tauri/src/commands/` with mod.rs registration
- SQL migrations: Numbered .sql files in `src-tauri/src/db/sql/`

### Integration Points
- `Sidebar.tsx` — Main restructure target, currently imports ProjectList, TaskList, WorkflowList
- `project_commands.rs` — Backend CRUD to extend with theme support
- `task_commands.rs` — Task creation to support optional project_id
- `001_initial.sql` — Schema baseline for migration

</code_context>

<specifics>
## Specific Ideas

- Sidebar accordion preview matches Discord-style channel grouping: theme as category header, projects/tasks as items below
- Color dot is small and subtle — accent, not a background fill
- "Uncategorized" is a virtual UI grouping, not a database row

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-data-foundation-and-theme-system*
*Context gathered: 2026-03-22*
