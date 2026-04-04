# Phase 18: UI Polish - Research

**Researched:** 2026-03-29
**Domain:** React UI components, Zustand state management, shadcn/base-ui patterns
**Confidence:** HIGH

## Summary

Phase 18 is a pure frontend phase touching 8 existing files with well-defined, scoped changes. Every component to modify already exists, every UI primitive needed (Accordion, Collapsible, Tooltip) is already installed, and the state management pattern (Zustand with persist middleware) is established. No new dependencies are required.

The changes decompose cleanly into independent workstreams: (1) sidebar click behavior fix, (2) theme collapse persistence, (3) task detail accordion simplification, (4) AI button state machine + layout merge with DirectoryLink, and (5) drawer tab reorder/default. The state machine for AI button labels is the most logic-dense change, requiring a `getAiButtonState()` derivation function that maps project properties to one of 6 states.

**Primary recommendation:** Implement as 4-5 small, independently testable plans -- each touching 1-3 files. Use existing shadcn Accordion for task detail collapse sections. Derive AI button state via a pure function that can be unit-tested without rendering.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single-clicking a project name in the sidebar navigates to ProjectDetail in the center panel. No menu or dialog should block this.
- **D-02:** The chevron (caret) independently expands/collapses inline task list -- separate from navigation. Clicking the chevron does NOT navigate.
- **D-03:** Right-click context menu retained for project actions (Move to Theme, Delete). Left-click always navigates.
- **D-04:** Keep chevron indicators (ChevronRight/ChevronDown) -- no change to +/- style. The requirement "UI-02 +/- click toggle" is satisfied by the existing chevron toggle mechanism.
- **D-05:** Theme expand/collapse state persisted per theme across sessions. Store in the workspace store with persistence (similar to existing per-project workspace state pattern).
- **D-06:** Immediately visible: title (editable), status dropdown, priority dropdown, description (textarea). These are the primary fields.
- **D-07:** Collapsed by default into accordion sections: Context, Tags, Scheduling, Execution History. Each group has a collapsible header -- click to expand. Similar to GitHub issue sidebar pattern.
- **D-08:** Single row layout: AI button on the left, directory path + Link/Change on the right, same horizontal line. Remove the separate "Directory" section.
- **D-09:** AI button state machine labels:
  - No directory linked -> "Link Directory" label, button disabled with tooltip "Link a directory first". DirectoryLink control is the primary CTA.
  - No planning tier set (but has directory) -> "Plan Project"
  - Has plan/content -> "Check Progress"
  - Executing -> "Open AI" with spinner
  - Complete -> "Open AI"
  - Fallback -> "Open AI"
- **D-10:** When no directory is linked, the AI button is visible but disabled/greyed out with a tooltip. It is NOT hidden.
- **D-11:** Change `DEFAULT_PROJECT_STATE.drawerTab` from `"logs"` to `"terminal"` so the terminal tab is first and selected by default when opening the drawer.
- **D-12:** Reorder drawer tabs to: Terminal, Logs, History (Terminal first).

### Claude's Discretion
- Implementation details for accordion component (use existing shadcn Accordion or build custom collapsible sections)
- Exact spacing/sizing in the AI button + directory row
- How to determine "has plan/content" vs "executing" vs "complete" states from existing project data

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Clicking a project in the sidebar opens the project directly (no context menu gate) | D-01/D-02/D-03: ProjectRow already has separate chevron + select handlers; just need to remove DropdownMenu wrapping the project name click |
| UI-02 | Sidebar sections have +/- click toggle for expand/collapse (no slider) | D-04: Already implemented via ChevronRight/ChevronDown; D-05 adds persistence via workspace store |
| UI-03 | Task detail view is simplified -- less visual clutter, cleaner layout | D-06/D-07: Primary fields visible, secondary fields in Accordion sections using existing shadcn Accordion |
| UI-04 | "Link Directory" control appears on the same line as the AI button | D-08: Merge OpenAiButton + DirectoryLink into single row in ProjectDetail.tsx |
| UI-05 | AI button label changes based on project state | D-09: State machine derivation function mapping project properties to label/disabled state |
| UI-06 | Terminal tab is first and selected by default in the output drawer | D-11/D-12: Change DEFAULT_PROJECT_STATE.drawerTab and reorder DrawerHeader tab buttons |
| UI-07 | Smart AI button state machine covers: no directory, no tier, planning, executing, complete states | D-09/D-10: 6-state machine with tooltip for disabled state |
</phase_requirements>

## Standard Stack

### Core (already installed -- no additions needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.4 | UI framework | Project standard |
| Zustand | ^5.0.11 | State management | Project standard, persist middleware already in use |
| @base-ui/react | ^1.3.0 | Headless UI primitives | Project's shadcn primitive layer (NOT Radix) |
| Tailwind CSS | (via @tailwindcss/vite) | Styling | Project standard |
| Lucide React | (installed) | Icons | Project standard |
| sonner | ^2.0.7 | Toast notifications | Project standard |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Accordion | installed | Collapsible sections in TaskDetail | D-07: secondary field groups |
| shadcn/ui Tooltip | installed | Disabled AI button hint | D-10: "Link a directory first" tooltip |
| shadcn/ui Collapsible | installed | Alternative to Accordion (simpler) | If individual collapse without group behavior is preferred |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Accordion (for TaskDetail) | Manual Collapsible per section | Accordion enforces consistent open/close behavior and animation; Collapsible gives more per-section control. Accordion is better fit for D-07's "GitHub issue sidebar" pattern. |

**Installation:** No new packages needed.

## Architecture Patterns

### Component Change Map
```
src/
├── components/
│   ├── sidebar/
│   │   ├── ThemeSection.tsx      # Remove DropdownMenu from left-click path (D-01/D-03)
│   │   └── ThemeHeader.tsx       # No changes needed (already has chevron toggle)
│   ├── center/
│   │   ├── OpenAiButton.tsx      # Add state machine for labels (D-09/D-10)
│   │   ├── DirectoryLink.tsx     # No API changes needed
│   │   ├── ProjectDetail.tsx     # Merge AI button + directory into single row (D-08)
│   │   └── TaskDetail.tsx        # Accordion sections for secondary fields (D-06/D-07)
│   └── output/
│       └── DrawerHeader.tsx      # Reorder tabs: Terminal, Logs, History (D-12)
└── stores/
    └── useWorkspaceStore.ts      # Change default drawer tab (D-11), add theme collapse persistence (D-05)
```

### Pattern 1: AI Button State Machine (Pure Function)
**What:** Extract button state derivation into a testable pure function.
**When to use:** D-09/D-10 -- AI button label and disabled state depend on multiple project properties.
**Example:**
```typescript
// Source: Derived from CONTEXT.md D-09
type AiButtonState =
  | { label: "Link Directory"; disabled: true; tooltip: "Link a directory first" }
  | { label: "Plan Project"; disabled: false }
  | { label: "Check Progress"; disabled: false }
  | { label: "Open AI"; disabled: false; showSpinner?: boolean }

export function getAiButtonState(project: {
  directoryPath: string | null;
  planningTier: string | null;
  hasContent: boolean;
  isExecuting?: boolean;
}): AiButtonState {
  if (!project.directoryPath) {
    return { label: "Link Directory", disabled: true, tooltip: "Link a directory first" };
  }
  if (!project.planningTier && !project.hasContent) {
    return { label: "Plan Project", disabled: false };
  }
  if (project.isExecuting) {
    return { label: "Open AI", disabled: false, showSpinner: true };
  }
  if (project.hasContent) {
    return { label: "Check Progress", disabled: false };
  }
  return { label: "Open AI", disabled: false };
}
```

### Pattern 2: Sidebar Click Separation (context menu only on right-click)
**What:** Remove DropdownMenu wrapping from the project name button. Use `onContextMenu` to open the menu programmatically instead.
**When to use:** D-01/D-03 -- left-click navigates, right-click opens context menu.
**Example:**
```typescript
// Current: DropdownMenuTrigger wraps the project name button with render prop
// The existing code already handles this -- onClick calls onSelect(), onContextMenu opens menu
// The issue is DropdownMenu open/onOpenChange might intercept left clicks
// Fix: Ensure DropdownMenu only opens via the menuOpen state, never from left-click
// The current code at line 150-167 already does this correctly via:
//   onClick -> e.preventDefault(); onSelect()
//   onContextMenu -> e.preventDefault(); setMenuOpen(true)
// Verify: Does the DropdownMenuTrigger's render prop correctly suppress default open behavior?
// base-ui Menu.Trigger with render prop: the render prop replaces the default trigger element
// but the Menu.Root open/onOpenChange controls visibility
```

### Pattern 3: Theme Collapse Persistence
**What:** Add a `themeCollapseState` map to useWorkspaceStore, persisted via the existing persist middleware.
**When to use:** D-05 -- theme expand/collapse state survives sessions.
**Example:**
```typescript
// In useWorkspaceStore.ts
interface WorkspaceState {
  // ... existing
  themeCollapseState: Record<string, boolean>; // themeId -> expanded
  setThemeExpanded: (themeId: string, expanded: boolean) => void;
  isThemeExpanded: (themeId: string) => boolean;
}

// In partialize (add to persisted fields):
partialize: (state) => ({
  ...existingFields,
  themeCollapseState: state.themeCollapseState,
})
```

### Pattern 4: Accordion for Task Detail Secondary Fields
**What:** Group Context, Tags, Scheduling, Execution History into Accordion sections.
**When to use:** D-07 -- reduce visual clutter by collapsing secondary fields.
**Example:**
```typescript
// Source: Existing shadcn Accordion component (base-ui backed)
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// In TaskDetail.tsx, after primary fields (title, status, priority, description):
<Accordion>
  <AccordionItem value="context">
    <AccordionTrigger>Context</AccordionTrigger>
    <AccordionContent>
      <Textarea value={context} onChange={...} />
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="tags">
    <AccordionTrigger>Tags</AccordionTrigger>
    <AccordionContent>
      {/* existing tag badges + input */}
    </AccordionContent>
  </AccordionItem>
  {/* ... scheduling, execution history */}
</Accordion>
```

### Anti-Patterns to Avoid
- **Deriving button state inline in JSX:** Creates untestable, hard-to-read conditional chains. Extract to a pure function.
- **Using useState for theme collapse when persistence is needed:** Must use Zustand store with persist middleware, not component-level useState (which resets on unmount).
- **Wrapping navigation in DropdownMenuTrigger:** The current pattern uses base-ui's `render` prop on DropdownMenuTrigger to provide a custom element. Ensure the Menu.Root's `open` prop is controlled and only set by `onContextMenu`, never by left-click.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible sections | Custom slide/toggle animation | shadcn Accordion (already installed, has data-open/data-closed animations) | Animation timing, accessibility (aria-expanded), keyboard nav all handled |
| Tooltip on disabled button | Title attribute | shadcn Tooltip (base-ui backed) | Proper positioning, delay, arrow, accessibility |
| Persisted UI state | localStorage directly | Zustand persist middleware (already configured) | Consistent with existing pattern, handles serialization/deserialization |

**Key insight:** Every UI primitive this phase needs is already installed and in use elsewhere in the codebase. Zero new dependencies.

## Common Pitfalls

### Pitfall 1: DropdownMenu Intercepting Left Clicks
**What goes wrong:** base-ui's `Menu.Trigger` may capture click events even when using the `render` prop, causing the menu to flash open on left-click before the custom onClick handler fires.
**Why it happens:** The base-ui Menu.Trigger adds its own click handler by default. The `render` prop replaces the element but not all event bindings.
**How to avoid:** Use controlled `open` prop on `DropdownMenu` (already done via `menuOpen` state). Ensure `e.preventDefault()` in the onClick is sufficient. Test manually -- if the menu still flashes, consider moving the DropdownMenu outside the clickable row and triggering it only from onContextMenu without using DropdownMenuTrigger at all (use a hidden Trigger or Portal-based approach).
**Warning signs:** Menu briefly appearing/disappearing on left click in the sidebar.

### Pitfall 2: Persisted State Shape Migration
**What goes wrong:** Adding `themeCollapseState` to the persisted Zustand store may cause issues for existing users whose localStorage has the old shape.
**Why it happens:** Zustand persist doesn't auto-merge new fields into existing persisted state.
**How to avoid:** Zustand persist's `merge` strategy handles this -- new fields get their default values when not present in storage. Verify that `themeCollapseState` has a sensible default (empty object `{}` means all themes expanded by default, which matches current behavior).
**Warning signs:** Themes appearing collapsed when they shouldn't be after the update.

### Pitfall 3: Tooltip on Disabled Button
**What goes wrong:** Native HTML disabled buttons don't fire mouse events, so Tooltip won't show on hover.
**Why it happens:** `disabled` attribute suppresses pointer events.
**How to avoid:** Use `aria-disabled="true"` + `pointer-events: auto` styling instead of the native `disabled` attribute. Or wrap the button in a `<span>` that receives the tooltip trigger. base-ui Tooltip works with `aria-disabled` pattern.
**Warning signs:** Tooltip never appears when hovering the disabled AI button.

### Pitfall 4: DEFAULT_PROJECT_STATE Change Not Affecting Existing Sessions
**What goes wrong:** Changing `DEFAULT_PROJECT_STATE.drawerTab` from `"logs"` to `"terminal"` only affects NEW project workspace states. Existing entries in `projectStates` map keep the old value.
**Why it happens:** `projectStates` is session-only (not persisted), so this is only an issue within a single session if the user opened a project before the code update.
**How to avoid:** This is actually fine -- `projectStates` resets on app restart because it's excluded from `partialize`. The default change will take effect on next launch. Additionally, the global `activeDrawerTab` default should also change from `"logs"` to `"terminal"`.
**Warning signs:** None expected -- session-only state resets naturally.

### Pitfall 5: Accordion Styling Conflict with Existing Task Detail Layout
**What goes wrong:** The shadcn Accordion has default border-bottom styling (`not-last:border-b`) and padding that may clash with the existing `space-y-6` layout in TaskDetail.
**Why it happens:** Accordion was designed for standalone use; embedding it mid-form needs style adjustments.
**How to avoid:** Override Accordion's `className` prop to remove default borders/padding. Use the component's existing Tailwind-based customization points.
**Warning signs:** Extra borders, double spacing, or misaligned sections in the task detail view.

### Pitfall 6: OpenAiButton Test Expectations Breaking
**What goes wrong:** Existing tests in `OpenAiButton.test.tsx` find the button by `name: /open ai/i`. When the label changes to "Plan Project" or "Check Progress", these tests break.
**Why it happens:** Test selectors are coupled to the static label text.
**How to avoid:** Update existing tests to account for dynamic labels. Add new test cases for each state. Use `getByRole("button")` with the appropriate name for each state being tested.
**Warning signs:** Test failures in existing OpenAiButton.test.tsx after label changes.

## Code Examples

### AI Button + DirectoryLink Single Row Layout (D-08)
```typescript
// In ProjectDetail.tsx, replace the separate OpenAiButton and Directory sections:
{/* AI Button + Directory - Single Row */}
<div className="flex items-center gap-3">
  <OpenAiButton
    projectId={project.id}
    directoryPath={project.directoryPath}
    planningTier={project.planningTier}
    hasContent={hasContent}
    onTierDialogOpen={handleTierDialogOpen}
  />
  <div className="flex-1" />
  <DirectoryLink
    directoryPath={project.directoryPath}
    onLink={(path) => linkDirectory(project.id, path)}
  />
</div>
```

### Drawer Tab Reorder (D-12)
```typescript
// In DrawerHeader.tsx, change the tab button order:
<div className="flex items-center gap-1">
  <button type="button" onClick={() => onTabChange("terminal")} className={tabClass("terminal")}>
    Terminal
  </button>
  <button type="button" onClick={() => onTabChange("logs")} className={tabClass("logs")}>
    Logs
  </button>
  <button type="button" onClick={() => onTabChange("history")} className={tabClass("history")}>
    History
  </button>
</div>
```

### Theme Collapse State in Workspace Store (D-05)
```typescript
// Add to useWorkspaceStore state:
themeCollapseState: {} as Record<string, boolean>,
setThemeExpanded: (themeId: string, expanded: boolean) => {
  set((s) => ({
    themeCollapseState: { ...s.themeCollapseState, [themeId]: expanded },
  }));
},
isThemeExpanded: (themeId: string) => {
  const state = get().themeCollapseState[themeId];
  return state === undefined ? true : state; // default expanded
},

// Add to partialize:
themeCollapseState: state.themeCollapseState,
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radix UI primitives | base-ui/react primitives | Project migration pre-v1.3 | All UI primitives use `@base-ui/react`, NOT `@radix-ui`. Import from `@base-ui/react/*` |
| shadcn/Radix Accordion | shadcn/base-ui Accordion | Same migration | `Accordion` component wraps `@base-ui/react/accordion`, uses `data-open`/`data-closed` instead of Radix `data-state` |

**Important note:** This project uses the **base-ui** variant of shadcn/ui components, not the Radix variant. All primitives import from `@base-ui/react/*`. The Accordion, Tooltip, and Collapsible components are already installed and follow base-ui patterns (e.g., `AccordionPrimitive.Root.Props` not `Radix.AccordionRootProps`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 + @testing-library/react ^16.3.2 |
| Config file | `vite.config.ts` (test section) + `src/__tests__/setup.ts` |
| Quick run command | `vitest run --reporter=verbose` |
| Full suite command | `vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Single-click project navigates to ProjectDetail | unit | `vitest run src/components/sidebar/ThemeSidebar.test.tsx -t "project click"` | Partial (ThemeSidebar.test.tsx exists, needs new cases) |
| UI-02 | Theme chevron toggles expand/collapse with persistence | unit | `vitest run src/stores/useWorkspaceStore.test.ts -t "theme collapse"` | Partial (store test exists, needs theme collapse cases) |
| UI-03 | Task detail shows primary fields, collapses secondary | unit | `vitest run src/components/center/TaskDetail.test.tsx` | Stub only (all tests are .todo) |
| UI-04 | DirectoryLink on same line as AI button | unit | `vitest run src/components/center/__tests__/ProjectDetail.test.tsx` | Exists |
| UI-05 | AI button label matches project state | unit | `vitest run src/components/center/OpenAiButton.test.tsx` | Exists (needs label state cases) |
| UI-06 | Terminal tab is default in drawer | unit | `vitest run src/stores/useWorkspaceStore.test.ts -t "default"` | Exists (needs default tab assertion update) |
| UI-07 | AI button state machine covers all states | unit | `vitest run src/components/center/OpenAiButton.test.tsx -t "state machine"` | Needs new test block |

### Sampling Rate
- **Per task commit:** `vitest run --reporter=verbose`
- **Per wave merge:** `vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/center/OpenAiButton.test.tsx` -- needs new test cases for state machine labels (UI-05, UI-07)
- [ ] `src/stores/useWorkspaceStore.test.ts` -- needs theme collapse persistence tests (UI-02), drawer tab default test update (UI-06)
- [ ] `src/components/center/TaskDetail.test.tsx` -- all tests are `.todo` stubs, need real implementations for accordion layout (UI-03)
- [ ] Pure function `getAiButtonState()` should have its own unit tests independent of component rendering

## Sources

### Primary (HIGH confidence)
- Direct source code reading of all 8 target files (ThemeSection.tsx, ThemeHeader.tsx, OpenAiButton.tsx, DirectoryLink.tsx, ProjectDetail.tsx, TaskDetail.tsx, DrawerHeader.tsx, useWorkspaceStore.ts)
- Direct reading of installed shadcn components (accordion.tsx, collapsible.tsx, tooltip.tsx, dropdown-menu.tsx)
- package.json dependency versions verified directly

### Secondary (MEDIUM confidence)
- base-ui/react Menu.Trigger `render` prop behavior -- inferred from code pattern in ThemeSection.tsx line 150-167 which already uses it successfully

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already installed, versions verified from package.json
- Architecture: HIGH -- all target files read, patterns directly observed in codebase
- Pitfalls: HIGH -- identified from actual code patterns (DropdownMenu render prop, Zustand persist partialize, disabled button events)

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable -- no external dependency changes expected)
