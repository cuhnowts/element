# Phase 2: Task UI and Execution History - Research

**Researched:** 2026-03-15
**Domain:** Multi-panel desktop UI with calendar, task detail, execution history
**Confidence:** HIGH

## Summary

Phase 2 transforms the Phase 1 desktop shell into a full multi-panel workspace. The locked layout decision is a two-column design (fixed left sidebar + flexible center panel) with a resizable bottom drawer for output logs. All panel state (drawer height, open/closed) persists to localStorage via Zustand's persist middleware. The frontend remains purely presentational -- it receives task and execution data from the Rust backend via Tauri event listeners and sends user actions via `invoke` commands.

The stack is entirely decided: React 19, shadcn/ui (ResizablePanel components wrapping react-resizable-panels), Tailwind v4, Zustand for state, and Tauri IPC for backend communication. A detailed UI-SPEC already exists at `02-UI-SPEC.md` covering layout dimensions, typography, color tokens, interaction patterns, keyboard shortcuts, and copywriting. This research focuses on the technical implementation patterns needed to realize that spec.

**Primary recommendation:** Build the layout shell first (ResizablePanelGroup with sidebar + center + drawer), then layer in content components (calendar, task list, task detail, execution log viewer) as independent React components connected to a single Zustand store.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two-column layout with bottom drawer: left sidebar | center panel | bottom output drawer
- Left sidebar: fixed width, always visible. Calendar toggle at top, today's tasks and workflows listed below
- Center panel: task detail and execution diagram -- gets maximum vertical space
- Bottom drawer: output and logs panel, open by default at ~30% height, resizable
- All panel sizes and drawer open/closed state persist across sessions (local storage)
- When no task is selected, center panel shows a welcome dashboard: recent tasks, upcoming scheduled workflows, quick-create button

### Claude's Discretion
- Calendar view specifics (day/week/month toggle, visual style)
- Task detail layout and information density in the central panel
- Execution diagram visual representation (flow chart, step list, etc.)
- Output/log formatting (terminal-style vs structured cards)
- Keyboard shortcuts for panel toggling and navigation
- Loading states and transition animations
- Welcome dashboard exact content and layout

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | App displays calendar view toggle in top-left panel | shadcn Calendar component (react-day-picker) + shadcn Switch for toggle; month grid with day/week/month Tabs |
| UI-02 | App displays today's tasks/workflows below calendar | Zustand store filtered by today's date; ScrollArea for overflow; Tauri event listener for real-time task updates |
| UI-03 | Central panel shows task context and execution diagram | Custom step-list component (NOT a flowchart library); vertical connector lines between numbered steps |
| UI-04 | Central panel shows assigned agents, skills, and tools | shadcn Badge variant="secondary" for inline chips; data from task detail IPC response |
| UI-05 | Output panel displays task execution logs and results | Bottom drawer with ResizablePanel; terminal-style monospace log viewer; ScrollArea with auto-scroll |
| TASK-04 | User can view task execution history and outcomes | Execution history loaded via Tauri invoke; displayed in both center panel (diagram) and bottom drawer (logs) |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.x | UI framework | Project stack decision (SUMMARY.md) |
| react-resizable-panels | 4.x | Resizable panel layout | Powers shadcn ResizablePanel; v4 is current with shadcn compatibility |
| @tauri-apps/api | 2.x | IPC commands and event listeners | Tauri 2.x backend communication |
| zustand | 5.x | State management with persist middleware | Project stack decision; persist middleware for localStorage panel state |
| tailwindcss | 4.x | Utility-first CSS | Project stack decision |
| date-fns | 4.x | Date manipulation for calendar | Lightweight, tree-shakable, no heavy date lib dependency |
| lucide-react | latest | Icon library | Declared in UI-SPEC |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | 9.x | Calendar month grid | Used by shadcn Calendar component; provides accessible month/week navigation |
| clsx / tailwind-merge | latest | Conditional class composition | Standard shadcn pattern for className merging |

### shadcn/ui Components Used

These are copy-pasted into the project (not npm dependencies):

| Component | Purpose |
|-----------|---------|
| ResizablePanelGroup | Outer layout container (vertical orientation for center+drawer split) |
| ResizablePanel | Center panel and bottom drawer panels |
| ResizableHandle | Drag handle between center and drawer |
| ScrollArea | Scrollable task list, workflow list, log output |
| Button | Calendar toggle, drawer collapse, quick-create CTA |
| Badge | Status badges, agent/skill/tool chips |
| Tabs | Calendar day/week/month view toggle |
| Switch | Calendar visibility toggle |
| Skeleton | Loading state placeholders |
| Calendar | Mini calendar month grid (wraps react-day-picker) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom step-list diagram | React Flow / Syncfusion | Massively over-engineered for a linear step list; 100KB+ bundle for something achievable with CSS |
| react-day-picker (via shadcn) | react-big-calendar | Big-calendar is for full-day/week scheduling views; mini calendar only needs month grid |
| Custom log viewer | xterm.js | Full terminal emulator is overkill for read-only log display |

**Installation (beyond Phase 1 base):**
```bash
npx shadcn@latest add calendar tabs switch skeleton
npm install date-fns
```

Note: resizable, scroll-area, button, badge are expected to already be installed in Phase 1.

## Architecture Patterns

### Recommended Component Structure

```
src/
  components/
    layout/
      AppLayout.tsx          # Top-level: sidebar + ResizablePanelGroup
      Sidebar.tsx            # Fixed-width left sidebar container
      CenterPanel.tsx        # Task detail or welcome dashboard
      OutputDrawer.tsx       # Bottom resizable drawer
    sidebar/
      CalendarToggle.tsx     # Switch + label
      MiniCalendar.tsx       # shadcn Calendar wrapper
      TaskList.tsx           # Today's tasks with ScrollArea
      WorkflowList.tsx       # Upcoming workflows with ScrollArea
      TaskListItem.tsx       # Individual task row
    center/
      WelcomeDashboard.tsx   # Shown when no task selected
      TaskDetail.tsx         # Full task context view
      TaskHeader.tsx         # Title, status badge, priority
      TaskMetadata.tsx       # Project, tags, dates grid
      ExecutionDiagram.tsx   # Step list with vertical connectors
      StepItem.tsx           # Single step: number + name + status + duration
    output/
      DrawerHeader.tsx       # Title, collapse toggle, clear button
      LogViewer.tsx          # Scrollable monospace log display
      LogEntry.tsx           # Single log line: timestamp + level + message
    shared/
      AgentChip.tsx          # Badge for agent/skill/tool
      StatusDot.tsx          # Colored status indicator
      EmptyState.tsx         # Reusable empty state with heading + body
  stores/
    useWorkspaceStore.ts     # Panel state: drawer height, open/closed, selected task
    useTaskStore.ts          # Task data: today's tasks, selected task detail, execution history
  hooks/
    useTauriEvent.ts         # Generic hook for Tauri event subscription with cleanup
    useKeyboardShortcuts.ts  # Centralized keyboard shortcut registration
  lib/
    tauri-commands.ts        # Typed wrappers around invoke() calls
```

### Pattern 1: Zustand Store with Persist for Panel State

**What:** Workspace layout state (drawer height, drawer open/closed, calendar visible) persists to localStorage via Zustand's persist middleware.

**When to use:** Any UI state that should survive app restart.

**Example:**
```typescript
// Source: Zustand persist docs (https://zustand.docs.pmnd.rs/reference/middlewares/persist)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  drawerHeight: number;       // percentage (0-100)
  drawerOpen: boolean;
  calendarVisible: boolean;
  selectedTaskId: string | null;

  setDrawerHeight: (height: number) => void;
  toggleDrawer: () => void;
  toggleCalendar: () => void;
  selectTask: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      drawerHeight: 30,
      drawerOpen: true,
      calendarVisible: true,
      selectedTaskId: null,

      setDrawerHeight: (height) => set({ drawerHeight: height }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
      toggleCalendar: () => set((s) => ({ calendarVisible: !s.calendarVisible })),
      selectTask: (id) => set({ selectedTaskId: id }),
    }),
    {
      name: 'element-workspace',
      partialize: (state) => ({
        drawerHeight: state.drawerHeight,
        drawerOpen: state.drawerOpen,
        calendarVisible: state.calendarVisible,
        // Do NOT persist selectedTaskId -- task may not exist on next launch
      }),
    }
  )
);
```

### Pattern 2: Tauri Event Listener Hook

**What:** A React hook that subscribes to Tauri backend events and cleans up on unmount. Prevents memory leaks from orphaned listeners.

**When to use:** Any component that needs real-time data from the Rust backend.

**Example:**
```typescript
// Source: Tauri 2 docs (https://v2.tauri.app/develop/calling-frontend/)
import { useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export function useTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void
) {
  useEffect(() => {
    let unlisten: UnlistenFn;

    listen<T>(eventName, (event) => {
      handler(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [eventName, handler]);
}
```

### Pattern 3: Layout with Conditional Drawer

**What:** The main layout uses a fixed sidebar beside a vertical ResizablePanelGroup that splits center content from the bottom drawer. When the drawer is collapsed, it shrinks to a header bar only.

**Example:**
```typescript
// Source: shadcn/ui resizable docs (https://ui.shadcn.com/docs/components/radix/resizable)
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

function AppLayout() {
  const { drawerOpen, drawerHeight } = useWorkspaceStore();

  return (
    <div className="flex h-screen">
      {/* Fixed sidebar */}
      <aside className="w-[280px] border-r flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Center + Drawer split */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={drawerOpen ? 100 - drawerHeight : 100}>
          <CenterPanel />
        </ResizablePanel>

        {drawerOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={drawerHeight}
              minSize={15}
              maxSize={60}
              collapsible
            >
              <OutputDrawer />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
```

### Pattern 4: Execution Diagram as Step List

**What:** The execution diagram is a vertical list of steps with connector lines, NOT a flowchart. Each step shows: step number, name, status icon, and duration. This is vastly simpler than a node-graph and matches the linear pipeline model from ARCHITECTURE.md.

**When to use:** Displaying task execution flow in the center panel.

**Example:**
```typescript
function ExecutionDiagram({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start gap-3">
          {/* Vertical connector */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className="w-0.5 h-8 bg-border" />
            )}
          </div>

          {/* Step content */}
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2">
              <StatusDot status={step.status} />
              <span className="font-semibold">{step.name}</span>
              {step.duration && (
                <span className="text-muted-foreground text-sm">
                  ({step.duration})
                </span>
              )}
            </div>
            {/* Agent/skill/tool badges */}
            <div className="flex gap-1 mt-1">
              {step.agents?.map((a) => (
                <Badge key={a} variant="secondary">{a}</Badge>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Polling for task updates:** Use Tauri event listeners, not `setInterval`. The backend pushes `task-updated`, `execution-started`, `execution-log` events.
- **Business logic in React components:** Components render data from Zustand stores. Filtering, sorting, date calculations belong in store selectors or utility functions.
- **Giant monolith components:** The center panel alone has 5+ distinct sections (header, metadata, description, diagram, agents). Each must be its own component.
- **Direct localStorage calls:** Always go through Zustand persist middleware. Direct `localStorage.setItem` creates race conditions with Zustand hydration.
- **Conditional rendering that unmounts ResizablePanelGroup children:** react-resizable-panels requires stable children within a group. Toggle drawer visibility by collapsing panel size, not by removing the Panel element from the tree.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar month grid | Custom 7x6 grid with date math | shadcn Calendar (react-day-picker) | Date edge cases (leap years, month boundaries, locale-aware weekday start), accessibility (keyboard nav, ARIA), styling consistency |
| Resizable panels | Custom drag-to-resize with mouse events | react-resizable-panels via shadcn | Touch support, keyboard resize, SSR compatibility, constraint solving (min/max), persistence hooks |
| Scrollable areas with custom scrollbars | CSS overflow + custom scrollbar styling | shadcn ScrollArea (Radix) | Cross-browser scrollbar styling, touch scrolling, virtual scrolling readiness |
| Keyboard shortcuts | Raw keydown listeners scattered across components | Centralized useKeyboardShortcuts hook | Prevents conflicts, handles Cmd vs Ctrl cross-platform, provides single place to disable during text input |
| Skeleton loading states | Custom CSS pulsing divs | shadcn Skeleton | Consistent animation timing, respects prefers-reduced-motion |

**Key insight:** shadcn/ui already provides nearly every primitive this phase needs. The custom work is composing these primitives into the domain-specific layout and connecting them to Zustand stores and Tauri events.

## Common Pitfalls

### Pitfall 1: react-resizable-panels v4 Breaking Changes
**What goes wrong:** shadcn/ui's Resizable component wrapper was updated for react-resizable-panels v4, which renamed exports (`PanelGroup` -> `Group`, `PanelResizeHandle` -> `Separator`) and changed `direction` to `orientation`.
**Why it happens:** Stale tutorials and examples reference v3 API.
**How to avoid:** Always use shadcn's wrapper components (`ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`) -- these abstract the v3/v4 differences. Never import directly from `react-resizable-panels`. Run `npx shadcn@latest add resizable` to get the compatible wrapper.
**Warning signs:** TypeScript errors about `PanelGroup` not existing; `data-panel-*` attributes not working (v4 uses `aria-*`).

### Pitfall 2: Tauri Event Listener Memory Leaks
**What goes wrong:** Registering event listeners without cleanup causes duplicate handlers after component re-renders or hot module replacement.
**Why it happens:** `listen()` returns a Promise of an unlisten function; developers forget the async cleanup pattern.
**How to avoid:** Always use the `useTauriEvent` hook pattern (see Architecture Patterns above) that handles async unlisten in useEffect cleanup.
**Warning signs:** Log entries appearing multiple times; state updates firing more than once per backend event.

### Pitfall 3: Zustand Persist Hydration Flash
**What goes wrong:** On first render, Zustand store uses default values before localStorage data hydrates, causing a visible flash (e.g., drawer briefly appears at default size, then jumps to persisted size).
**Why it happens:** persist middleware hydration is asynchronous by default.
**How to avoid:** Use `skipHydration: true` and manually call `useWorkspaceStore.persist.rehydrate()` in app initialization, or use `onRehydrateStorage` to show a loading state until hydration completes.
**Warning signs:** Brief layout shift on app load; drawer height flickering.

### Pitfall 4: Conditional Panel Rendering Crashes
**What goes wrong:** react-resizable-panels crashes or behaves unpredictably when Panel children are conditionally added/removed from a PanelGroup.
**Why it happens:** The library tracks panels by order within the group; adding/removing disrupts the internal panel registry.
**How to avoid:** Keep all panels always rendered. Use the `collapsible` prop and `collapsedSize={0}` to hide the drawer instead of removing it. Control visibility through panel size, not conditional rendering.
**Warning signs:** "Panel id collision" warnings; layout snapping to unexpected sizes.

### Pitfall 5: Log Auto-Scroll Fighting User Scroll
**What goes wrong:** The log viewer auto-scrolls to bottom on new entries even when the user has scrolled up to read earlier logs.
**Why it happens:** Naive `scrollTo(bottom)` on every log update.
**How to avoid:** Track whether the user is at the bottom of the scroll area. Only auto-scroll if the user is already at the bottom (within a threshold, e.g., 50px). When the user scrolls up, stop auto-scrolling and show a "Jump to latest" button.
**Warning signs:** Users report inability to read historical logs while execution is running.

## Code Examples

### Tauri IPC Command Wrappers

```typescript
// Source: Tauri 2 invoke docs (https://v2.tauri.app/reference/javascript/api/namespaceevent/)
import { invoke } from '@tauri-apps/api/core';

// Typed command wrappers for Phase 2 data needs
export async function getTodaysTasks(): Promise<Task[]> {
  return invoke<Task[]>('get_todays_tasks');
}

export async function getTaskDetail(taskId: string): Promise<TaskDetail> {
  return invoke<TaskDetail>('get_task_detail', { taskId });
}

export async function getExecutionHistory(taskId: string): Promise<ExecutionRecord[]> {
  return invoke<ExecutionRecord[]>('get_execution_history', { taskId });
}

export async function getExecutionLogs(executionId: string): Promise<LogEntry[]> {
  return invoke<LogEntry[]>('get_execution_logs', { executionId });
}
```

### Terminal-Style Log Viewer with Smart Auto-Scroll

```typescript
import { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

function LogViewer({ entries }: { entries: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, isAtBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const threshold = 50;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  };

  return (
    <div className="relative h-full">
      <ScrollArea
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full font-mono text-sm"
      >
        {entries.map((entry, i) => (
          <LogEntry key={i} entry={entry} />
        ))}
      </ScrollArea>
      {!isAtBottom && entries.length > 0 && (
        <button
          onClick={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              setIsAtBottom(true);
            }
          }}
          className="absolute bottom-2 right-4 text-xs bg-muted px-2 py-1 rounded"
        >
          Jump to latest
        </button>
      )}
    </div>
  );
}
```

### Log Entry Color Coding

```typescript
const LOG_LEVEL_STYLES: Record<string, string> = {
  INFO: 'text-foreground',
  WARN: 'text-chart-5',       // amber/yellow tone
  ERROR: 'text-destructive',
  DEBUG: 'text-muted-foreground',
};

function LogEntry({ entry }: { entry: LogEntryType }) {
  return (
    <div className="flex gap-2 px-3 py-0.5 hover:bg-muted/50">
      <span className="text-muted-foreground whitespace-nowrap">
        [{entry.timestamp}]
      </span>
      <span className={`font-semibold w-12 ${LOG_LEVEL_STYLES[entry.level] ?? ''}`}>
        {entry.level}
      </span>
      <span className="flex-1">{entry.message}</span>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-resizable-panels v3 (`PanelGroup`, `direction`) | v4 (`Group`, `orientation`) | Feb 2025 | shadcn wrappers abstract this; never import directly from react-resizable-panels |
| Zustand v4 persist API | Zustand v5 persist (same API, better types) | Late 2024 | No migration needed; v5 persist middleware is backward compatible |
| data-* attributes for panel styling | aria-* attributes (react-resizable-panels v4) | Feb 2025 | Use shadcn wrappers which handle this automatically |

**Deprecated/outdated:**
- react-resizable-panels v3 `direction` prop -- use `orientation` (via shadcn wrapper)
- Direct `PanelGroup` imports from react-resizable-panels -- use shadcn's `ResizablePanelGroup`

## Open Questions

1. **Phase 1 data layer shape**
   - What we know: Phase 1 creates SQLite tables for tasks, execution history, and workflow definitions
   - What's unclear: Exact Tauri IPC command signatures and TypeScript types for task detail, execution records
   - Recommendation: Define TypeScript interfaces now; adjust when Phase 1 solidifies. The frontend should use a typed abstraction layer (`tauri-commands.ts`) so changes are localized.

2. **Calendar event data source**
   - What we know: Calendar in Phase 2 shows task-based time layout, not external calendar events (those come in Phase 4 via PLUG-04)
   - What's unclear: Whether tasks have scheduled times in Phase 1 or only dates
   - Recommendation: Calendar should highlight dates that have tasks; if no time data exists, calendar is a date navigator/filter only.

3. **Execution diagram for tasks without workflows**
   - What we know: Multi-step workflows are Phase 3 (TASK-05, TASK-06). Phase 2 tasks may be single-step.
   - What's unclear: What the execution diagram shows for a simple task with no defined steps
   - Recommendation: Show a single-step diagram for simple tasks (one node: the task itself). Show empty state "No execution steps defined" if no execution has ever run. This keeps the component usable in Phase 2 and naturally extends in Phase 3.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (expected from Phase 1 Tauri+React setup) |
| Config file | vitest.config.ts (Phase 1 creates this) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test -- --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Calendar toggle shows/hides mini calendar | unit | `npx vitest run src/components/sidebar/CalendarToggle.test.tsx` | Wave 0 |
| UI-02 | Task list renders today's tasks from store | unit | `npx vitest run src/components/sidebar/TaskList.test.tsx` | Wave 0 |
| UI-03 | Center panel shows task detail when task selected | unit | `npx vitest run src/components/center/TaskDetail.test.tsx` | Wave 0 |
| UI-04 | Agent/skill/tool badges render from task data | unit | `npx vitest run src/components/center/ExecutionDiagram.test.tsx` | Wave 0 |
| UI-05 | Output drawer shows log entries with correct formatting | unit | `npx vitest run src/components/output/LogViewer.test.tsx` | Wave 0 |
| TASK-04 | Execution history loads and displays via IPC | integration | `npx vitest run src/stores/useTaskStore.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/sidebar/CalendarToggle.test.tsx` -- covers UI-01
- [ ] `src/components/sidebar/TaskList.test.tsx` -- covers UI-02
- [ ] `src/components/center/TaskDetail.test.tsx` -- covers UI-03
- [ ] `src/components/center/ExecutionDiagram.test.tsx` -- covers UI-04
- [ ] `src/components/output/LogViewer.test.tsx` -- covers UI-05
- [ ] `src/stores/useTaskStore.test.ts` -- covers TASK-04
- [ ] `src/hooks/useTauriEvent.test.ts` -- shared utility
- [ ] Mock utilities for Tauri `invoke` and `listen` in test setup

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Resizable docs](https://ui.shadcn.com/docs/components/radix/resizable) -- ResizablePanelGroup API, shadcn wrapper compatibility
- [shadcn/ui Calendar docs](https://ui.shadcn.com/docs/components/radix/calendar) -- react-day-picker integration, month grid
- [Tauri 2 Calling Frontend](https://v2.tauri.app/develop/calling-frontend/) -- emit, listen, unlisten, payload typing
- [Tauri 2 Event API](https://v2.tauri.app/reference/javascript/api/namespaceevent/) -- TypeScript event listener API
- [Zustand persist middleware](https://zustand.docs.pmnd.rs/reference/middlewares/persist) -- partialize, onRehydrateStorage, skipHydration
- [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) -- Panel props: collapsible, collapsedSize, defaultSize, minSize, maxSize

### Secondary (MEDIUM confidence)
- [react-resizable-panels v4 PR](https://github.com/bvaughn/react-resizable-panels/pull/528) -- breaking changes: export renames, attribute changes
- [shadcn/ui GitHub Issue #9136](https://github.com/shadcn-ui/ui/issues/9136) -- v4 compatibility resolution
- [Building calendar with Tailwind and date-fns](https://dev.to/vivekalhat/building-a-calendar-component-with-tailwind-and-date-fns-2c0i) -- custom calendar approach reference

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are project decisions from SUMMARY.md, verified with official docs
- Architecture: HIGH -- patterns follow shadcn/ui + Zustand + Tauri official patterns; UI-SPEC provides detailed layout contract
- Pitfalls: HIGH -- react-resizable-panels v4 issues confirmed via GitHub issues; Tauri event cleanup from official docs; Zustand persist hydration from official middleware docs

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable libraries, unlikely to change)
