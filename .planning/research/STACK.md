# Stack Research: v1.6 Clarity

**Domain:** Desktop app UI overhaul -- hub restructuring, slide-in panels, briefing restyling, drawer consolidation
**Researched:** 2026-04-04
**Confidence:** HIGH

## Executive Summary

v1.6 Clarity is a UI restructuring milestone, not a new-technology milestone. The existing stack (React 19, Tailwind CSS 4, shadcn/ui, react-resizable-panels, Zustand) handles 90% of what is needed. The only meaningful addition is **tw-animate-css** for slide-in/slide-out panel transitions. No animation framework (Motion/Framer Motion) is warranted -- the animations here are simple state-driven show/hide transitions that CSS handles natively, and adding a 40KB+ JS animation library for slide panels in a desktop app is engineering vanity.

## Recommended Additions

### New Dependencies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| tw-animate-css | ^1.x | CSS-based enter/exit animations for slide-in panels | shadcn/ui's official replacement for tailwindcss-animate on Tailwind v4. Provides `animate-in`, `animate-out`, `slide-in-from-right`, `slide-in-from-left`, `fade-in`, `fade-out` utilities. Zero JS -- pure CSS keyframes composed via Tailwind classes. Already the standard for shadcn/ui projects on Tailwind v4. |

### Existing Stack -- No Changes Needed

| Technology | Current Version | Role in v1.6 | Notes |
|------------|----------------|--------------|-------|
| react-resizable-panels | ^4.7.3 | Hub layout restructuring | Already used for 3-column hub and drawer. Will be simplified -- remove the 3-panel horizontal layout, replace with single center panel + overlay slide-in panels. Keep for center-vs-drawer vertical split. |
| Zustand | ^5.0.11 | Panel visibility state | Already manages `hubLayout`, `drawerOpen`, `activeDrawerTab`. Extend with `hubPanelOpen: Record<'goals'\|'calendar'\|'briefing', boolean>` for slide-in toggle state. |
| shadcn/ui | (components) | UI primitives | Sheet component provides slide-in drawer pattern out of the box. Use for hub slide-in panels. |
| Tailwind CSS | ^4.2.1 | Styling, transitions | `transition-all`, `duration-300`, `translate-x-*` classes handle slide animations natively. `transition-discrete` (new in v4) enables animating `display: none` toggling. |
| react-markdown + remark-gfm | ^10.1.0 / ^4.0.1 | Briefing content rendering | Already used. Briefing visual rework is CSS/component restructuring, not a library change. |
| lucide-react | ^0.577.0 | Icons for panel toggle buttons | Already used throughout. |

## Installation

```bash
# Single new dependency
npm install tw-animate-css
```

Then update `src/app.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
```

That is the entire installation. No config files, no plugins, no build changes.

## Architecture Decisions for v1.6 Features

### Hub Overhaul: Single Center View + Slide-In Panels

**Decision:** Use shadcn/ui `Sheet` component (Radix Dialog-based) for slide-in panels, NOT react-resizable-panels.

**Why:** The current 3-column `ResizablePanelGroup` in `HubView.tsx` is the problem v1.6 is solving -- it forces horizontal scrolling and makes all three panels compete for space. The new design calls for a single center view with *opt-in* slide-in overlays. This is exactly what a `Sheet` (side drawer) provides: an overlay that slides in from the edge, overlapping content rather than displacing it.

**Implementation pattern:**
- Center panel (briefing + chat) takes full width
- Goals panel: `Sheet` anchored left, toggled by button in hub header
- Calendar panel: `Sheet` anchored right, toggled by button in hub header
- Briefing panel: remains inline in center (it IS the center content)

**Alternative considered:** Absolute-positioned divs with CSS transitions. Rejected because shadcn/ui Sheet already handles focus trapping, click-outside-to-close, escape key, scroll locking, and smooth transitions. Reimplementing these is wasted effort.

### Briefing Visual Redesign

**Decision:** Pure CSS/component restructuring. No new libraries.

**Why:** The current `BriefingContent.tsx` renders markdown through `react-markdown` with `prose prose-sm prose-invert`. The visual rework is about:
1. Better section spacing and hierarchy (Tailwind utility classes)
2. Scannable card-based sections instead of raw markdown flow (custom ReactMarkdown component overrides)
3. Status indicators and progress visuals (existing `Badge`, `Progress` components from shadcn/ui)
4. Greeting and time-of-day theming (conditional Tailwind classes)

ReactMarkdown already supports custom component renderers via the `components` prop -- use this to wrap `h2`, `h3`, `ul`, `blockquote` in styled cards/sections. No library needed.

### Drawer Click-to-Toggle

**Decision:** Zustand state change + CSS transition. No new libraries.

**Why:** The current drawer already toggles via `toggleDrawer()` in the workspace store, which calls `panel.collapse()` / `panel.resize()` on the `react-resizable-panels` ref. The "click to toggle" behavior is a UX change (clicking the drawer header bar toggles open/close), not a technology change. The drawer already collapses/expands -- the fix is making the entire header bar clickable, not just the "Show/Hide Output" button.

For the AI panel moving from right sidebar to drawer tab: extend `DrawerTab` type from `"logs" | "history" | "runs" | "terminal"` to include `"agent"`. Render `AgentPanel` content inside `OutputDrawer` when `activeDrawerTab === "agent"`. Remove the fixed `w-80 border-l` right sidebar.

### Goal-First Project Layout

**Decision:** Component restructuring of `ProjectDetail.tsx`. No new libraries.

**Why:** The current `ProjectDetail.tsx` leads with project name/description editing, then phases/tasks. The v1.6 redesign leads with the goal/problem statement (read from `.planning/PROJECT.md` or project description), then provides a streamlined entry point to the workspace (directory + terminal). This is a component reordering and styling change. The existing `react-markdown` handles rendering any markdown goal content.

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `motion` (formerly framer-motion) | 40KB+ for animations that CSS handles. Slide-in panels are simple translate transitions, not physics-based springs. The app targets desktop with no gesture interactions. Adding a JS animation library for `translateX` is over-engineering. | `tw-animate-css` + Tailwind transition utilities + shadcn/ui Sheet |
| `@react-spring/web` | Same rationale as Motion. Spring physics are not needed for panel show/hide. | Tailwind CSS transitions |
| `tailwindcss-animate` | Deprecated for Tailwind v4. Plugin-based approach replaced by CSS import approach. | `tw-animate-css` (the official successor) |
| `vaul` (drawer library) | Already have react-resizable-panels handling the bottom drawer. Vaul is designed for mobile bottom sheets with drag gestures -- wrong paradigm for a desktop app. | Existing react-resizable-panels collapse/expand |
| `@headlessui/react` | Overlaps with Radix primitives already used via shadcn/ui. Adding a second headless UI library creates confusion about which to use. | shadcn/ui components (Sheet, Dialog, Collapsible) |
| `react-transition-group` | Legacy library. React 19 + CSS transitions + tw-animate-css cover all cases. | Tailwind transition classes |
| Custom animation hooks | `useSpring`, `useTransition` custom hooks add complexity. The animations in v1.6 are binary (open/closed), not continuous. | CSS `transition-all duration-300` |

## shadcn/ui Components to Leverage

These components are already available via shadcn/ui and should be used for v1.6 features rather than building custom equivalents:

| Component | v1.6 Use Case | Notes |
|-----------|---------------|-------|
| **Sheet** | Hub slide-in panels (goals, calendar) | Side-anchored overlay with built-in transitions. Use `side="left"` for goals, `side="right"` for calendar. |
| **Collapsible** | Workflows section minimizable, drawer sections | Animate open/close with `tw-animate-css` classes. |
| **Tabs** | Drawer tab bar (terminal, logs, history, agent) | Already partially implemented manually in `AppLayout.tsx`. Consider migrating to the shadcn Tabs component for consistency. |
| **Card** | Briefing section cards | Already used in `BriefingPanel.tsx`. Extend usage for individual briefing sections. |
| **Badge** | Status indicators in briefing | Already available. |
| **Separator** | Visual section breaks in briefing | Already available. |

Generate any missing shadcn components before starting implementation:

```bash
ls src/components/ui/sheet.tsx 2>/dev/null || npx shadcn@latest add sheet
ls src/components/ui/collapsible.tsx 2>/dev/null || npx shadcn@latest add collapsible
ls src/components/ui/tabs.tsx 2>/dev/null || npx shadcn@latest add tabs
```

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| tw-animate-css ^1.x | Tailwind CSS ^4.x | CSS import approach, no plugin config needed |
| shadcn/ui Sheet | Radix UI (already installed via @radix-ui/react-slot) | May need `@radix-ui/react-dialog` if not already pulled in by existing Dialog component |
| react-resizable-panels ^4.7.3 | React 19 | Already validated in v1.4/v1.5 |

## Migration Notes

### HubView.tsx Restructuring

The current `HubView.tsx` uses a horizontal `ResizablePanelGroup` with three panels (Goals, Center, Calendar). In v1.6:

1. **Remove** the horizontal `ResizablePanelGroup` entirely
2. **Keep** the center content (briefing + chat) as the full-width hub view
3. **Add** Sheet overlays for goals (left) and calendar (right) panels
4. **Add** toggle buttons in a hub header bar
5. **Move** panel visibility state from `hubLayout.goalsCollapsed` / `hubLayout.calendarCollapsed` to explicit `hubPanels: { goals: boolean, calendar: boolean }` in workspace store

### AppLayout.tsx Drawer Changes

1. **Add** `"agent"` to the `DrawerTab` union type
2. **Add** agent tab button to the drawer header bar
3. **Remove** the `{agentPanelOpen && <AgentPanel />}` right sidebar rendering
4. **Render** `AgentPanel` content (activity + terminal tabs) inside `OutputDrawer` when agent tab is active
5. **Make** the entire drawer header bar clickable to toggle (not just the button)

### BriefingPanel.tsx Visual Rework

1. **Add** custom ReactMarkdown component overrides for section styling
2. **Use** Card components to wrap briefing sections
3. **Add** visual hierarchy with spacing, dividers, and typography scale
4. **Keep** existing streaming/skeleton/error state machine unchanged

## Sources

- shadcn/ui Tailwind v4 migration guide: https://ui.shadcn.com/docs/tailwind-v4 -- confirmed tw-animate-css as replacement (HIGH confidence)
- tw-animate-css / tailwindcss-animate GitHub: https://github.com/jamiebuilds/tailwindcss-animate -- verified CSS import approach for v4 (HIGH confidence)
- Motion (framer-motion) docs: https://motion.dev/docs/react -- confirmed current version 12.x, evaluated and rejected (HIGH confidence)
- Tailwind CSS v4 transition docs: https://tailwindcss.com/docs/transition-property -- verified transition-discrete support (HIGH confidence)
- Codebase analysis: package.json, AppLayout.tsx, HubView.tsx, BriefingPanel.tsx, DrawerHeader.tsx -- direct inspection (HIGH confidence)

---
*Stack research for: v1.6 Clarity UI overhaul*
*Researched: 2026-04-04*
