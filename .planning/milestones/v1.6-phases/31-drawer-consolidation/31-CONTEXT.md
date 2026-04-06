# Phase 31: Drawer Consolidation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Unify the bottom drawer and right sidebar agent panel into a single bottom drawer with an "Element AI" tab. Remove the right sidebar column entirely. AppLayout becomes: sidebar + center + bottom drawer (no right column).

</domain>

<decisions>
## Implementation Decisions

### Drawer Toggle Behavior
- **D-01:** Keep `react-resizable-panels` drag handle for manual height adjustment — power users can drag to resize
- **D-02:** Add click-to-toggle on tab bar — clicking a tab when collapsed expands to last-used height (`drawerHeight` from `useWorkspaceStore`), clicking the active tab when expanded collapses the drawer
- **D-03:** Expand height uses the stored `drawerHeight` value (last drag position), not a fixed default

### AI Tab Content & Layout
- **D-04:** The "Element AI" drawer tab has internal sub-tabs: Activity and Terminal — each takes the full drawer content height when selected
- **D-05:** This mirrors the current AgentPanel layout (AgentActivityTab / AgentTerminalTab) relocated from sidebar to drawer

### Tab Bar Design
- **D-06:** Tab order: Element AI | Terminal | Logs | History — AI is the first (primary) tab
- **D-07:** Tab label is "Element AI" (matches DRAW-02 requirement naming)
- **D-08:** `AgentToggleButton` is removed from the handle bar — the Element AI tab replaces it as the toggle mechanism
- **D-09:** Add "Element AI" to the `DrawerTab` union type in `useWorkspaceStore`

### Agent Lifecycle
- **D-10:** Move `startAgent()` call from AgentPanel mount to AppLayout mount (or top-level provider) — agent runs at app boot regardless of drawer tab visibility
- **D-11:** Queue watcher (`useAgentQueue`) stays active at AppLayout level (already there)
- **D-12:** Agent lifecycle is fully decoupled from panel visibility — no start/stop when switching tabs

### Right Sidebar Removal
- **D-13:** Remove `AgentPanel` rendering from AppLayout's flex row (`{agentPanelOpen && <AgentPanel />}` is deleted)
- **D-14:** Remove `panelOpen` / `togglePanel` from `useAgentStore` (no longer needed)
- **D-15:** `AgentToggleButton` component can be deleted entirely

### Claude's Discretion
- Layout of the sub-tabs (Activity / Terminal) within the AI drawer tab — use the existing AgentPanelHeader toggle pattern or simplify
- Whether to keep the "runs" tab or fold it into "history" (currently hidden unless a workflow is selected)
- CSS transition approach for drawer collapse/expand animation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DRAW-01, DRAW-02, DRAW-03 define the acceptance criteria

### Layout
- `src/components/layout/AppLayout.tsx` — Current sidebar + center + drawer + right sidebar layout
- `src/components/layout/OutputDrawer.tsx` — Current drawer tab content (terminal, logs, history, runs)

### Agent Panel (to relocate)
- `src/components/agent/AgentPanel.tsx` — Right sidebar panel with Activity/Terminal sub-tabs
- `src/components/agent/AgentPanelHeader.tsx` — Sub-tab toggle header
- `src/components/agent/AgentActivityTab.tsx` — Activity feed component
- `src/components/agent/AgentTerminalTab.tsx` — Agent terminal component
- `src/components/agent/AgentToggleButton.tsx` — Toggle button to remove

### State
- `src/stores/useWorkspaceStore.ts` — `DrawerTab` type, drawer open/height/tab state, per-project persistence
- `src/stores/useAgentStore.ts` — `panelOpen`, `togglePanel`, `activeTab` (to refactor)

### Hooks
- `src/hooks/useAgentLifecycle.ts` — `startAgent()` call to relocate
- `src/hooks/useAgentQueue.ts` — Queue watcher (already at AppLayout level)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AgentActivityTab` / `AgentTerminalTab`: Can be reused directly inside the new AI drawer tab
- `AgentPanelHeader`: Sub-tab toggle can be adapted for drawer context
- `DrawerHeader` component exists but is unused in current AppLayout (tabs are inline in ResizableHandle)
- `useWorkspaceStore` already has all drawer state management (open, height, tab, per-project persistence)

### Established Patterns
- Drawer tabs use `display: block/none` pattern for mount-all/show-one (preserves scroll position and terminal state)
- Tab styling: `text-xs font-semibold tracking-wide uppercase` with active/inactive classes
- Per-project drawer state persistence via `setProjectDrawerState`

### Integration Points
- `AppLayout.tsx:187` — Where AgentPanel currently renders (to be removed)
- `AppLayout.tsx:153` — Tab list in ResizableHandle (add "Element AI" here)
- `useWorkspaceStore.ts:4` — `DrawerTab` type union (add new value)
- `OutputDrawer.tsx` — Add new AI content pane alongside existing tabs

</code_context>

<specifics>
## Specific Ideas

- Element AI as the first/primary drawer tab signals that AI is a first-class citizen of the app
- Sub-tabs within the AI drawer tab keep the familiar Activity/Terminal split without cluttering the top-level tab bar

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-drawer-consolidation*
*Context gathered: 2026-04-04*
