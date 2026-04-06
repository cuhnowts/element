# Phase 32: Hub Layout Overhaul - Research

**Researched:** 2026-04-04
**Domain:** React UI layout -- overlay panels, CSS transforms, Zustand state, Tailwind CSS
**Confidence:** HIGH

## Summary

Phase 32 replaces the current 3-column `react-resizable-panels` layout in `HubView.tsx` with a single full-width center view and two overlay slide-in panels (Calendar from left, Goals from right). The center view becomes a command hub with greeting, day pulse, action buttons, and chat output.

The existing codebase already has all the content components needed (`GoalsTreePanel`, `HubCalendar`, `HubChat`, `BriefingGreeting`). The work is purely structural: rip out the `ResizablePanelGroup` + `MinimizedColumn` pattern, build a new overlay panel component using CSS transforms (no animation library -- explicitly out of scope per REQUIREMENTS.md), add a toolbar with toggle buttons, and compose the new center view layout.

**Primary recommendation:** Build a single reusable `SlideOverPanel` component using CSS `translate-x` transforms and Tailwind utility classes. Do NOT use shadcn Sheet -- it uses Radix Dialog under the hood which traps focus and creates a backdrop, conflicting with the requirement that panels float over content without dismissing on click-outside (D-06). Use simple Zustand boolean state (`calendarOpen`, `goalsOpen`) with NO persistence (D-10).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Top toggle bar at the top of HubView (below app title bar) with two buttons: Calendar and Goals. No Briefing button -- briefing is triggered from the center action buttons.
- **D-02:** Toggle buttons use filled/accent background when active, ghost/outline when inactive. Multiple can be active simultaneously.
- **D-03:** Panels are overlays that float on top of center content with shadow. Center view stays full-width underneath -- no reflow or compression.
- **D-04:** Calendar panel slides in from the left edge. Goals panel slides in from the right edge.
- **D-05:** Both panels can be open simultaneously (Calendar left + Goals right).
- **D-06:** Panels are dismissed only via the toolbar toggle button -- clicking in the center area does not close them.
- **D-07:** Animations use CSS transforms per HUB-05 requirement.
- **D-08:** Center view is a command hub. Structure: (1) Greeting + day pulse, (2) Action buttons, (3) Chat output area, (4) Jump-to-top button.
- **D-09:** The briefing toolbar button from HUB-04 is replaced by the "Run Daily Briefing" action button in the center view.
- **D-10:** Panels always start closed on hub load. No persistence of open/closed state across sessions.

### Claude's Discretion
- Panel overlay width (reasonable default, likely ~300-350px)
- Exact CSS transform animation duration and easing
- Shadow/backdrop styling for overlay panels
- Greeting text source and day pulse generation approach
- Action button visual styling (cards, pills, etc.)
- Jump-to-top button placement and style

### Deferred Ideas (OUT OF SCOPE)
- Full skill wiring for action buttons (Run Briefing, Organize Calendar, Organize Goals to real backend commands)
- Dynamic action button registry (user-configurable commands)
- Day pulse generation from real project data
- Greeting personalization
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HUB-01 | User sees a single full-width center view when opening the hub (no horizontal scroll) | Remove ResizablePanelGroup, replace with single full-width div. Center view is always 100% width. |
| HUB-02 | User can toggle a goals slide-in panel from the hub toolbar | SlideOverPanel component + toolbar toggle button. GoalsTreePanel content reused as-is. |
| HUB-03 | User can toggle a calendar slide-in panel from the hub toolbar | SlideOverPanel component + toolbar toggle button. HubCalendar content reused as-is. |
| HUB-04 | User can toggle a briefing slide-in panel from the hub toolbar | Satisfied by D-09: "Run Daily Briefing" action button in center view, not a toolbar slide-in. |
| HUB-05 | Slide-in panels animate smoothly using CSS transforms (no layout jank) | CSS translate-x with Tailwind transition utilities. No JS animation library. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | Component framework | Already installed |
| Zustand | 5.0.11 | Toggle state (calendarOpen/goalsOpen) | Already used for workspace state |
| Tailwind CSS | 4.2.1 | Utility classes for transforms, transitions, shadows | Already the project's styling system |
| shadcn/ui Button | N/A | Toggle buttons in toolbar | Already used throughout project |
| lucide-react | 0.577.0 | Icons for toolbar buttons (CalendarDays, Target, etc.) | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom SlideOverPanel | shadcn Sheet | Sheet uses Radix Dialog -- focus trap conflicts with chat input, backdrop dismissal conflicts with D-06. Custom is simpler and correct. |
| CSS transforms | framer-motion | Explicitly out of scope per REQUIREMENTS.md. CSS transforms are sufficient. |
| Local useState | Zustand store | useState is fine for non-persisted panel state, but Zustand keeps it accessible if toolbar is a sibling component. Zustand is the project pattern. |

## Architecture Patterns

### Recommended Project Structure
```
src/components/center/HubView.tsx          # REWRITE: new overlay layout
src/components/hub/SlideOverPanel.tsx       # NEW: reusable slide-in overlay
src/components/hub/HubToolbar.tsx           # NEW: top toggle bar
src/components/hub/CommandHub.tsx           # NEW: center view composition
src/components/hub/ActionButtons.tsx        # NEW: skill-trigger buttons (placeholder)
src/components/hub/DayPulse.tsx             # NEW: brief day summary line
src/components/hub/JumpToTop.tsx            # NEW: scroll-to-top FAB
src/components/hub/HubCenterPanel.tsx       # REMOVE: replaced by CommandHub
src/components/hub/MinimizedColumn.tsx      # REMOVE: no longer used
src/stores/useWorkspaceStore.ts             # UPDATE: simplify HubLayout interface
```

### Pattern 1: SlideOverPanel Component
**What:** A reusable overlay panel that slides in from either edge using CSS transforms
**When to use:** For both Calendar (left) and Goals (right) overlays
**Example:**
```tsx
// SlideOverPanel.tsx
interface SlideOverPanelProps {
  open: boolean;
  side: "left" | "right";
  children: React.ReactNode;
}

export function SlideOverPanel({ open, side, children }: SlideOverPanelProps) {
  const positionClasses = side === "left"
    ? "left-0 top-0 bottom-0"
    : "right-0 top-0 bottom-0";

  const transformClass = open
    ? "translate-x-0"
    : side === "left"
      ? "-translate-x-full"
      : "translate-x-full";

  return (
    <div
      className={`
        absolute ${positionClasses} w-[340px] z-30
        bg-card border-r border-border shadow-lg
        transition-transform duration-200 ease-out
        ${transformClass}
      `}
    >
      {children}
    </div>
  );
}
```

### Pattern 2: HubView Composition (New)
**What:** The new HubView wraps center content with positioned overlay panels
**Example:**
```tsx
export function HubView() {
  const calendarOpen = useWorkspaceStore((s) => s.hubCalendarOpen);
  const goalsOpen = useWorkspaceStore((s) => s.hubGoalsOpen);

  return (
    <div className="relative h-full overflow-hidden">
      {/* Toolbar */}
      <HubToolbar />

      {/* Center content -- always full width */}
      <div className="h-full overflow-auto">
        <CommandHub />
      </div>

      {/* Overlay panels */}
      <SlideOverPanel open={calendarOpen} side="left">
        <HubCalendar />
      </SlideOverPanel>
      <SlideOverPanel open={goalsOpen} side="right">
        <GoalsTreePanel />
      </SlideOverPanel>
    </div>
  );
}
```

### Pattern 3: Toggle Button Active State
**What:** Toggle buttons switch between filled (active) and ghost (inactive) variants
**Example:**
```tsx
<Button
  variant={calendarOpen ? "default" : "ghost"}
  size="sm"
  onClick={toggleCalendar}
>
  <CalendarDays className="mr-1.5 h-4 w-4" />
  Calendar
</Button>
```

### Pattern 4: CommandHub Center View
**What:** Vertical stack: greeting + day pulse, action buttons, chat output, jump-to-top
**Example:**
```tsx
export function CommandHub() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div ref={scrollRef} className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Greeting + day pulse */}
        <BriefingGreeting />
        <DayPulse />

        {/* Action buttons */}
        <ActionButtons />

        {/* Chat output */}
        <div className="mt-8">
          <HubChat />
        </div>
      </div>

      {/* Jump to top */}
      <JumpToTop onClick={scrollToTop} />
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Using shadcn Sheet for overlay panels:** Sheet wraps Radix Dialog which traps focus and adds a backdrop overlay. This breaks D-06 (no dismiss on center click) and interferes with the chat input in the center view.
- **Conditionally rendering panels (mount/unmount):** Mount both panels always. Toggle visibility with CSS transforms. This preserves scroll position and internal state (calendar date, etc.) when toggling.
- **Persisting panel open/closed state:** D-10 explicitly says no persistence. Do not add these booleans to the `partialize` function in `useWorkspaceStore`.
- **Returning new objects from Zustand selectors:** Per project memory, never return new object/array refs from selectors. Use individual boolean selectors like `(s) => s.hubCalendarOpen`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide animation | JS animation loop or requestAnimationFrame | CSS `transition-transform` + Tailwind classes | Hardware-accelerated, no layout jank, zero JS overhead |
| Toggle state management | Custom context/reducer | Zustand booleans in useWorkspaceStore | Consistent with project patterns, already persisted store |
| Overlay shadow styling | Custom box-shadow values | Tailwind `shadow-lg` or `shadow-xl` | Consistent with design system |
| Scroll-to-top detection | Manual scroll event listener | IntersectionObserver on a sentinel element | Performant, no scroll event thrashing |

## Common Pitfalls

### Pitfall 1: Focus Trap with shadcn Sheet
**What goes wrong:** Using shadcn Sheet (Radix Dialog) for overlay panels traps focus inside the panel, making the chat input in the center view unreachable.
**Why it happens:** Radix Dialog is designed as a modal -- it assumes exclusive focus.
**How to avoid:** Build a simple `SlideOverPanel` with plain positioned divs. No dialog, no focus trap.
**Warning signs:** Tab key cycles within panel instead of reaching chat input.

### Pitfall 2: Layout Reflow on Panel Open
**What goes wrong:** Opening a panel pushes center content, causing visible jank.
**Why it happens:** Using flexbox or grid to give panels space instead of absolute positioning.
**How to avoid:** Panels must be `position: absolute` overlays. Center content stays full-width underneath.
**Warning signs:** Center content width changes when panels open/close.

### Pitfall 3: Zustand Selector Stability
**What goes wrong:** Components re-render unnecessarily, causing animation stutter.
**Why it happens:** Selectors return new object references on each call.
**How to avoid:** Select individual primitives: `(s) => s.hubCalendarOpen`, not `(s) => ({ calendarOpen: s.hubCalendarOpen, goalsOpen: s.hubGoalsOpen })`.
**Warning signs:** React DevTools shows unnecessary re-renders in HubView.

### Pitfall 4: Panel Content Remounting
**What goes wrong:** Calendar loses selected date, goals tree collapses when panel is toggled.
**Why it happens:** Conditionally rendering panel content with `{open && <HubCalendar />}`.
**How to avoid:** Always render both panels. Use CSS transforms to move them offscreen when closed. Content stays mounted.
**Warning signs:** Panel state resets every time it opens.

### Pitfall 5: Stale HubLayout in Persisted Store
**What goes wrong:** Old persisted `hubLayout` with `goalsPanelSize`, `centerPanelSize`, `calendarPanelSize` fields causes hydration issues after refactor.
**Why it happens:** Zustand persist rehydrates old shape that no longer matches the interface.
**How to avoid:** Either (a) add a version migration in the persist config, or (b) keep the old fields and just stop using them (simpler), or (c) update the interface and handle missing fields with defaults in `merge`.
**Warning signs:** Console errors on app load about undefined properties.

### Pitfall 6: Overflow Hidden Clipping
**What goes wrong:** Panels are clipped and invisible when `overflow-hidden` is on the wrong container.
**Why it happens:** The parent `relative` container needs `overflow-hidden` to prevent panels from extending outside the hub area, but applying it to the wrong element clips the center scroll.
**How to avoid:** Apply `overflow-hidden` to the outermost hub wrapper (for panel clipping), but `overflow-auto` to the center content scroll container inside it.
**Warning signs:** Panels slide in but are invisible or partially cut off.

## Code Examples

### HubLayout Interface Update
```typescript
// useWorkspaceStore.ts -- simplified HubLayout
export interface HubLayout {
  // Legacy fields kept for backwards compat (no longer used)
  goalsPanelSize: number;
  centerPanelSize: number;
  calendarPanelSize: number;
  goalsCollapsed: boolean;
  calendarCollapsed: boolean;
}

// NEW: session-only state (not in HubLayout, not persisted)
// Add to WorkspaceState directly:
//   hubCalendarOpen: boolean;  // default false
//   hubGoalsOpen: boolean;     // default false
//   toggleHubCalendar: () => void;
//   toggleHubGoals: () => void;
```

### Jump-to-Top with IntersectionObserver
```tsx
function JumpToTop({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement> }) {
  const [show, setShow] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel at top of scroll area */}
      <div ref={sentinelRef} className="h-0" />
      {show && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-20 right-6 z-40 rounded-full bg-primary p-2 shadow-lg"
          aria-label="Jump to top"
        >
          <ArrowUp className="h-4 w-4 text-primary-foreground" />
        </button>
      )}
    </>
  );
}
```

### Action Buttons (Placeholder)
```tsx
const ACTIONS = [
  { label: "Run Daily Briefing", icon: Sparkles, id: "briefing" },
  { label: "Organize Calendar", icon: CalendarDays, id: "calendar" },
  { label: "Organize Goals", icon: Target, id: "goals" },
] as const;

export function ActionButtons() {
  const handleAction = (id: string) => {
    // Phase 32: placeholder -- future milestone wires to real commands
    console.log(`Action triggered: ${id}`);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-6">
      {ACTIONS.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          onClick={() => handleAction(action.id)}
        >
          <action.icon className="mr-1.5 h-4 w-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3-column ResizablePanelGroup | Single center view + overlay panels | Phase 32 | Eliminates horizontal scroll, simplifies layout |
| MinimizedColumn ribbons | Toolbar toggle buttons | Phase 32 | Cleaner UI, consistent toggle pattern |
| BriefingPanel as dedicated column | Greeting + DayPulse inline in center | Phase 32 | Briefing content moves to Phase 33 action button |
| Persisted panel sizes/collapsed state | Session-only boolean toggles | Phase 32 | Simpler state, always-clean start |

## Open Questions

1. **Day pulse content source**
   - What we know: D-08 says "brief summary of the day (busy/light, things needing attention -- a pulse, not details)". Deferred items say real data generation is future scope.
   - What's unclear: Should the placeholder day pulse be a static string, or should it attempt to read from existing briefing data?
   - Recommendation: Use a static placeholder like "Your day at a glance" with a note that Phase 33 / future milestone will wire real data. Keeps Phase 32 focused on layout.

2. **Panel width responsive behavior**
   - What we know: Discretion area says ~300-350px.
   - What's unclear: Should panels have a max-width or respond to very narrow screens?
   - Recommendation: Fixed 340px width. On screens narrower than ~768px both panels would overlap, but this is a desktop app (Tauri) so minimum window size is controlled. Not a concern for Phase 32.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | vite.config.ts (test block) |
| Quick run command | `npx vitest run src/components/center/__tests__/HubView.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HUB-01 | Full-width center view, no ResizablePanelGroup | unit | `npx vitest run src/components/center/__tests__/HubView.test.tsx -t "full-width"` | Exists but all tests are .todo |
| HUB-02 | Goals toggle button opens/closes right overlay | unit | `npx vitest run src/components/center/__tests__/HubView.test.tsx -t "goals panel"` | Needs new tests |
| HUB-03 | Calendar toggle button opens/closes left overlay | unit | `npx vitest run src/components/center/__tests__/HubView.test.tsx -t "calendar panel"` | Needs new tests |
| HUB-04 | Briefing accessible via action button in center | unit | `npx vitest run src/components/hub/__tests__/ActionButtons.test.tsx` | Does not exist |
| HUB-05 | CSS transform animation classes present | unit | `npx vitest run src/components/hub/__tests__/SlideOverPanel.test.tsx -t "transform"` | Does not exist |

### Sampling Rate
- **Per task commit:** `npx vitest run src/components/center/__tests__/HubView.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/center/__tests__/HubView.test.tsx` -- replace .todo tests with real assertions for new layout
- [ ] `src/components/hub/__tests__/SlideOverPanel.test.tsx` -- covers HUB-05 (CSS transform classes)
- [ ] `src/components/hub/__tests__/HubToolbar.test.tsx` -- covers HUB-02, HUB-03 toggle behavior
- [ ] `src/components/hub/__tests__/ActionButtons.test.tsx` -- covers HUB-04

## Sources

### Primary (HIGH confidence)
- Project source code: `src/components/center/HubView.tsx`, `src/stores/useWorkspaceStore.ts`, all hub components -- direct inspection of current implementation
- CONTEXT.md decisions D-01 through D-10 -- locked user decisions
- REQUIREMENTS.md -- HUB-01 through HUB-05 acceptance criteria
- REQUIREMENTS.md Out of Scope table -- "Animation framework (framer-motion): CSS transforms + tw-animate-css sufficient"

### Secondary (MEDIUM confidence)
- STATE.md blocker note: "shadcn Sheet vs custom SlidePanel needs a spike -- focus-trap may conflict with hub chat input" -- confirmed by research: Sheet uses Radix Dialog, focus trap is the issue, custom panel is the correct approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- overlay panel pattern is straightforward CSS; existing components reused as-is
- Pitfalls: HIGH -- focus trap and layout reflow are well-understood problems; Zustand selector stability is documented in project memory

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable -- no external dependencies changing)
