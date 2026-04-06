# Phase 31: Drawer Consolidation - Research

**Researched:** 2026-04-04
**Domain:** React UI layout refactoring (Zustand state, react-resizable-panels, component relocation)
**Confidence:** HIGH

## Summary

Phase 31 consolidates the right sidebar agent panel into the bottom drawer as a new "Element AI" tab, then removes the right sidebar column entirely. The layout simplifies from sidebar + center + drawer + right-panel to sidebar + center + drawer. This is primarily a component relocation and state cleanup phase -- no new libraries or complex architectural patterns are required.

The critical subtlety is the agent lifecycle decoupling: `startAgent()` currently fires on `AgentPanel` mount, meaning the agent only starts when the panel is visible. Decision D-10 requires moving this to AppLayout mount so the agent boots at app startup regardless of which drawer tab is active. The `useAgentLifecycle` hook uses `useState` internally for `agentCommand`/`agentArgs`, which means each hook call site gets its own copy of that state. This needs to be lifted to Zustand (the agent store) or a shared ref so that `AgentTerminalTab` can read the command/args that `startAgent()` resolved.

**Primary recommendation:** Execute in three waves -- (1) add the "Element AI" tab to the drawer with agent content, (2) decouple agent lifecycle from panel visibility and lift command state to the agent store, (3) remove the right sidebar column, AgentPanel, AgentToggleButton, and dead store fields.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Keep `react-resizable-panels` drag handle for manual height adjustment
- **D-02:** Add click-to-toggle on tab bar -- clicking a tab when collapsed expands to last-used height, clicking active tab when expanded collapses
- **D-03:** Expand height uses stored `drawerHeight` value (last drag position), not fixed default
- **D-04:** "Element AI" drawer tab has internal sub-tabs: Activity and Terminal
- **D-05:** Mirrors current AgentPanel layout relocated from sidebar to drawer
- **D-06:** Tab order: Element AI | Terminal | Logs | History
- **D-07:** Tab label is "Element AI"
- **D-08:** `AgentToggleButton` removed from handle bar; Element AI tab replaces it
- **D-09:** Add "Element AI" to `DrawerTab` union type in `useWorkspaceStore`
- **D-10:** Move `startAgent()` call from AgentPanel mount to AppLayout mount
- **D-11:** Queue watcher (`useAgentQueue`) stays active at AppLayout level (already there)
- **D-12:** Agent lifecycle fully decoupled from panel visibility
- **D-13:** Remove `AgentPanel` rendering from AppLayout flex row
- **D-14:** Remove `panelOpen` / `togglePanel` from `useAgentStore`
- **D-15:** `AgentToggleButton` component can be deleted entirely

### Claude's Discretion
- Layout of sub-tabs (Activity / Terminal) within AI drawer tab -- use existing AgentPanelHeader toggle pattern or simplify
- Whether to keep "runs" tab or fold it into "history"
- CSS transition approach for drawer collapse/expand animation

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAW-01 | User can click to toggle the bottom drawer between fully collapsed and expanded (~450px) | Existing `handleTabClick` in AppLayout already implements this pattern for current tabs. Adding "elementai" to the tab list reuses this logic unchanged. The `react-resizable-panels` collapse/expand via `panelRef` is already wired. |
| DRAW-02 | Agent panel is accessible as an "Element AI" tab in the bottom drawer | `OutputDrawer.tsx` uses `display: block/none` pattern for mount-all/show-one. Adding a new `elementai` pane with `AgentActivityTab`/`AgentTerminalTab` content follows the identical pattern. |
| DRAW-03 | Right sidebar agent panel is removed from the app layout | `AppLayout.tsx:187` renders `{agentPanelOpen && <AgentPanel />}` -- this line and all supporting imports/state (`panelOpen`, `togglePanel`, `AgentToggleButton`) are deleted. |
</phase_requirements>

## Standard Stack

### Core (already installed, no additions)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | (installed) | UI framework | Project standard |
| zustand | (installed) | State management | All stores use Zustand with `create` + `persist` |
| react-resizable-panels | (installed) | Drawer resize/collapse | Already powers the bottom drawer panel |
| lucide-react | (installed) | Icons | GripHorizontal, Bot, ChevronRight, etc. |

### Supporting (no new dependencies)
No new packages needed. This phase is purely component relocation and state cleanup.

**Installation:** None required. Zero new dependencies.

## Architecture Patterns

### Recommended Change Structure
```
src/
  components/
    layout/
      AppLayout.tsx        # (modify) Add elementai tab, move startAgent, remove AgentPanel
      OutputDrawer.tsx      # (modify) Add Element AI content pane
    agent/
      AgentPanel.tsx        # (delete)
      AgentToggleButton.tsx # (delete)
      AgentPanelHeader.tsx  # (modify) Remove close chevron, adapt for drawer context
      AgentActivityTab.tsx  # (preserve, no changes)
      AgentTerminalTab.tsx  # (preserve, no changes)
  stores/
    useWorkspaceStore.ts   # (modify) Add "elementai" to DrawerTab union
    useAgentStore.ts       # (modify) Remove panelOpen, togglePanel
  types/
    agent.ts               # (modify) Remove panelOpen, togglePanel from AgentState
  hooks/
    useAgentLifecycle.ts   # (modify) Lift agentCommand/agentArgs to agent store
    useKeyboardShortcuts.ts # (modify) Replace Cmd+Shift+A agent panel toggle with drawer tab toggle
```

### Pattern 1: Mount-All / Show-One (display: block/none)
**What:** All drawer tab content is mounted simultaneously, with only the active tab visible via inline `display` style.
**When to use:** When tab content has expensive state (terminals, scroll positions) that must survive tab switching.
**Example:**
```typescript
// Existing pattern in OutputDrawer.tsx
<div style={{ display: activeDrawerTab === "elementai" ? "block" : "none" }} className="h-full">
  {/* Element AI content */}
</div>
<div style={{ display: activeDrawerTab === "terminal" ? "block" : "none" }} className="h-full">
  {/* Terminal content */}
</div>
```
**Why this matters:** The agent terminal (xterm.js) would lose its buffer and process state if conditionally unmounted. The display pattern keeps it alive.

### Pattern 2: Tab Click-to-Toggle
**What:** The existing `handleTabClick` function in AppLayout handles three states: collapsed+click=expand, expanded+same-tab=collapse, expanded+different-tab=switch.
**When to use:** Every drawer tab button uses this handler.
**Example:**
```typescript
// Already implemented in AppLayout.tsx:55-66
const handleTabClick = (tab: DrawerTab) => {
  if (drawerOpen && activeDrawerTab === tab) {
    toggleDrawer();
  } else if (drawerOpen) {
    setActiveDrawerTab(tab);
  } else {
    openDrawerToTab(tab);
  }
  if (selectedProjectId) {
    setProjectDrawerState(selectedProjectId, true, tab);
  }
};
```
**No changes needed** to this function -- it already works with any DrawerTab value.

### Pattern 3: Agent Lifecycle State Lifting
**What:** `useAgentLifecycle` currently stores `agentCommand` and `agentArgs` in React `useState`, meaning each call site gets independent state. To decouple the lifecycle from panel visibility, these values must be lifted to the Zustand agent store.
**When to use:** When the agent starts at AppLayout mount but `AgentTerminalTab` needs the resolved command/args.
**Example:**
```typescript
// In useAgentStore.ts, add:
agentCommand: null as string | null,
agentArgs: null as string[] | null,
setAgentCommand: (cmd: string | null) => set({ agentCommand: cmd }),
setAgentArgs: (args: string[] | null) => set({ agentArgs: args }),

// In useAgentLifecycle.ts, replace useState with store:
const setAgentCommand = useAgentStore((s) => s.setAgentCommand);
const setAgentArgs = useAgentStore((s) => s.setAgentArgs);
// In startAgent(), call setAgentCommand(command) and setAgentArgs(agentArgs)

// In AgentTerminalTab.tsx, read from store instead of hook:
const agentCommand = useAgentStore((s) => s.agentCommand);
const agentArgs = useAgentStore((s) => s.agentArgs);
```

### Anti-Patterns to Avoid
- **Conditional rendering for agent content:** Do NOT use `{activeDrawerTab === "elementai" && <AgentActivityTab />}`. This unmounts the agent terminal and loses xterm.js state. Use `display: block/none` like all other drawer tabs.
- **Calling useAgentLifecycle from multiple unrelated components:** Each call creates independent useState copies. After this phase, only AppLayout should call `startAgent()` via useEffect, and AgentTerminalTab reads command/args from the store.
- **Returning new object/array refs from Zustand selectors:** Per project memory -- never return new object/array refs. Use module-level constants (like `EMPTY_SESSIONS` in OutputDrawer.tsx).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drawer collapse/expand | Custom height animation | `react-resizable-panels` collapse/panelRef | Already handles resize, collapse, persistence |
| Tab state management | Custom tab context | `useWorkspaceStore.activeDrawerTab` | Already persisted per-project, tested |
| Agent process management | Custom process supervisor | Existing `useAgentLifecycle` hook | Handles backoff, restart, validation |

## Common Pitfalls

### Pitfall 1: Agent Terminal Loses State on Tab Switch
**What goes wrong:** Agent terminal (xterm.js) resets to blank when switching away from Element AI tab and back.
**Why it happens:** Using conditional rendering (`{condition && <Component />}`) instead of display toggle pattern.
**How to avoid:** Use `style={{ display: activeDrawerTab === "elementai" ? "block" : "none" }}` exactly like existing tabs.
**Warning signs:** Terminal goes blank after tab switch; terminal reconnects/respawns.

### Pitfall 2: Agent Never Starts After Panel Removal
**What goes wrong:** After removing AgentPanel, the agent process never starts because `startAgent()` was called in AgentPanel's useEffect.
**Why it happens:** Decision D-10 requires moving `startAgent()` to AppLayout mount, but if this is done in the wrong order (delete panel before adding the new call site), the agent silently fails to start.
**How to avoid:** Add the AppLayout-level `startAgent()` useEffect BEFORE removing the AgentPanel mount call. Or do both in the same task.
**Warning signs:** Agent status stays "stopped", no terminal process starts.

### Pitfall 3: useAgentLifecycle useState Isolation
**What goes wrong:** `AgentTerminalTab` reads `agentCommand`/`agentArgs` from its own `useAgentLifecycle()` call, but `startAgent()` was called from a different hook instance (AppLayout). The terminal never gets the resolved command.
**Why it happens:** React hooks with `useState` create per-instance state. Two components calling the same hook get separate state.
**How to avoid:** Lift `agentCommand`/`agentArgs` to the Zustand `useAgentStore` before relocating the startAgent call.
**Warning signs:** AgentTerminalTab shows "Agent starting" forever because `agentCommand` is always null.

### Pitfall 4: Keyboard Shortcut Cmd+Shift+A Breaks
**What goes wrong:** After removing `panelOpen`/`togglePanel` from agent store, the Cmd+Shift+A shortcut in `useKeyboardShortcuts.ts` throws or does nothing.
**Why it happens:** Line 25 of useKeyboardShortcuts.ts references `useAgentStore((s) => s.togglePanel)` which no longer exists.
**How to avoid:** Update the shortcut to toggle the drawer to the "elementai" tab instead (open drawer to Element AI, or collapse if already showing it).
**Warning signs:** Console error on Cmd+Shift+A; shortcut silently fails.

### Pitfall 5: uiSlice References Dead Store Fields
**What goes wrong:** `src/stores/uiSlice.ts:50` calls `useAgentStore.setState({ panelOpen: false })` which would set orphan state after removing the field.
**Why it happens:** The `selectProject` action in uiSlice resets agent panel state as part of project switching.
**How to avoid:** Remove this line from uiSlice when removing `panelOpen` from the agent store.
**Warning signs:** No visible error, but dead code sets orphan state on the store.

### Pitfall 6: Existing Tests Reference Deleted Fields
**What goes wrong:** Tests in `useAgentStore.test.ts` and `AgentPanel.test.tsx` reference `panelOpen`, `togglePanel`, and the `AgentPanel` component.
**Why it happens:** Test files mock and assert on the old structure.
**How to avoid:** Update/delete affected tests as part of the removal tasks.
**Warning signs:** `vitest run` fails with property-not-found or import errors.

## Code Examples

### Adding "elementai" to DrawerTab Union
```typescript
// src/stores/useWorkspaceStore.ts line 4
export type DrawerTab = "elementai" | "logs" | "history" | "runs" | "terminal";
```

### Updated Tab List in AppLayout Handle Bar
```typescript
// Replace the current tab mapping in AppLayout.tsx:153
{(["elementai", "terminal", "logs", "history"] as DrawerTab[]).map((tab) => (
  <button
    key={tab}
    type="button"
    onClick={() => handleTabClick(tab)}
    className={`relative ${tabClass(tab)}`}
  >
    {tab === "elementai" ? "Element AI" : tab === "logs" ? "Logs" : tab === "history" ? "History" : "Terminal"}
    {tab === "elementai" && pendingCount > 0 && (
      <Badge
        variant="destructive"
        className="size-4 p-0 text-[10px] justify-center absolute -top-1 -right-1"
      >
        {pendingCount > 9 ? "9+" : pendingCount}
      </Badge>
    )}
  </button>
))}
```

### Element AI Pane in OutputDrawer
```typescript
// Add to OutputDrawer.tsx alongside existing panes
<div style={{ display: activeDrawerTab === "elementai" ? "block" : "none" }} className="h-full">
  <div className="flex flex-col h-full">
    <AgentDrawerHeader />
    <div className="flex-1 overflow-hidden">
      {agentSubTab === "activity" ? <AgentActivityTab /> : <AgentTerminalTab />}
    </div>
  </div>
</div>
```

Note: The sub-tab toggle within Element AI can use a simple local state or read from `useAgentStore.activeTab` (which already tracks "activity" | "terminal").

### startAgent at AppLayout Level
```typescript
// In AppLayout.tsx, add:
const { startAgent } = useAgentLifecycle();

useEffect(() => {
  startAgent();
}, [startAgent]);
```

### Updated Keyboard Shortcut
```typescript
// In useKeyboardShortcuts.ts, replace the Cmd+Shift+A handler:
if (meta && e.shiftKey && e.key === "A") {
  e.preventDefault();
  const ws = useWorkspaceStore.getState();
  if (ws.drawerOpen && ws.activeDrawerTab === "elementai") {
    toggleDrawer();
  } else {
    openDrawerToTab("elementai");
  }
  return;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate right sidebar for agent | Agent in bottom drawer tab | This phase | Simpler layout, more horizontal space |
| Agent starts on panel mount | Agent starts on app boot | This phase | Agent always available regardless of UI state |
| `panelOpen` toggle in agent store | Drawer tab state in workspace store | This phase | Single source of truth for all panel visibility |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (with jsdom) |
| Config file | `vite.config.ts` (inline `test` block) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAW-01 | Click tab toggles drawer between collapsed and expanded | unit | `npx vitest run src/stores/useWorkspaceStore -t "drawer" -x` | Needs new tests for "elementai" tab value |
| DRAW-02 | Element AI tab renders agent activity and terminal content | unit | `npx vitest run src/components/agent/__tests__/ -x` | Existing AgentPanel.test.tsx needs rewrite for drawer context |
| DRAW-03 | Right sidebar agent panel is gone from layout | unit | `npx vitest run -x` (full suite verifies no broken imports) | Existing tests must be updated to remove panelOpen references |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Update `src/stores/useAgentStore.test.ts` -- remove tests for `panelOpen`/`togglePanel`, add tests for `agentCommand`/`agentArgs` store fields
- [ ] Update `src/components/agent/__tests__/AgentPanel.test.tsx` -- rewrite or delete (AgentPanel component is being deleted)
- [ ] Add test for DrawerTab union accepting "elementai" value in workspace store
- [ ] Add test for keyboard shortcut Cmd+Shift+A opening drawer to elementai tab

## Open Questions

1. **Sub-tab state location for Element AI pane**
   - What we know: `useAgentStore.activeTab` already tracks "activity" | "terminal"
   - What's unclear: Whether to keep using `useAgentStore.activeTab` (which survives tab switches thanks to mount-all/show-one) or use local state in the OutputDrawer
   - Recommendation: Keep `useAgentStore.activeTab` -- it already works and is tested. No change needed.

2. **"Runs" tab visibility**
   - What we know: "Runs" tab renders conditionally when a workflow is selected (not in the static tab list)
   - What's unclear: Whether to keep it as a conditional 5th tab or fold it into "history"
   - Recommendation: Leave "runs" behavior unchanged for this phase. It is orthogonal to the drawer consolidation. The tab bar already handles conditional tabs.

3. **Collapse/expand animation smoothness**
   - What we know: `react-resizable-panels` collapse is instant by default
   - What's unclear: Whether adding CSS transition on flex-basis will interfere with drag behavior
   - Recommendation: Skip animation in the first pass. If instant collapse feels jarring, add `transition: flex-basis 150ms ease` as a follow-up micro-task.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all canonical reference files listed in CONTEXT.md
- `AppLayout.tsx` -- current layout structure, tab handling, agent panel rendering
- `OutputDrawer.tsx` -- mount-all/show-one pattern for drawer tabs
- `useWorkspaceStore.ts` -- DrawerTab type, drawer state, per-project persistence
- `useAgentStore.ts` -- panelOpen, togglePanel, activeTab state
- `useAgentLifecycle.ts` -- startAgent flow, useState for command/args
- `AgentPanel.tsx` -- mount-time startAgent useEffect
- `useKeyboardShortcuts.ts` -- Cmd+Shift+A shortcut referencing togglePanel
- `uiSlice.ts` -- panelOpen reset on project switch
- `types/agent.ts` -- AgentState interface with panelOpen/togglePanel

### Secondary (MEDIUM confidence)
- Project memory on Zustand selector stability (module-level EMPTY constants)
- UI-SPEC for this phase (design contract for visual/interaction details)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all libraries already in use
- Architecture: HIGH -- all patterns directly observed in codebase, component structure is clear
- Pitfalls: HIGH -- identified through direct code analysis of hook isolation, dead references, and test dependencies

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable -- no external dependency changes expected)
