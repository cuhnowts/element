# Phase 22: Hub Shell and Goals Tree - Research

**Researched:** 2026-04-01
**Domain:** React UI layout, resizable panels, tree components, Zustand state routing
**Confidence:** HIGH

## Summary

Phase 22 replaces the TodayView fallback with a 3-column hub layout as the default home screen. The implementation is entirely frontend -- no backend changes needed. The core technical challenges are: (1) replacing CenterPanel's cascading if/else routing with an explicit `activeView` state machine, (2) nesting a horizontal `ResizablePanelGroup` inside CenterPanel for the 3-column hub, (3) building a collapsible goals tree from existing project/phase/standalone-task data, and (4) implementing column minimize/expand with persistent state.

All required libraries are already installed. The `react-resizable-panels` library (v4.7.3) supports `collapsible`, `collapsedSize`, `collapse()`, `expand()`, and `isCollapsed()` APIs natively. The shadcn `Collapsible` component wraps `@base-ui/react/collapsible` and handles tree node expand/collapse. A checkbox component does not exist and must be added via `npx shadcn@latest add checkbox` for the Chores section.

**Primary recommendation:** Implement in 3 waves: (1) activeView routing + Home button, (2) hub layout shell with 3 resizable columns + minimize/expand, (3) goals tree with data fetching + Chores section.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Hub renders inside the existing CenterPanel slot -- no AppLayout restructuring. The 3 columns subdivide CenterPanel's space using a nested ResizablePanelGroup.
- **D-02:** Default column proportions: 25% / 50% / 25% (goals tree / center / calendar placeholder).
- **D-03:** Columns are resizable via drag handles using the existing ResizablePanelGroup pattern.
- **D-04:** Minimized columns collapse to a ~40px icon strip with a vertical icon and "+" expand button. Similar to IDE sidebar panels.
- **D-05:** Replace the cascading if/else in CenterPanel with an explicit `activeView` state in the store: `'hub' | 'project' | 'task' | 'theme' | 'workflow'`. CenterPanel switches on this value. Hub is the default.
- **D-06:** TodayView content (time-grouped tasks) is removed entirely. The AI briefing (Phase 23) will handle "what to focus on today." TodayView component can be deleted or left unused.
- **D-07:** App always launches to the hub (`activeView` defaults to `'hub'`). Previous project selection is not restored on launch.
- **D-08:** Left column shows a flat project list (not grouped by theme). Each project node expands to show its phases. A "Chores" section at the bottom shows standalone tasks as to-do items.
- **D-09:** Progress indicators use filled/hollow/empty circle dots: filled = complete, hollow = in progress, empty = not started.
- **D-10:** Clicking a project or phase in the goals tree navigates away from the hub -- sets `activeView` to `'project'` and shows ProjectDetail. Matches existing sidebar click-to-navigate behavior (Phase 18 D-01).
- **D-11:** Standalone tasks in the "Chores" section have interactive checkboxes for quick completion directly from the hub.
- **D-12:** Home button placed at the top of ThemeSidebar, above the theme list. Clicking sets `activeView` to `'hub'`. Always visible. Discord-style home placement.
- **D-13:** No back navigation stack. Home button always returns to hub. Simple mental model: hub or detail view.

### Claude's Discretion
- Hub center column placeholder content before Phase 23 delivers the AI briefing (could be a welcome message, empty state, or minimal task summary)
- Calendar placeholder design and "coming soon" messaging for the right column
- Exact icon choices for minimized column strips and Home button
- Tree expand/collapse animation and indentation styling
- How to handle the `selectedProjectId`/`selectedTaskId` store state when navigating back to hub (likely clear them)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HUB-01 | User sees a 3-column hub (goals tree, AI center, calendar placeholder) as the default home screen | Nested horizontal ResizablePanelGroup inside CenterPanel with 25/50/25 defaults. activeView state machine defaults to 'hub'. |
| HUB-02 | User can minimize any column to a sliver and expand it with a "+" button to restore | react-resizable-panels v4.7.3 `collapsible` + `collapsedSize={0}` + `panelRef.collapse()`/`expand()` API. MinimizedColumn overlay at 40px. |
| HUB-03 | Hub replaces TodayView with explicit CenterPanel routing via activeView state | Replace cascading if/else with switch on activeView. New state in store (uiSlice or standalone). |
| HUB-04 | Right column shows a calendar placeholder with "coming soon" state | CalendarPlaceholder component with heading + body copy from UI-SPEC. |
| GOAL-01 | User sees a collapsible tree of themes -> projects -> phases with progress indicators | Flat project list (D-08, not theme-grouped). Collapsible nodes using shadcn Collapsible. Progress dots: filled/hollow/empty circles. Phase data loaded per-project via existing `loadPhases(projectId)`. |
| GOAL-02 | User can click a project/phase in the tree to navigate to its detail view | Click handler sets `activeView='project'` + `selectedProjectId`. Uses existing `selectProject()` from projectSlice. |
| GOAL-03 | User sees standalone tasks grouped under a "Chores" section with to-do items | Existing `loadStandaloneTasks()` from themeSlice. Checkbox component needed (add via shadcn). Toggle completion via `updateTaskStatus()`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-resizable-panels | 4.7.3 (installed) | 3-column hub layout with collapse/expand | Already used in AppLayout for sidebar/center/drawer split. Native collapse API. |
| zustand | 5.0.11 (installed) | activeView state, hub layout persistence | Project standard. Persist middleware already in useWorkspaceStore. |
| @base-ui/react | (installed) | Collapsible primitive for tree nodes | Already used by shadcn collapsible component. |
| lucide-react | (installed) | Icons: Home, ChevronRight, Plus, Calendar, Target | Project standard icon library. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn checkbox | (to add) | Chores section task completion | `npx shadcn@latest add checkbox` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom tree | @tanstack/react-virtual | Only needed if 100+ projects. Current flat list with collapsible children is sufficient. |
| react-resizable-panels | CSS grid | Lose native collapse/expand API, resize handles, and consistency with existing layout. |

**Installation:**
```bash
npx shadcn@latest add checkbox
```

No other installations needed -- all core dependencies already present.

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    center/
      HubView.tsx            # Top-level hub: 3-column ResizablePanelGroup
    hub/
      GoalsTreePanel.tsx     # Left column: scrollable goals tree
      GoalsTreeNode.tsx      # Individual tree node (project or phase)
      ChoresSection.tsx      # Standalone tasks with checkboxes
      HubCenterPanel.tsx     # Center placeholder (welcome message)
      CalendarPlaceholder.tsx # Right column placeholder
      MinimizedColumn.tsx    # 40px collapsed strip with expand button
    sidebar/
      HomeButton.tsx         # Sidebar home navigation button
  stores/
    uiSlice.ts              # Add activeView state here (existing file)
    useWorkspaceStore.ts    # Add hubLayout persistence here (existing file)
```

### Pattern 1: activeView State Machine
**What:** Replace CenterPanel's cascading if/else with an explicit `activeView` discriminated union
**When to use:** Always -- this is the new routing pattern for CenterPanel
**Example:**
```typescript
// In uiSlice.ts - add to existing UiSlice interface
type ActiveView = 'hub' | 'project' | 'task' | 'theme' | 'workflow';

// activeView defaults to 'hub'
activeView: 'hub' as ActiveView,
setActiveView: (view: ActiveView) => set({ activeView: view }),
navigateToHub: () => set({
  activeView: 'hub',
  // Clear selection state when returning to hub
}),

// In CenterPanel.tsx - replace if/else chain with switch
switch (activeView) {
  case 'hub': return <HubView />;
  case 'project': return <ProjectDetail />;
  case 'task': return <TaskDetail />;
  case 'theme': return <ThemeDetail />;
  case 'workflow': return <WorkflowDetail />;
}
```

### Pattern 2: Nested ResizablePanelGroup
**What:** Hub's 3 columns are a horizontal ResizablePanelGroup nested inside CenterPanel's space
**When to use:** HubView component
**Example:**
```typescript
// react-resizable-panels collapse/expand API
const goalsPanelRef = usePanelRef();
const calendarPanelRef = usePanelRef();

<ResizablePanelGroup direction="horizontal">
  <ResizablePanel
    defaultSize={25}
    minSize={15}
    collapsible
    collapsedSize={0}
    panelRef={goalsPanelRef}
    onCollapse={() => setGoalsCollapsed(true)}
    onExpand={() => setGoalsCollapsed(false)}
  >
    <GoalsTreePanel />
  </ResizablePanel>
  <ResizableHandle />
  <ResizablePanel defaultSize={50} minSize={30}>
    <HubCenterPanel />
  </ResizablePanel>
  <ResizableHandle />
  <ResizablePanel
    defaultSize={25}
    minSize={15}
    collapsible
    collapsedSize={0}
    panelRef={calendarPanelRef}
    onCollapse={() => setCalendarCollapsed(true)}
    onExpand={() => setCalendarCollapsed(false)}
  >
    <CalendarPlaceholder />
  </ResizablePanel>
</ResizablePanelGroup>
```

### Pattern 3: MinimizedColumn Overlay
**What:** When a panel is collapsed (size=0), render a 40px absolute-positioned strip in its place
**When to use:** When `goalsCollapsed` or `calendarCollapsed` is true
**Example:**
```typescript
// Rendered as siblings alongside the ResizablePanelGroup, not inside the panel
{goalsCollapsed && (
  <MinimizedColumn
    label="Goals"
    side="left"
    onExpand={() => goalsPanelRef.current?.expand()}
  />
)}
```

### Pattern 4: Goals Tree Data Loading
**What:** Load phases for all projects on hub mount, not lazily
**When to use:** GoalsTreePanel mount
**Key concern:** `loadPhases(projectId)` replaces the `phases` array each time. For the goals tree, we need phases for ALL projects simultaneously. This requires either:
  - (a) A new batch API: `listAllPhases()` (backend change -- avoid)
  - (b) A local map: fetch per-project and accumulate into `Record<string, Phase[]>`
  - (c) Use the existing `loadPhases` per project but store results in local component state

**Recommendation:** Option (c) -- use local component state via `useEffect` that iterates projects and fetches phases per-project. Store as `Map<string, Phase[]>` in component state. This avoids modifying the global store (where `phases` is single-project scoped) and avoids backend changes.

### Anti-Patterns to Avoid
- **Modifying AppLayout:** D-01 explicitly says hub nests inside CenterPanel. Do not restructure AppLayout.
- **Lazy-loading phases in tree:** Load all project phases on hub mount. Lazy loading per-expand creates jarring UX with loading spinners in the tree.
- **Using global `phases` store for multi-project data:** The phaseSlice.phases array is designed for a single selected project. Overwriting it for goals tree will break ProjectDetail.
- **Persisting activeView:** Do NOT persist activeView in localStorage. D-07 says app always launches to hub. Persisting would restore last view.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resizable columns | Custom drag handlers | react-resizable-panels (installed) | Handles edge cases: min/max, collapse, keyboard, touch |
| Tree expand/collapse | Manual height animation | shadcn Collapsible (@base-ui/react) | Handles animation, ARIA, keyboard, content measurement |
| Checkbox | Custom div with click handler | shadcn Checkbox (to install) | Handles ARIA, indeterminate state, keyboard, focus |
| Scroll container | overflow-auto div | shadcn ScrollArea | Handles custom scrollbar styling, cross-platform consistency |

**Key insight:** Every UI primitive needed is already available as a shadcn component or installed library. The implementation is purely composition and state wiring.

## Common Pitfalls

### Pitfall 1: activeView vs Selection State Desync
**What goes wrong:** User clicks Home to return to hub, but `selectedProjectId` still has a value. CenterPanel switch hits `'hub'` case but other components still react to `selectedProjectId`.
**Why it happens:** Multiple stores track selection state (`selectedProjectId` in main store, `selectedTaskId` in workspace store).
**How to avoid:** The `navigateToHub` action MUST clear: `selectedProjectId`, `selectedTaskId` (both stores), `selectedThemeId`, `selectedWorkflowId`. Conversely, `selectProject()` must set `activeView = 'project'`.
**Warning signs:** Clicking Home shows hub but sidebar still highlights a project. Or clicking a project from hub doesn't show ProjectDetail.

### Pitfall 2: Phases Array Clobbering
**What goes wrong:** Goals tree calls `loadPhases(projectA)` then `loadPhases(projectB)` -- the global `phases` array ends up with only projectB's phases.
**Why it happens:** `phaseSlice.loadPhases` does `set({ phases })` which replaces the entire array.
**How to avoid:** Do NOT use the global `phases` store for the goals tree. Use local component state with per-project fetching via `api.listPhases(projectId)` directly.
**Warning signs:** Tree shows phases for only one project, or ProjectDetail suddenly shows wrong phases.

### Pitfall 3: Zustand Selector Stability in Goals Tree
**What goes wrong:** Goals tree re-renders on every store change because selector returns a new array/object reference.
**Why it happens:** `useStore(s => s.projects.filter(...))` creates a new array on every call.
**How to avoid:** Use stable selectors. Select `projects` directly, then `useMemo` for filtering. Or use `useShallow` from zustand/react/shallow for object selectors.
**Warning signs:** Typing in the center column chat (Phase 24) causes goals tree to flicker.

### Pitfall 4: MinimizedColumn Positioning
**What goes wrong:** The 40px minimized strip overlaps content or disappears when panel collapses to 0.
**Why it happens:** When `collapsedSize={0}`, the panel has no width. The strip must render outside the panel.
**How to avoid:** Render MinimizedColumn as a sibling element (not child of the collapsed panel). Use absolute positioning or conditional flex layout.
**Warning signs:** Minimized strip is invisible, or it pushes center content.

### Pitfall 5: Persist Middleware Hydration Race
**What goes wrong:** Hub layout sizes load from localStorage before the component mounts, causing a flash of default sizes.
**Why it happens:** Zustand persist middleware hydrates asynchronously. First render uses defaults.
**How to avoid:** Use `onRehydrateStorage` callback or check `hasHydrated` before rendering size-dependent layout. Alternatively, accept the brief flash since react-resizable-panels handles it gracefully.
**Warning signs:** Columns briefly flash at 25/50/25 then jump to saved sizes.

## Code Examples

### CenterPanel Switch Pattern
```typescript
// Source: Existing CenterPanel.tsx pattern, refactored per D-05
export function CenterPanel() {
  const activeView = useStore((s) => s.activeView);

  switch (activeView) {
    case 'hub':
      return <HubView />;
    case 'workflow':
      return <div className="h-full overflow-auto p-6"><WorkflowDetail /></div>;
    case 'task':
      return <div className="h-full overflow-auto p-6"><TaskDetail /></div>;
    case 'project':
      return <ProjectCenterContent />; // handles tab bar + detail/files
    case 'theme':
      return <div className="h-full overflow-auto p-6"><ThemeDetail /></div>;
    default:
      return <HubView />;
  }
}
```

### Home Button Pattern
```typescript
// Source: ThemeSidebar.tsx header pattern + D-12
function HomeButton() {
  const activeView = useStore((s) => s.activeView);
  const navigateToHub = useStore((s) => s.navigateToHub);
  const isActive = activeView === 'hub';

  return (
    <button
      type="button"
      onClick={navigateToHub}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        "flex items-center gap-2 w-full px-4 py-2 text-sm font-medium transition-colors",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
    >
      <Home className="size-[18px]" />
      Home
    </button>
  );
}
```

### Progress Dot Pattern
```typescript
// Source: D-09 progress indicators
type ProgressStatus = 'complete' | 'in-progress' | 'not-started';

function ProgressDot({ status }: { status: ProgressStatus }) {
  return (
    <span
      className={cn("inline-block w-2 h-2 rounded-full", {
        "bg-primary": status === "complete",
        "border border-primary bg-transparent": status === "in-progress",
        "border border-muted-foreground/40 bg-transparent": status === "not-started",
      })}
    />
  );
}
```

### Per-Project Phase Fetching (Goals Tree)
```typescript
// Avoid using global phaseSlice -- fetch directly
function useAllProjectPhases(projects: Project[]) {
  const [phaseMap, setPhaseMap] = useState<Map<string, Phase[]>>(new Map());

  useEffect(() => {
    const fetchAll = async () => {
      const entries = await Promise.all(
        projects.map(async (p) => {
          const phases = await api.listPhases(p.id);
          return [p.id, phases] as const;
        })
      );
      setPhaseMap(new Map(entries));
    };
    if (projects.length > 0) fetchAll();
  }, [projects]);

  return phaseMap;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CenterPanel if/else chain | activeView switch statement | Phase 22 | Explicit routing, easier to extend |
| TodayView as default | Hub as default | Phase 22 | New home screen pattern |
| No home navigation | Home button in sidebar | Phase 22 | Always-accessible hub return |

**Deprecated/outdated:**
- TodayView: Being replaced by hub. Can be deleted or left unused (D-06).
- Cascading if/else in CenterPanel: Replace with switch on activeView (D-05).

## Open Questions

1. **Phase progress derivation**
   - What we know: D-09 defines filled/hollow/empty circles. Phases have no explicit status field -- tasks within phases have statuses.
   - What's unclear: How to compute phase status from its tasks. A phase has tasks (fetched via the task store per project). Need to determine: all tasks complete = filled, any task in-progress = hollow, all pending = empty.
   - Recommendation: Derive from task statuses. If the Phase type does not have task data, the progress dots can initially show "not-started" for all phases, and a follow-up can add task-count-based progress. Check if there is a `tasks` array per phase or if tasks reference `phaseId`.

2. **Project progress derivation**
   - What we know: D-09 says project-level progress derives from child phases.
   - What's unclear: Same issue -- phases don't have explicit status.
   - Recommendation: Derive project status from phase statuses. If all phases are complete, project is complete. If any phase has in-progress tasks, project is in-progress.

3. **Batch phase loading performance**
   - What we know: `listPhases(projectId)` makes one Tauri IPC call per project.
   - What's unclear: Performance with many projects (20+).
   - Recommendation: For v1.4, direct per-project calls are fine. If performance becomes an issue, add a `listAllPhases()` backend command later.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | vite.config.ts (vitest configured inline) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HUB-01 | Hub renders 3-column layout as default | unit | `npx vitest run src/components/center/__tests__/HubView.test.tsx -x` | Wave 0 |
| HUB-02 | Columns minimize to sliver, expand with "+" | unit | `npx vitest run src/components/hub/__tests__/MinimizedColumn.test.tsx -x` | Wave 0 |
| HUB-03 | CenterPanel routes via activeView state | unit | `npx vitest run src/components/center/__tests__/CenterPanel.test.tsx -x` | Wave 0 |
| HUB-04 | Right column shows calendar placeholder | unit | `npx vitest run src/components/hub/__tests__/CalendarPlaceholder.test.tsx -x` | Wave 0 |
| GOAL-01 | Collapsible tree with progress indicators | unit | `npx vitest run src/components/hub/__tests__/GoalsTreePanel.test.tsx -x` | Wave 0 |
| GOAL-02 | Click project/phase navigates to detail | unit | `npx vitest run src/components/hub/__tests__/GoalsTreeNode.test.tsx -x` | Wave 0 |
| GOAL-03 | Chores section with checkbox completion | unit | `npx vitest run src/components/hub/__tests__/ChoresSection.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/center/__tests__/HubView.test.tsx` -- covers HUB-01
- [ ] `src/components/center/__tests__/CenterPanel.test.tsx` -- covers HUB-03 (activeView routing)
- [ ] `src/components/hub/__tests__/GoalsTreePanel.test.tsx` -- covers GOAL-01
- [ ] `src/components/hub/__tests__/GoalsTreeNode.test.tsx` -- covers GOAL-02
- [ ] `src/components/hub/__tests__/ChoresSection.test.tsx` -- covers GOAL-03
- [ ] `src/components/hub/__tests__/MinimizedColumn.test.tsx` -- covers HUB-02
- [ ] `src/components/hub/__tests__/CalendarPlaceholder.test.tsx` -- covers HUB-04
- [ ] Checkbox component: `npx shadcn@latest add checkbox`

## Sources

### Primary (HIGH confidence)
- `react-resizable-panels` v4.7.3 type definitions -- collapse/expand/collapsedSize/panelRef API verified from installed package
- `src/components/ui/resizable.tsx` -- shadcn wrapper confirms Group/Panel/Separator mapping
- `src/components/ui/collapsible.tsx` -- confirms @base-ui/react collapsible primitive
- `src/stores/phaseSlice.ts` -- confirms loadPhases(projectId) replaces global phases array
- `src/stores/projectSlice.ts` -- confirms selectProject clears task/theme selection
- `src/stores/useWorkspaceStore.ts` -- confirms persist middleware pattern and partialize config
- `src/components/layout/CenterPanel.tsx` -- confirms cascading if/else to be replaced
- `src/components/layout/AppLayout.tsx` -- confirms ResizablePanelGroup vertical layout
- `22-UI-SPEC.md` -- full visual and interaction contract for this phase

### Secondary (MEDIUM confidence)
- `react-resizable-panels` docs for `onCollapse`/`onExpand` callbacks -- inferred from type definitions, not tested

### Tertiary (LOW confidence)
- Phase progress derivation logic -- no existing implementation to reference; needs design during planning

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries installed and verified
- Architecture: HIGH - patterns derived from existing codebase analysis
- Pitfalls: HIGH - identified from actual code inspection (phaseSlice clobbering, selector stability)
- Validation: MEDIUM - test files need creation, framework confirmed working

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain, no external dependency changes expected)
