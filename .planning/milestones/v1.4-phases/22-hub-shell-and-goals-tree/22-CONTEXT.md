# Phase 22: Hub Shell and Goals Tree - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace TodayView with a 3-column hub layout as the default home screen. Left column: navigable goals tree (flat project list with phases, plus "Chores" section for standalone tasks). Center column: placeholder for AI briefing + chat (Phase 23-24). Right column: calendar placeholder. Columns are resizable and minimizable. Home button in sidebar returns to hub.

</domain>

<decisions>
## Implementation Decisions

### Hub Layout Structure
- **D-01:** Hub renders inside the existing CenterPanel slot — no AppLayout restructuring. The 3 columns subdivide CenterPanel's space using a nested ResizablePanelGroup.
- **D-02:** Default column proportions: 25% / 50% / 25% (goals tree / center / calendar placeholder).
- **D-03:** Columns are resizable via drag handles using the existing ResizablePanelGroup pattern.
- **D-04:** Minimized columns collapse to a ~40px icon strip with a vertical icon and "+" expand button. Similar to IDE sidebar panels.

### CenterPanel Routing
- **D-05:** Replace the cascading if/else in CenterPanel with an explicit `activeView` state in the store: `'hub' | 'project' | 'task' | 'theme' | 'workflow'`. CenterPanel switches on this value. Hub is the default.
- **D-06:** TodayView content (time-grouped tasks) is removed entirely. The AI briefing (Phase 23) will handle "what to focus on today." TodayView component can be deleted or left unused.
- **D-07:** App always launches to the hub (`activeView` defaults to `'hub'`). Previous project selection is not restored on launch.

### Goals Tree Design
- **D-08:** Left column shows a flat project list (not grouped by theme). Each project node expands to show its phases. A "Chores" section at the bottom shows standalone tasks as to-do items.
- **D-09:** Progress indicators use filled/hollow/empty circle dots: filled = complete, hollow = in progress, empty = not started.
- **D-10:** Clicking a project or phase in the goals tree navigates away from the hub — sets `activeView` to `'project'` and shows ProjectDetail. Matches existing sidebar click-to-navigate behavior (Phase 18 D-01).
- **D-11:** Standalone tasks in the "Chores" section have interactive checkboxes for quick completion directly from the hub.

### Navigation Flow
- **D-12:** Home button placed at the top of ThemeSidebar, above the theme list. Clicking sets `activeView` to `'hub'`. Always visible. Discord-style home placement.
- **D-13:** No back navigation stack. Home button always returns to hub. Simple mental model: hub or detail view.

### Claude's Discretion
- Hub center column placeholder content before Phase 23 delivers the AI briefing (could be a welcome message, empty state, or minimal task summary)
- Calendar placeholder design and "coming soon" messaging for the right column
- Exact icon choices for minimized column strips and Home button
- Tree expand/collapse animation and indentation styling
- How to handle the `selectedProjectId`/`selectedTaskId` store state when navigating back to hub (likely clear them)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — HUB-01 through HUB-04 (hub layout), GOAL-01 through GOAL-03 (goals tree)

### Architecture
- `.planning/ROADMAP.md` — Phase 22 success criteria, dependency on Phase 21
- `.planning/PROJECT.md` — Core value, tech stack, key decisions

### Prior Phase Context
- `.planning/phases/21-central-ai-agent/21-CONTEXT.md` — Agent panel lives in sidebar (D-02), agent lifecycle patterns, MCP server architecture
- `.planning/phases/18-ui-polish/18-CONTEXT.md` — Sidebar click behavior (D-01: left-click navigates), chevron expand/collapse (D-04), Zustand persist pattern (D-05)

### Existing Code (critical files to read)
- `src/components/layout/CenterPanel.tsx` — Current cascading if/else routing (must be replaced with activeView switch)
- `src/components/layout/AppLayout.tsx` — ResizablePanelGroup layout (hub nests inside CenterPanel, no changes here)
- `src/components/center/TodayView.tsx` — Being replaced by hub view
- `src/stores/useWorkspaceStore.ts` — Workspace state, persist middleware, drawer state
- `src/stores/index.ts` — Main store with selectedProjectId, selectedThemeId, activeProjectTab
- `src/stores/themeSlice.ts` — Theme/project/standalone task data access
- `src/stores/phaseSlice.ts` — Phase data for goals tree
- `src/components/sidebar/ThemeSidebar.tsx` — Where Home button will be added

### User-Provided Reference
- User mockup showing 3-column layout: goals tree (flat projects + phases + chores), center (greeting + briefing + chat), right (calendar placeholder)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle`: Already used in AppLayout for Sidebar/CenterPanel/OutputDrawer. Can nest another group inside CenterPanel for the 3-column hub.
- `ThemeSection.tsx` / `ThemeHeader.tsx`: Expand/collapse patterns with chevrons. Goals tree can follow this pattern.
- `useWorkspaceStore.ts`: Zustand persist middleware for cross-session state. Column sizes and minimize state can persist here.
- `StandaloneTaskItem.tsx`: Existing component for standalone tasks in sidebar. May be reusable for Chores section.
- `useTaskStore.ts`: Has `todaysTasks` fetching — standalone task data access for Chores section.

### Established Patterns
- **State management**: Zustand with slices (themeSlice, projectSlice, phaseSlice) + standalone stores (useWorkspaceStore, useAgentStore)
- **UI framework**: shadcn/ui + Tailwind CSS + Lucide icons
- **Resizable panels**: `react-resizable-panels` library via shadcn
- **Navigation**: Store-driven — selecting items sets store state, CenterPanel reacts

### Integration Points
- `CenterPanel.tsx`: Main integration point — hub view renders here when `activeView === 'hub'`
- `ThemeSidebar.tsx`: Home button added at top
- Store (`index.ts` or new `uiSlice.ts`): `activeView` state + setter
- `useWorkspaceStore.ts`: Hub column sizes and minimize state persistence

</code_context>

<specifics>
## Specific Ideas

- User provided a mockup showing the exact layout: flat project list with phases on left, greeting + briefing + chat in center, calendar placeholder on right
- "Chores" section with "To-Do's" sub-header containing standalone tasks (Task A, Task B, Task C) at bottom of goals tree
- Center column has "Hello" greeting at top, briefing text below, chat box at bottom — but briefing and chat are Phase 23-24 scope. Phase 22 just provides the shell/routing.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-hub-shell-and-goals-tree*
*Context gathered: 2026-04-01*
