# Architecture Research

**Domain:** UI restructuring of existing Tauri 2.x + React 19 + Zustand desktop app
**Researched:** 2026-04-04
**Confidence:** HIGH (this is a refactor of known code, not greenfield)

## System Overview: Current vs Target

### Current Layout

```
+----------------------------------------------------------------------+
| AppLayout                                                            |
+----------+-------------------------------------------+---------------+
|          |  ResizablePanelGroup (vertical)           |               |
|          |  +-------------------------------------+  |               |
|  Sidebar |  | CenterPanel                         |  | AgentPanel   |
|  (280px) |  |  HubView: 3-col ResizableGroup      |  |  (w-80)     |
|          |  |   Goals | Briefing+Chat | Cal        |  |  border-l   |
|          |  +-------------------------------------+  |               |
|          |  | ResizableHandle (drawer tabs)        |  |               |
|          |  +-------------------------------------+  |               |
|          |  | OutputDrawer                         |  |               |
|          |  |  terminal | logs | history           |  |               |
|          |  +-------------------------------------+  |               |
+----------+-------------------------------------------+---------------+
```

### Target Layout

```
+----------------------------------------------------------------------+
| AppLayout                                                            |
+----------+-----------------------------------------------------------+
|          |  +-----------------------------------------------------+  |
|  Sidebar |  | CenterPanel                                         |  |
|  (280px) |  |  HubView: single center + slide-in overlays         |  |
|          |  |  OR ProjectDetail: goal-first layout                 |  |
|          |  +-----------------------------------------------------+  |
|          |  | DrawerBar (click-to-toggle)                          |  |
|          |  |  terminal | logs | history | Element AI              |  |
|          |  +-----------------------------------------------------+  |
|          |  | OutputDrawer (450px fixed when open)                 |  |
|          |  |  (includes agent terminal as "Element AI" tab)       |  |
|          |  +-----------------------------------------------------+  |
+----------+-----------------------------------------------------------+
```

Key structural changes:
1. **AgentPanel removed** from right-side flex column
2. **HubView** loses ResizablePanelGroup, becomes single view with slide-in overlays
3. **OutputDrawer** gains "Element AI" tab, replaces drag-to-resize with click-to-toggle
4. **ProjectDetail** reordered to lead with goal/problem

## Component Responsibilities

| Component | Current Responsibility | v1.6 Change |
|-----------|----------------------|-------------|
| `AppLayout` | Sidebar + vertical split + AgentPanel right column | Remove AgentPanel from flex row, simplify drawer to click-toggle |
| `HubView` | 3-column ResizablePanelGroup (Goals, Briefing, Calendar) | Single center view with slide-in panel overlays |
| `HubCenterPanel` | BriefingPanel + HubChat stacked | Becomes the primary hub content (briefing + chat), no longer nested in column |
| `GoalsTreePanel` | Left column content | Slide-in overlay from left, toggled by button |
| `HubCalendar` | Right column content | Slide-in overlay from right, toggled by button |
| `BriefingPanel` | Auto-generates on mount | On-demand generation with "Generate / Skip" button |
| `OutputDrawer` | Terminal + logs + history tabs | Add "Element AI" tab, fixed 450px height |
| `AgentPanel` | Right sidebar (w-80, border-l) | **Deleted** - content moves to drawer tab |
| `AgentTerminalTab` | Tab inside AgentPanel | Moves into OutputDrawer as "Element AI" tab content |
| `ProjectDetail` | Name/description/progress/phases layout | Goal-first: goal hero -> workspace entry -> phases |
| `CenterPanel` | View router (hub/project/task/theme/workflow) | No change to routing, but ProjectDetail content restructured |

## New vs Modified Components

### New Components to Build

| Component | Purpose | Depends On |
|-----------|---------|------------|
| `SlidePanel.tsx` | Generic slide-in overlay wrapper (left/right) | Nothing |
| `HubToolbar.tsx` | Toggle buttons for Goals / Calendar overlays | `useWorkspaceStore.hubOverlays` |
| `DrawerBar.tsx` | Click-to-toggle bar replacing ResizableHandle content | `useWorkspaceStore` (DrawerTab) |
| `ProjectGoalHero.tsx` | Goal/problem statement hero section | Project data from `useStore` |
| `ProjectWorkspaceEntry.tsx` | Consolidated directory + AI button row | Existing `OpenAiButton`, `DirectoryLink` |

### Existing Components to Modify

| Component | Change | Scope |
|-----------|--------|-------|
| `AppLayout.tsx` | Remove AgentPanel from flex row, remove ResizablePanel/Handle/usePanelRef, use DrawerBar + conditional fixed-height drawer | Major restructure |
| `HubView.tsx` | Replace ResizablePanelGroup with single center + SlidePanel overlays | Full rewrite |
| `HubCenterPanel.tsx` | Minor - remove ColumnRibbon wrapper, becomes primary content | Small |
| `BriefingPanel.tsx` | Remove auto-generate useEffect, add Generate/Skip button | Medium |
| `OutputDrawer.tsx` | Add "agent" tab rendering AgentActivityTab + AgentTerminalTab | Medium |
| `ProjectDetail.tsx` | Restructure layout: GoalHero on top, then workspace entry, then phases | Full rewrite of render layout |
| `AgentToggleButton.tsx` | Click opens drawer to "agent" tab instead of toggling AgentPanel | Small |
| `useWorkspaceStore.ts` | Add `hubOverlays`, add "agent" to DrawerTab, remove `drawerHeight` and old hubLayout panel sizes | Medium |
| `useAgentStore.ts` | Remove `panelOpen`, `togglePanel` | Small |
| `uiSlice.ts` | Remove `agentStore.setState({ panelOpen: false })` from `navigateToHub` | One line |

### Components to Delete

| Component | Reason |
|-----------|--------|
| `AgentPanel.tsx` | Content moves to OutputDrawer "Element AI" tab |
| `AgentPanelHeader.tsx` | No longer needed (or adapt minimally for drawer) |
| `MinimizedColumn.tsx` | Hub no longer has collapsible columns |

## Architectural Patterns

### Pattern 1: Slide-In Overlay Panel

**What:** A panel that slides in from the edge of the hub view, overlaying the center content. Not a sibling in a ResizablePanelGroup -- a positioned overlay with a shadow edge.

**When to use:** Hub goals panel, hub calendar panel. Any content that is "opt-in" and should not consume permanent screen space.

**Trade-offs:** Simpler than ResizablePanelGroup (no resize state to persist). Overlays don't reflow center content, so the center view stays stable. Downside: can't see overlay + center simultaneously at full width -- but the user asked for this trade-off explicitly.

**Example:**
```typescript
// SlidePanel.tsx - reusable overlay wrapper
interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  side: "left" | "right";
  width?: string;
  children: React.ReactNode;
}

export function SlidePanel({ open, onClose, side, width = "380px", children }: SlidePanelProps) {
  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 z-20 bg-background border-border shadow-lg",
        "transition-transform duration-200",
        side === "left" ? "left-0 border-r" : "right-0 border-l",
        open
          ? "translate-x-0"
          : side === "left" ? "-translate-x-full" : "translate-x-full"
      )}
      style={{ width }}
    >
      {children}
    </div>
  );
}
```

**Zustand integration:**
```typescript
// Add to useWorkspaceStore
hubOverlays: { goals: boolean; calendar: boolean };
toggleHubOverlay: (panel: "goals" | "calendar") => void;
```

This replaces the current `hubLayout` with its `goalsPanelSize`, `centerPanelSize`, `calendarPanelSize`, `goalsCollapsed`, `calendarCollapsed`. Simpler state, fewer edge cases.

### Pattern 2: Click-to-Toggle Drawer

**What:** Replace the ResizableHandle + ResizablePanel drag mechanism with a fixed-height drawer that toggles on click. No drag resize.

**When to use:** The bottom drawer. User wants "click to maximize/minimize", not drag to arbitrary heights.

**Trade-offs:** Loses granular height control. Gains simplicity and predictability. 450px when open, 0 when closed. The drawer bar is always visible with tab buttons.

**AppLayout transformation:**
```typescript
// BEFORE: ResizablePanelGroup with drag
<ResizablePanelGroup direction="vertical">
  <ResizablePanel defaultSize={...} minSize="30%">
    <CenterPanel />
  </ResizablePanel>
  <ResizableHandle>...</ResizableHandle>
  <ResizablePanel collapsible panelRef={drawerPanelRef}>
    <OutputDrawer />
  </ResizablePanel>
</ResizablePanelGroup>

// AFTER: Simple flex column with conditional render
<div className="flex-1 flex flex-col overflow-hidden">
  <div className="flex-1 min-h-0 overflow-hidden">
    <CenterPanel />
  </div>
  <DrawerBar open={drawerOpen} activeTab={activeDrawerTab} onTabClick={handleTabClick} />
  {drawerOpen && (
    <div className="h-[450px] flex-shrink-0 overflow-hidden">
      <OutputDrawer />
    </div>
  )}
</div>
```

This eliminates: `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`, `usePanelRef`, `drawerHeight` state, and the `useEffect` that syncs panel ref size to `drawerOpen`.

### Pattern 3: Goal-First ProjectDetail

**What:** Restructure ProjectDetail to lead with the project's goal/problem, then workspace entry, then phases. Currently leads with name input + tier badge.

**Layout:**
```
+------------------------------------------+
| GOAL HERO                                |
| "Build a desktop project manager that    |
| orchestrates AI-driven work execution"   |
| [Edit goal]                              |
+------------------------------------------+
| WORKSPACE ENTRY                          |
| [Open AI] [Directory: ~/projects/foo]    |
| Progress: 80% (16/20)                    |
+------------------------------------------+
| PHASES                                   |
| > Phase 1: Foundation         12/12 done |
| v Phase 2: Core Features      4/8        |
|   [ ] Task A                             |
|   [x] Task B                             |
+------------------------------------------+
```

**Data source for goal:** Use the existing `description` field but present it as "Goal" in the UI. No database migration needed. If distinct goal vs description semantics are needed later, add a column then.

## Data Flow

### Hub View Data Flow (Target)

```
[Sidebar click "Hub"]
    |
    v
useStore.navigateToHub() -> activeView = "hub"
    |
    v
CenterPanel renders HubView
    |
    v
HubView renders:
  1. HubToolbar (toggle buttons for Goals/Calendar)
  2. HubCenterPanel (briefing + chat) -- always visible, full width
  3. SlidePanel(side="left") -> GoalsTreePanel -- conditional overlay
  4. SlidePanel(side="right") -> HubCalendar -- conditional overlay
    |
    v
Toggle buttons read/write: useWorkspaceStore.hubOverlays
```

### Agent Panel to Drawer Tab Migration

```
CURRENT:
  AgentToggleButton click -> useAgentStore.togglePanel()
  AppLayout reads agentPanelOpen -> renders <AgentPanel /> as right column
  AgentPanel mounts -> useAgentLifecycle().startAgent() auto-starts

TARGET:
  AgentToggleButton click -> useWorkspaceStore.openDrawerToTab("agent")
  OutputDrawer reads activeDrawerTab -> renders agent content when "agent"
  Agent lifecycle: startAgent() runs at AppLayout level unconditionally
  AgentTerminalTab renders inside OutputDrawer, display:none when tab != "agent"
```

**Critical lifecycle change:** Currently `AgentPanel` auto-starts the agent on mount via `useEffect(() => { startAgent(); }, [])`. When moved to a drawer tab, the agent terminal is lazily mounted.

**Recommendation: Start agent unconditionally at AppLayout level.** The agent's value is autonomous background monitoring. It should start on app launch, not on tab click. The `useAgentQueue` hook already runs at AppLayout level and handles queue polling. Move `startAgent()` into a new `useAgentStartup()` hook called from AppLayout, or fold it into `useAgentQueue`'s init function.

### Drawer Toggle Data Flow (Target)

```
[User clicks tab in DrawerBar]
    |
    v
handleTabClick(tab):
  if drawerOpen && activeTab === tab -> toggleDrawer() (close)
  if drawerOpen && activeTab !== tab -> setActiveDrawerTab(tab)
  if !drawerOpen -> openDrawerToTab(tab)
```

This logic already exists in AppLayout's `handleTabClick`. The only change is removing the ResizablePanel machinery and rendering conditionally with fixed height.

### State Changes Summary

```
useWorkspaceStore changes:
  REMOVE: drawerHeight (no longer variable -- fixed 450px)
  REMOVE: hubLayout.goalsPanelSize, centerPanelSize, calendarPanelSize
  REMOVE: hubLayout.goalsCollapsed, calendarCollapsed
  ADD:    hubOverlays: { goals: boolean; calendar: boolean }
  ADD:    toggleHubOverlay(panel: "goals" | "calendar")
  MODIFY: DrawerTab type -> add "agent"
  KEEP:   drawerOpen, activeDrawerTab, toggleDrawer, openDrawerToTab
  KEEP:   projectStates, themeCollapseState (unchanged)

useAgentStore changes:
  REMOVE: panelOpen, togglePanel
  KEEP:   status, entries, activeTab (activity/terminal within the drawer)
  KEEP:   all entry management (addEntry, approveEntry, etc.)

Persist partialize update:
  REMOVE: drawerHeight from persisted state
  MODIFY: hubLayout shape -> hubOverlays shape
```

## Anti-Patterns

### Anti-Pattern 1: Mounting Agent Terminal Conditionally

**What people do:** Only render `<AgentTerminalTab />` when the drawer tab is active, unmounting/remounting on tab switch.
**Why it's wrong:** xterm.js terminals lose their scroll buffer and PTY connection on unmount. The agent terminal would restart every time the user switches tabs.
**Do this instead:** Use the existing `display: none` pattern from OutputDrawer. Render all tab contents simultaneously, toggle visibility with `style={{ display: activeDrawerTab === "agent" ? "block" : "none" }}`. This is already the pattern used for terminal/logs/history in the current OutputDrawer.

### Anti-Pattern 2: Storing Overlay State in Component useState

**What people do:** Track slide-in panel open/close in HubView's local state.
**Why it's wrong:** State resets when navigating away from hub and back. User expectation: "I had goals open, I check a project, I come back to hub, goals should still be open."
**Do this instead:** Store `hubOverlays` in `useWorkspaceStore` (persisted). Same pattern as `themeCollapseState` and the current `hubLayout`.

### Anti-Pattern 3: Adding a Database Column for "Goal"

**What people do:** Add a `goal` column to the projects table for the goal-first UI.
**Why it's wrong:** The `description` field already serves this purpose. Adding a separate field creates data duplication and migration overhead for a purely presentational change.
**Do this instead:** Use `description` as the goal content, relabel as "Goal" in the UI. If distinct semantics emerge later, add the column then.

### Anti-Pattern 4: Animating Drawer with CSS Height Transitions

**What people do:** `transition: height 200ms` on the drawer container.
**Why it's wrong:** Height transitions on elements with xterm.js canvases cause layout thrash and terminal resize flickering. The terminal emits dozens of resize events during the animation.
**Do this instead:** Instant toggle with `display: none` / fixed height. No animation. This is a tool app, not a marketing site.

## Build Order (Dependency-Driven)

```
Phase 1: Drawer Consolidation (foundation)
  DrawerBar.tsx (new) <- no deps
  useWorkspaceStore.ts (modify DrawerTab) <- no deps
  AppLayout.tsx (remove ResizablePanel, use DrawerBar) <- depends on DrawerBar
  OutputDrawer.tsx (add "agent" tab) <- depends on DrawerTab type change
  AgentToggleButton.tsx (open drawer tab) <- depends on DrawerTab type change
  useAgentStore.ts (remove panelOpen) <- depends on AgentPanel deletion
  AgentPanel.tsx (delete) <- depends on OutputDrawer having agent tab
  uiSlice.ts (remove agentStore panelOpen ref) <- depends on store change

Phase 2: Hub Overhaul
  SlidePanel.tsx (new) <- no deps
  HubToolbar.tsx (new) <- depends on useWorkspaceStore.hubOverlays
  useWorkspaceStore.ts (add hubOverlays) <- no deps
  HubView.tsx (rewrite) <- depends on SlidePanel, HubToolbar, hubOverlays
  MinimizedColumn.tsx (delete) <- depends on HubView rewrite

Phase 3: Briefing Rework (can parallel Phase 2)
  BriefingPanel.tsx (modify) <- no deps on phases 1-2
  BriefingContent.tsx (styling improvements) <- no deps

Phase 4: Project Detail
  ProjectGoalHero.tsx (new) <- no deps
  ProjectWorkspaceEntry.tsx (new) <- no deps
  ProjectDetail.tsx (rewrite) <- depends on new components

Phase 5: Bug Fixes + Polish
  Calendar "Today" label fix
  Deterministic overdue detection
  Workflows section minimizable
```

**Phase ordering rationale:**
- Phase 1 first because removing the right AgentPanel column simplifies the entire AppLayout, making every subsequent change easier.
- Phase 2 after drawer because the hub is the largest visual change and benefits from the simplified AppLayout (no right column to worry about).
- Phase 3 can parallel phase 2 because BriefingPanel changes are self-contained.
- Phase 4 after hub because the project detail is independent but having the overall structure stable reduces risk.
- Phase 5 last because bug fixes are independent and lowest risk.

## Sources

- Direct codebase analysis of AppLayout.tsx, HubView.tsx, OutputDrawer.tsx, AgentPanel.tsx, AgentTerminalTab.tsx, useWorkspaceStore.ts, useAgentStore.ts, useAgentLifecycle.ts, useAgentQueue.ts, CenterPanel.tsx, ProjectDetail.tsx, HubCenterPanel.tsx, BriefingPanel.tsx, GoalsTreePanel.tsx, uiSlice.ts
- User feedback in `project_ui_overhaul_v16.md` memory file
- v1.6 Clarity milestone definition in PROJECT.md

---
*Architecture research for: Element v1.6 Clarity UI restructuring*
*Researched: 2026-04-04*
