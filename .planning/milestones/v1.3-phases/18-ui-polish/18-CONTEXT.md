# Phase 18: UI Polish - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the UI more intuitive: single-click project navigation, collapsible sidebar sections with persisted state, simplified task detail view, smart AI button labels with state machine, Link Directory on same line as AI button, and terminal tab as default in the output drawer.

</domain>

<decisions>
## Implementation Decisions

### Project Click Behavior
- **D-01:** Single-clicking a project name in the sidebar navigates to ProjectDetail in the center panel. No menu or dialog should block this.
- **D-02:** The chevron (caret) independently expands/collapses inline task list — separate from navigation. Clicking the chevron does NOT navigate.
- **D-03:** Right-click context menu retained for project actions (Move to Theme, Delete). Left-click always navigates.

### Sidebar Collapse/Expand
- **D-04:** Keep chevron indicators (ChevronRight/ChevronDown) — no change to +/− style. The requirement "UI-02 +/- click toggle" is satisfied by the existing chevron toggle mechanism.
- **D-05:** Theme expand/collapse state persisted per theme across sessions. Store in the workspace store with persistence (similar to existing per-project workspace state pattern).

### Task Detail Simplification
- **D-06:** Immediately visible: title (editable), status dropdown, priority dropdown, description (textarea). These are the primary fields.
- **D-07:** Collapsed by default into accordion sections: Context, Tags, Scheduling, Execution History. Each group has a collapsible header — click to expand. Similar to GitHub issue sidebar pattern.

### AI Button & Link Directory Layout
- **D-08:** Single row layout: AI button on the left, directory path + Link/Change on the right, same horizontal line. Remove the separate "Directory" section.
- **D-09:** AI button state machine labels:
  - No directory linked → "Link Directory" label, button **disabled** with tooltip "Link a directory first". DirectoryLink control is the primary CTA.
  - No planning tier set (but has directory) → "Plan Project"
  - Has plan/content → "Check Progress"
  - Executing → "Open AI" with spinner
  - Complete → "Open AI"
  - Fallback → "Open AI"
- **D-10:** When no directory is linked, the AI button is visible but disabled/greyed out with a tooltip. It is NOT hidden.

### Terminal Tab Default
- **D-11:** Change `DEFAULT_PROJECT_STATE.drawerTab` from `"logs"` to `"terminal"` so the terminal tab is first and selected by default when opening the drawer.
- **D-12:** Reorder drawer tabs to: Terminal, Logs, History (Terminal first).

### Claude's Discretion
- Implementation details for accordion component (use existing shadcn Accordion or build custom collapsible sections)
- Exact spacing/sizing in the AI button + directory row
- How to determine "has plan/content" vs "executing" vs "complete" states from existing project data

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §UI Polish — UI-01 through UI-07 define all acceptance criteria

### Existing Components (modify in place)
- `src/components/sidebar/ThemeSection.tsx` — ProjectRow click behavior, chevron toggle, context menu
- `src/components/sidebar/ThemeHeader.tsx` — Theme expand/collapse header
- `src/components/center/OpenAiButton.tsx` — AI button (needs state machine + label logic)
- `src/components/center/DirectoryLink.tsx` — Directory link control (move to same row as AI button)
- `src/components/center/ProjectDetail.tsx` — Composes OpenAiButton + DirectoryLink (layout change)
- `src/components/center/TaskDetail.tsx` — Task detail view (needs simplification + accordion)
- `src/components/output/DrawerHeader.tsx` — Drawer tab bar (reorder, change default)
- `src/stores/useWorkspaceStore.ts` — Workspace state (drawer tab default, theme collapse persistence)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ThemeSection.tsx` ProjectRow: Already has chevron toggle + select separation — just needs cleanup of DropdownMenu wrapper to ensure left-click always navigates
- `useWorkspaceStore.ts` persist middleware: Already persists workspace state — can extend for theme collapse state
- `shadcn/ui` components: Accordion, Collapsible, Tooltip all available for task detail and AI button
- `DrawerHeader.tsx`: Simple tab bar — reordering is a straightforward change

### Established Patterns
- Zustand + persist middleware for cross-session state (`useWorkspaceStore`)
- shadcn/ui + Tailwind for all UI components
- Lucide icons for all iconography (Bot, ChevronRight, ChevronDown, FolderOpen, etc.)
- `toast` from sonner for error feedback

### Integration Points
- `ProjectDetail.tsx` lines ~388-408: Where OpenAiButton and DirectoryLink are rendered — needs layout refactor
- `useWorkspaceStore.ts` DEFAULT_PROJECT_STATE: Where drawer tab default lives
- `ThemeSection.tsx` ProjectRow: Where sidebar click behavior is defined

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-ui-polish*
*Context gathered: 2026-03-29*
