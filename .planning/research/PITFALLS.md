# Pitfalls Research

**Domain:** UI restructuring of a complex React/Tauri desktop app (layout system overhaul, panel animations, drawer consolidation, component relocation)
**Researched:** 2026-04-04
**Confidence:** HIGH (based on direct codebase analysis + known project history of 3 Zustand crashes + user feedback)

## Critical Pitfalls

### Pitfall 1: Zustand Selector Reference Instability During Store Refactoring

**What goes wrong:**
When refactoring `useWorkspaceStore` to support the new hub layout (replacing `HubLayout` with slide-in panel state, adding AI tab to drawer, changing drawer toggle behavior), new selectors return fresh object/array references on every call. This triggers `useSyncExternalStore` infinite render loops -- `Maximum update depth exceeded` crashes.

**Why it happens:**
The v1.6 changes touch the workspace store heavily: new `DrawerTab` values (adding "ai"), new panel visibility booleans, possibly new hub panel state replacing `HubLayout`. Each new selector is an opportunity to introduce `s.foo ?? []`, `.filter()`, or object-spread patterns that create unstable references. This has already caused 3 crashes in this project (TerminalPane, OutputDrawer x2).

**How to avoid:**
- Every new selector must be audited for referential stability before use
- Use module-level constants for fallbacks: `const EMPTY: T[] = []` instead of `?? []`
- Select primitives individually instead of constructing objects: `useStore(s => s.panelVisible)` not `useStore(s => ({ visible: s.panelVisible, tab: s.activeTab }))`
- When deriving arrays, select the source and use `useMemo` in the component
- Run the existing test suite after every store change -- the crashes manifest immediately

**Warning signs:**
- `Maximum update depth exceeded` error in console
- Component flickering or freezing on mount
- Any selector containing `.map()`, `.filter()`, `Object.keys()`, `?? []`, or `{ ...spread }` syntax

**Phase to address:**
Phase 1 (drawer consolidation) -- this is where most store changes happen. Establish the pattern early.

---

### Pitfall 2: Hub Layout Regression -- Losing ResizablePanel State During Replacement

**What goes wrong:**
The current `HubView` uses `react-resizable-panels` with 3 panels (Goals, Briefing, Calendar), each with panel refs, collapse state, and persisted layout sizes in `useWorkspaceStore.hubLayout`. Replacing this with a single center view + slide-in overlays means removing this entire panel group. If done incrementally (panel by panel), intermediate states break -- a 2-panel `ResizablePanelGroup` behaves differently than a 3-panel one, and size percentages no longer add to 100%.

**Why it happens:**
`react-resizable-panels` calculates sizes as percentages of the group. Removing one panel without recalculating the others leaves the layout broken. The persisted `hubLayout` in localStorage (`element-workspace` key) still contains the old 3-panel sizes, causing hydration mismatches on reload.

**How to avoid:**
- Replace the entire `HubView` component in one pass, not incrementally
- Clear or migrate the persisted `hubLayout` state -- add a version field to the persisted workspace state and run a migration on load
- Remove the `HubLayout` interface and `hubLayout` from the workspace store's `partialize` config once the new layout is in place
- Test with a fresh localStorage state AND with existing persisted state from v1.5

**Warning signs:**
- Panels render at 0% width or overflow the container
- Layout "jumps" on page load (hydration mismatch between initial render and persisted state)
- Console warnings from `react-resizable-panels` about invalid size constraints

**Phase to address:**
The hub overhaul phase -- do this as a complete replacement, not incremental refactor.

---

### Pitfall 3: AgentPanel Relocation Breaks Auto-Start and Queue Lifecycle

**What goes wrong:**
`AgentPanel` currently mounts as a sibling to the vertical `ResizablePanelGroup` in `AppLayout` (line 187: `{agentPanelOpen && <AgentPanel />}`). It auto-starts the agent on mount via `useEffect(() => { startAgent(); }, [startAgent])`. Moving it into the bottom drawer as a tab means it now conditionally renders based on `activeDrawerTab === "ai"` -- so the agent only starts when the user switches to the AI tab, and unmounting the tab kills the lifecycle hooks.

**Why it happens:**
The agent panel was designed as an always-available sidebar that mounts once and stays mounted. Drawer tabs in `OutputDrawer` use `display: none` for inactive tabs (terminal, logs, history) but the agent lifecycle depends on React mount/unmount behavior. If the AI tab uses conditional rendering, mount/unmount breaks the lifecycle. If it uses `display: none`, the agent stays mounted but invisible (wasting resources if not needed).

**How to avoid:**
- Separate the agent lifecycle (queue watcher, auto-start) from the agent UI
- The lifecycle hooks (`useAgentQueue` at AppLayout line 39, agent auto-start) should stay in `AppLayout` or a top-level provider, independent of the panel visibility
- The AI drawer tab should only render the UI (activity feed, terminal) using the same `display: none` pattern as other drawer tabs
- Remove `AgentPanel`'s internal `useEffect` auto-start -- `useAgentQueue()` already runs in `AppLayout`
- Test: open AI tab, close it, verify agent queue still processes

**Warning signs:**
- Agent stops responding after switching away from AI tab
- Double agent starts when switching back to AI tab (lifecycle hook fires again on remount)
- Agent terminal loses scroll position or state on tab switch

**Phase to address:**
Drawer consolidation phase -- must be designed before implementation, not retrofitted.

---

### Pitfall 4: Slide-In Panel Animations Cause Layout Shift and Content Reflow

**What goes wrong:**
Adding slide-in panels (Goals, Calendar, Briefing) that overlay or push the hub center content causes the center content to reflow on every open/close. If the briefing has streaming text, the reflow interrupts the stream visually. If the center view has a scrolled position, the reflow resets it. Chat input loses focus. Calendar time grid jumps.

**Why it happens:**
Two implementation approaches, both with traps:
1. **Push layout** (panel slides in, center shrinks): Triggers reflow of all center content. If center uses `flex-1`, the resize causes re-renders of everything inside.
2. **Overlay layout** (panel slides over center): Content behind is obscured but not reflowed. Better for performance but worse for usability if the user needs to see both.

CSS `transition` on width/transform works but triggers layout thrashing if the center content has complex DOM (chat messages, calendar grid).

**How to avoid:**
- Use overlay (absolute/fixed positioning + transform) for the slide-in panels, not push layout
- Animate with `transform: translateX()` only -- this is GPU-composited, does not trigger layout recalculation
- Never animate `width`, `margin`, `padding`, or `left/right` properties
- Keep center content mounted and stable regardless of panel state
- Use `will-change: transform` on the panel container (but remove it after animation completes to free GPU memory)
- Test with the briefing actively streaming while opening/closing panels

**Warning signs:**
- Janky/stuttering animation (below 60fps)
- Content "jumps" when panel opens
- Chat input loses focus during animation
- Scroll position resets in the center view

**Phase to address:**
Hub overhaul phase -- the panel animation system must be designed before building individual panels.

---

### Pitfall 5: Drawer Toggle Behavior Change Breaks Per-Project State Restore

**What goes wrong:**
The current drawer has complex per-project state: each project saves/restores `drawerOpen`, `drawerTab`, and `centerTab` via `useWorkspaceStore.projectStates`. Changing the drawer to click-to-toggle (no drag resize) and adding a new "ai" tab alters the state shape. The `restoreProjectState` function applies saved `drawerOpen` and `drawerTab` -- if the drawer toggle behavior changed (fixed height vs. resizable), restoring `drawerHeight` from global persisted state could conflict.

**Why it happens:**
`ProjectWorkspaceState` is session-only (not persisted to localStorage), so cold starts are safe. But within a session, switching between projects that were opened before and after the drawer refactor creates inconsistent state. Also, `drawerHeight` is persisted globally -- if the drawer becomes fixed-height click-to-toggle, this persisted value becomes dead state that could interfere if drag resize is ever re-added.

**How to avoid:**
- Add "ai" to the `DrawerTab` type union cleanly -- TypeScript will flag any switch/if statements that don't handle it
- Remove `drawerHeight` from persisted state if moving to fixed toggle (no more resizable), or set a fixed value
- Update `DEFAULT_PROJECT_STATE` to reflect the new defaults
- Test the full cycle: open project A, switch to project B, switch back -- verify drawer state is correct for each

**Warning signs:**
- Drawer opens at wrong height or wrong tab after project switch
- Drawer appears "stuck" (neither open nor closed) after switching projects
- TypeScript errors about exhaustive checks on `DrawerTab`

**Phase to address:**
Drawer consolidation phase -- update the store interface and defaults first, then the UI.

---

### Pitfall 6: Moving Components Between Layout Regions Orphans Event Listeners and Destroys Terminal Canvas

**What goes wrong:**
Moving the AI panel from a right sidebar to a drawer tab, or moving the briefing from a resizable panel column to a slide-in overlay, means unmounting from one DOM location and remounting in another. Components with xterm.js terminal instances will have their canvas destroyed -- xterm.js cannot be reparented in the DOM. The briefing stream SSE connection tears down. Agent event listeners detach.

**Why it happens:**
React keys determine component identity. When a component moves to a different parent in the tree, React treats it as an unmount+remount. The `TerminalPane` already uses a mount-all/show-one pattern (all sessions mount, only active one is visible via `display: none`) to preserve state -- but this pattern only works if the terminal's DOM parent does not change.

**How to avoid:**
- For the agent terminal: keep the terminal instance mounted at a stable DOM location, render into the drawer tab via `display: none` pattern, never unmount/remount
- For the briefing: `useBriefingStream` maintains state in `useBriefingStore`, so the stream state survives unmount. But verify the SSE listener cleanup does not kill an in-progress stream
- For project terminal sessions: maintain the existing mount-all/show-one pattern unchanged -- do not alter the terminal container's parent element
- Never reparent an xterm.js instance -- this destroys the canvas irreversibly

**Warning signs:**
- Terminal goes blank after layout change
- Briefing restarts streaming from scratch when panel reopens
- Memory leaks from event listeners that were not cleaned up during the old component's unmount
- Console errors about destroyed or detached DOM nodes

**Phase to address:**
Every phase that moves a component -- but especially the drawer consolidation (agent panel move) and hub overhaul (briefing/goals/calendar relocation).

---

### Pitfall 7: Goal-First Project Detail Loses Existing Workspace Entry Points

**What goes wrong:**
Redesigning `ProjectDetail` to lead with the goal/problem being solved risks burying or removing the workspace entry points (directory link button, "Open AI" button, file explorer tab, terminal access). Users who rely on the current flow (click project -> see tasks -> open terminal) find the workflow broken because the workspace controls moved or disappeared.

**Why it happens:**
Goal-first redesign focuses on "what matters" -- the project's purpose. But for active development projects, "what matters" is getting into the workspace quickly. The redesign optimizes for comprehension over action. Both are needed, but action must not require more clicks.

**How to avoid:**
- Keep workspace controls (directory link, Open AI button, terminal shortcut) in a persistent header/toolbar area, not inside scrollable content
- The goal section should be prominent but compact -- a card or banner, not a full-page hero
- Maintain the `ProjectTabBar` (detail/files toggle) -- it works well
- Test the "I just want to start coding" flow: click project in sidebar -> 1 click to terminal. If this takes more clicks than today, the redesign regressed

**Warning signs:**
- Users scrolling past goal content to find the "Open AI" button
- Directory link button no longer visible without scrolling
- The `ProjectTabBar` was removed "for simplicity" but no replacement exists

**Phase to address:**
Project detail redesign phase -- wireframe the layout before coding, verify click-count for workspace entry.

---

### Pitfall 8: Concurrent State Mutations from Multiple Active Panels

**What goes wrong:**
With slide-in panels, the hub chat, briefing, calendar, and goals tree can all be visible simultaneously. Each has its own store slice/store and async operations. If the briefing regenerates (calling `generate_briefing` via Tauri invoke), the goals tree refreshes (calling `loadProjects`), and the chat sends a message (calling the CLI AI provider) all at once, the frontend stores update in unpredictable order. The UI flickers as partial state updates arrive.

**Why it happens:**
The app uses multiple separate stores (`useStore`, `useWorkspaceStore`, `useBriefingStore`, `useHubChatStore`, `useTerminalSessionStore`, `useAgentStore`). Cross-store coordination is manual (e.g., `navigateToHub` in `uiSlice` calls `useWorkspaceStore.getState()` and `useAgentStore.setState()`). During heavy concurrent async operations, these cross-store calls can race.

**How to avoid:**
- Do not add new cross-store mutations without understanding the existing dependency graph
- Keep panel operations independent: briefing refresh should not trigger goals reload
- If the AI tab consolidation means briefing and chat share context, share it through a store, not through cross-component callbacks
- Debounce rapid state updates if panels trigger reloads on visibility change
- Never call `invoke()` in a `useEffect` that depends on frequently-changing state

**Warning signs:**
- UI "flickers" when multiple panels are open
- Stale data appears briefly before correct data loads
- Race condition: briefing shows data from previous generation after refresh

**Phase to address:**
Hub overhaul phase -- establish clear data flow boundaries before building slide-in panels.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `display: none` for all drawer tabs including AI | Quick implementation, preserves mount state | AI panel stays mounted and running even when not visible, consuming resources (agent queue, terminal) | Acceptable if agent resource usage is negligible when idle |
| Inlining animation styles instead of extracting a `SlidePanel` component | Faster to ship one panel | Each new slide-in panel reimplements animation, inconsistent timing/easing | Never -- extract a reusable `SlidePanel` component from the start |
| Keeping `drawerHeight` in persisted state after removing drag resize | No migration needed | Stale persisted value causes confusion if drag resize is ever re-added; dead code in store | Acceptable for v1.6, clean up in v1.7 |
| Skipping localStorage migration for `hubLayout` | Saves time, existing users will just see defaults | Old persisted state causes broken layout on first load after update | Never -- add a schema version and migrate |
| Duplicating briefing rendering code for slide-in vs. hub center | Ship faster without refactoring | Two diverging implementations of same content | Never -- extract shared `BriefingContent` component (already exists, reuse it) |
| Hardcoding drawer height to 450px without making it a constant | Matches user's target height request | Magic number scattered through layout code | Never -- define as a named constant in the workspace store or a layout config |

## Integration Gotchas

Common mistakes when connecting restructured components to existing systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Agent lifecycle + drawer tab | Auto-starting agent inside the AI tab component -- breaks when tab is not active | Keep `useAgentQueue()` in `AppLayout`, only render UI in drawer tab |
| Terminal sessions + drawer consolidation | Changing the terminal mount structure, breaking xterm canvas | Keep mount-all/show-one pattern unchanged; only modify the container's parent if using `display: none` |
| Briefing + slide-in panel | Triggering `generate_briefing` every time the panel slides open | Check `lastRefreshedAt` staleness before regenerating; panel open != refresh trigger |
| Per-project workspace state + new drawer tabs | Not updating `ProjectWorkspaceState` interface for new `DrawerTab` values | Update the type, defaults, save/restore functions, and test project switching |
| Hub chat + panel overlays | Chat input losing focus when a slide-in panel opens over it | Slide-in panels should not steal focus; use `tabIndex` management and `pointer-events` carefully |
| ResizablePanel removal + AppLayout | Removing `ResizablePanelGroup` from hub but leaving its handle in `AppLayout` | The vertical resizable (center + drawer) is separate from the hub's horizontal resizable -- only remove the hub's horizontal `ResizablePanelGroup`, leave AppLayout's vertical one intact |
| Keyboard shortcuts + new panel system | Global shortcuts (Cmd+K, etc.) fire while typing in a slide-in panel | Review `useGlobalShortcut` to ensure it checks `document.activeElement` before firing |

## Performance Traps

Patterns that work at small scale but fail as the app grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Animating `width` or `height` for slide-in panels | Janky animation, dropped frames, layout thrashing | Use `transform: translateX()` only -- GPU composited, no layout recalc | Immediately on lower-end hardware |
| Re-rendering entire hub on any panel visibility toggle | Visible lag when opening/closing panels | Panel visibility state should only trigger re-render in the panel wrapper, not parent | With 3+ panels and complex content (calendar grid, chat messages) |
| Mounting/unmounting xterm.js on drawer tab switch | Terminal goes blank, shell history lost, PTY process keeps running detached | Use `display: none` pattern, never unmount terminal instances | Immediately -- users will notice on first tab switch |
| `useEffect` with Tauri `invoke` on panel mount | Every panel open triggers backend calls, blocks UI | Gate invocations behind staleness checks (timestamp comparison) | When user rapidly toggles panels open/closed |
| CSS `transition` on `all` properties | Every CSS property animates, including `background`, `border`, `color` | Only transition `transform` and `opacity` on panel containers | Immediate visual jank with themed components |

## UX Pitfalls

Common user experience mistakes in layout restructuring.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Slide-in panel with no clear close affordance | User trapped in panel, does not know how to dismiss | Visible close button + click-outside-to-dismiss + Escape key |
| Removing horizontal scroll but replacing with overlapping panels | New layout is more confusing than the old one | Panels should be clearly optional overlays; center view must be fully usable without any panel open |
| Drawer click-to-toggle with no visual state indicator | User cannot tell if drawer is "open" or "closed" | Tab bar styling should clearly differentiate active/inactive state; add a chevron indicator |
| Goal-first project detail that buries action buttons | Users take more clicks to reach their workspace | Keep action buttons (Open AI, Directory Link) in a persistent toolbar, above scroll |
| Briefing "generate" button without loading feedback | User clicks, nothing happens for 5-10 seconds | Show skeleton/spinner immediately on click, stream content as it arrives (existing pattern in `BriefingPanel`) |
| Panel animations without reduced-motion support | Users with motion sensitivity or vestibular disorders experience discomfort | Respect `prefers-reduced-motion` media query -- instant show/hide, no animation |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Hub slide-in panels:** Often missing keyboard navigation (Escape to close, Tab to focus panel content) -- verify keyboard-only usage works
- [ ] **Drawer AI tab:** Often missing agent lifecycle separation -- verify agent still processes queue when AI tab is not active
- [ ] **Click-to-toggle drawer:** Often missing persisted state migration -- verify app works with stale `element-workspace` localStorage from v1.5
- [ ] **Goal-first project detail:** Often missing workspace quick-access -- verify "project click to terminal" takes the same number of clicks as before (currently: 2 clicks)
- [ ] **Briefing on-demand generation:** Often missing the "already cached" case -- verify that reopening the hub shows cached briefing instantly, not a blank state
- [ ] **Panel animations:** Often missing `prefers-reduced-motion` support -- verify animations respect OS accessibility setting
- [ ] **Calendar Today label fix:** Often tested only in day view -- verify it works in week view across timezone boundaries (midnight edge case)
- [ ] **Overdue detection:** Often only tested with UTC dates -- verify with local timezone where `due_date` date boundary differs from UTC
- [ ] **Slide-in panels:** Often missing mobile-width behavior -- verify panels don't break at narrow window sizes (Tauri window can be resized small)
- [ ] **Drawer tab addition:** Often missing the `handleTabClick` logic update in `AppLayout` -- verify the new "ai" tab follows the same open/close/switch pattern as existing tabs

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Zustand infinite render loop | LOW | Identify the bad selector, add module-level constant or `useMemo`. 5-minute fix once identified |
| Hub layout hydration mismatch | LOW | Clear `element-workspace` from localStorage, add version migration. 30-minute fix |
| Agent lifecycle broken by drawer move | MEDIUM | Extract lifecycle hooks to `AppLayout` level, keep only UI in drawer tab. 1-2 hour refactor |
| Slide-in animation causing layout thrash | MEDIUM | Replace width/margin animation with `transform: translateX()`. 1-hour refactor if caught early |
| Terminal canvas destroyed by remount | HIGH | Requires redesigning the mount structure; xterm.js does not support DOM reparenting. Must use `display: none` from the start -- cannot be fixed retroactively without losing all terminal state |
| Per-project state corruption | LOW | Reset `projectStates` to empty object, update defaults. Session-only state so no persistence migration needed |
| Lost workspace entry points in project detail | MEDIUM | Add persistent toolbar above scroll area. Requires design iteration, 2-4 hour fix |
| Cross-store race conditions | MEDIUM | Add debouncing to concurrent panel operations; isolate store boundaries. 2-4 hours to audit and fix |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Zustand selector instability | Drawer consolidation (first) | Zero `Maximum update depth` errors after store changes; run full test suite |
| Hub layout hydration | Hub overhaul phase | App loads correctly with both fresh localStorage and stale v1.5 localStorage |
| Agent lifecycle breakage | Drawer consolidation (first) | Agent processes queue items when AI tab is not the active drawer tab |
| Slide-in animation performance | Hub overhaul phase | 60fps animation measured with DevTools Performance panel; no layout shift (CLS = 0) |
| Drawer toggle state conflicts | Drawer consolidation (first) | Switch between 3 projects, verify drawer state restores correctly for each |
| Component relocation orphaned refs | Every component-moving phase | No console warnings about memory leaks; terminals retain scroll history after tab switches |
| Goal-first losing workspace entry | Project detail phase | Click count from sidebar to terminal is <= current count (2 clicks) |
| Concurrent panel state mutations | Hub overhaul phase | Open all panels, trigger briefing refresh + chat message simultaneously, no flicker or stale data |

## Sources

- Direct codebase analysis: `AppLayout.tsx` (layout structure, agent panel mounting), `HubView.tsx` (3-panel resizable layout), `OutputDrawer.tsx` (drawer tab display:none pattern), `CenterPanel.tsx` (view routing, project state restore), `AgentPanel.tsx` (agent lifecycle hooks), `useWorkspaceStore.ts` (persisted state, project state, hub layout), `uiSlice.ts` (view navigation, cross-store mutations)
- Project memory: `feedback_zustand_selector_stability.md` -- 3 prior crashes from unstable selectors (TerminalPane, OutputDrawer x2)
- Project memory: `project_ui_overhaul_v16.md` -- user's stated design intent for all v1.6 changes
- `react-resizable-panels` behavior: percentage-based sizing breaks when panel count changes mid-session
- xterm.js limitation: canvas-based rendering cannot survive DOM reparenting (canvas context is destroyed)

---
*Pitfalls research for: v1.6 Clarity UI restructuring*
*Researched: 2026-04-04*
