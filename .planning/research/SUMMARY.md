# Project Research Summary

**Project:** Element v1.6 Clarity
**Domain:** Desktop productivity app UI overhaul — layout restructuring, panel system redesign, briefing UX, drawer consolidation
**Researched:** 2026-04-04
**Confidence:** HIGH

## Executive Summary

v1.6 Clarity is a focused UI restructuring milestone for an existing Tauri 2.x + React 19 + Zustand desktop app. The research confirms this is not a technology introduction problem — the existing stack handles everything needed. The single recommended addition is `tw-animate-css` for CSS-based slide-in panel transitions; no JS animation framework is warranted. The core design shift moves from a 3-column `ResizablePanelGroup` hub (where Goals, Briefing, and Calendar compete for horizontal space) to a single center view with opt-in slide-in overlay panels. This pattern is validated by Linear, Superhuman, and Notion, all of which use single-focus views with context on demand.

The recommended architecture has five distinct work streams ordered by dependency: (1) drawer consolidation and agent panel relocation, (2) hub layout overhaul with overlay panels, (3) briefing visual rework (parallelizable with hub overhaul), (4) goal-first project detail, and (5) bug fixes and polish. The ordering is driven by the fact that removing the right-side AgentPanel column from AppLayout simplifies every subsequent change — it should come first. The hub overhaul is the largest visual change and benefits from AppLayout being stabilized first.

The primary risks are all codebase-specific: Zustand selector instability (caused 3 crashes in prior milestones), xterm.js canvas destruction if the agent terminal is remounted rather than hidden via `display: none`, and localStorage hydration mismatches when the `hubLayout` state shape changes. These risks are well-understood with explicit prevention strategies. There are no research unknowns — this is a refactor of a known codebase with well-documented patterns, not a greenfield build.

## Key Findings

### Recommended Stack

The existing stack requires no major changes. `tw-animate-css` is the only new dependency — it is the official `tailwindcss-animate` replacement for Tailwind v4, used by shadcn/ui projects, providing `animate-in`, `animate-out`, `slide-in-from-right`, `slide-in-from-left`, `fade-in`, and `fade-out` utilities via pure CSS keyframes. Installation is one import line in `app.css`. All animation frameworks (Motion/Framer Motion, react-spring, vaul) are explicitly rejected as over-engineering for simple binary show/hide transitions in a desktop app.

Existing shadcn/ui components — specifically `Sheet` (for slide-in panels), `Collapsible` (for drawer sections), and `Tabs` (for the drawer tab bar) — should be leveraged rather than building custom equivalents. They handle focus trapping, keyboard dismissal, and transitions out of the box. Before the hub overhaul phase, a brief spike should determine whether shadcn `Sheet` or a custom `SlidePanel` component better fits the hub overlay use case (Sheet's focus-trap behavior may conflict with hub chat input focus).

**Core technologies:**
- `react-resizable-panels ^4.7.3`: Retained for the vertical center/drawer split in AppLayout; removed from HubView's horizontal 3-column layout
- `shadcn/ui Sheet`: Primary candidate to replace the custom horizontal ResizablePanelGroup for hub side panels — overlay pattern, not push layout
- `Zustand ^5.0.11`: Extended with `hubOverlays: { goals: boolean; calendar: boolean }` and `"agent"` added to `DrawerTab` union type
- `tw-animate-css ^1.x`: New — CSS slide-in/out animations for overlay panels
- `Tailwind CSS ^4.2.1`: `transition-transform duration-200` on panel containers; `transition-discrete` for display toggling

### Expected Features

**Must have (table stakes for v1.6):**
- Single-view hub with no forced horizontal scroll — users expect focused center views
- Hub slide-in overlay panels (Goals left, Calendar right) toggled from a toolbar
- Briefing with visual hierarchy and scannable sections — markdown walls are not briefings
- On-demand briefing generation (show cached on load, explicit generate button)
- Drawer click-to-toggle — grip bar or chevron, not text button
- AI panel as bottom drawer tab — consolidates the right sidebar, gives AI full screen width
- Goal-first project detail — purpose/goal card above phases
- Workspace entry consolidation — group AI button, directory link, session count
- Calendar "Today" label bug fix
- Deterministic overdue detection (`due_date < today AND status != complete`)
- Workflows section minimizable

**Should have (add in v1.6.x polish):**
- Keyboard shortcuts: Cmd+J for drawer toggle, Cmd+B for goals panel
- Drawer height memory per context (hub vs project)
- Briefing section collapse/expand

**Defer (v1.7+):**
- Interactive briefing with entity links (click project/task mentions to navigate)
- Briefing scheduling (configure auto-generate timing)
- Hub quick-action cards (approve, reschedule, dismiss from briefing)

### Architecture Approach

The structural change removes the right-side AgentPanel flex column from AppLayout entirely, replaces the hub's horizontal `ResizablePanelGroup` with a single center view and `SlidePanel` overlay components, replaces the vertical `ResizablePanel` drawer with a fixed-height click-to-toggle `DrawerBar`, and consolidates agent UI into the `OutputDrawer` as an "Element AI" tab. Five new components are needed (`SlidePanel`, `HubToolbar`, `DrawerBar`, `ProjectGoalHero`, `ProjectWorkspaceEntry`). Three existing components are deleted (`AgentPanel`, `AgentPanelHeader`, `MinimizedColumn`). The agent lifecycle (`useAgentQueue`) stays at AppLayout level independent of UI visibility — this is the critical architectural decision.

**Major components:**
1. `SlidePanel.tsx` (new) — reusable overlay wrapper using `transform: translateX()` animation only; no layout reflow
2. `DrawerBar.tsx` (new) — click-to-toggle tab bar replacing ResizableHandle; handles open/close/tab-switch logic
3. `HubView.tsx` (rewrite) — single center with `SlidePanel` overlays; replaces 3-column `ResizablePanelGroup`
4. `OutputDrawer.tsx` (modified) — adds "Element AI" tab rendering agent activity + terminal via `display: none` pattern
5. `ProjectDetail.tsx` (layout rewrite) — `ProjectGoalHero` at top, then `ProjectWorkspaceEntry`, then phases

### Critical Pitfalls

1. **Zustand selector reference instability** — New selectors returning `?? []`, `.filter()`, or object spreads create unstable references that cause `Maximum update depth exceeded` crashes. Prevention: use module-level `const EMPTY = []` fallbacks, select primitives individually, audit every new selector before use. This project has 3 prior crashes from this exact pattern.

2. **xterm.js terminal canvas destruction on remount** — If the agent terminal is rendered conditionally (`activeDrawerTab === "agent"`) rather than via `display: none`, the canvas is destroyed on tab switch and cannot be recovered. Prevention: render all drawer tab contents simultaneously, use `display: none` for inactive tabs — exactly the existing pattern in `OutputDrawer`.

3. **Hub layout localStorage hydration mismatch** — The persisted `element-workspace` key contains the old `hubLayout` shape (3-panel sizes). Changing to `hubOverlays` without a migration causes a broken layout on first load after update. Prevention: add a schema version field and run a migration on load; replace the entire `HubView` at once, not incrementally.

4. **Agent lifecycle breakage during panel relocation** — `AgentPanel` currently auto-starts the agent on mount. Moving it to a conditional drawer tab means the agent only starts when the user opens the AI tab. Prevention: extract `startAgent()` into `AppLayout` or `useAgentQueue` init; drawer tab renders only UI, not lifecycle.

5. **Slide-in animation layout thrash** — Animating `width`, `margin`, or `left/right` on slide-in panels causes layout recalculation and content reflow, disrupting streaming text and resetting scroll positions. Prevention: animate only `transform: translateX()` (GPU-composited, no layout recalc); never animate layout properties.

## Implications for Roadmap

Based on dependency analysis and pitfall mapping, five phases are recommended:

### Phase 1: Drawer Consolidation
**Rationale:** Removing the right AgentPanel column from AppLayout simplifies the entire layout tree. Every subsequent change is easier with a cleaner AppLayout. The agent lifecycle separation must be designed before the UI moves, not retrofitted. Store changes (new `DrawerTab` type, remove `drawerHeight`, `panelOpen`) are foundational to all later work.
**Delivers:** AI panel in drawer tab, click-to-toggle drawer bar, AppLayout without right sidebar, agent lifecycle independent of panel visibility
**Addresses:** Drawer click-to-toggle, AI panel consolidation (P1 features)
**Avoids:** Agent lifecycle breakage (Pitfall 4), Zustand selector instability during store refactor (Pitfall 1), drawer state corruption on project switch

### Phase 2: Hub Layout Overhaul
**Rationale:** With AppLayout stabilized, the hub is the largest visual change. Must be done as a complete replacement of `HubView`, not incrementally (incremental breaks `react-resizable-panels` percentage calculations). Slide-in panel infrastructure must be built before removing the 3-column layout.
**Delivers:** Single center hub view, slide-in Goals and Calendar overlay panels, `HubToolbar` with toggle buttons, `SlidePanel` reusable component
**Addresses:** Single-view hub, hub slide-in panels (P1 features)
**Avoids:** Hub layout hydration mismatch (full replacement + localStorage migration), slide-in animation layout thrash (overlay not push), concurrent panel state mutations

### Phase 3: Briefing Visual Rework (parallel with Phase 2)
**Rationale:** `BriefingPanel` is self-contained with no dependencies on the hub layout or drawer changes. Can be developed in parallel with Phase 2. Pure CSS/component change using existing `react-markdown` component overrides and structured prompt engineering.
**Delivers:** Structured briefing sections (Summary, Deadlines, Blockers, Wins), card-based visual hierarchy, on-demand generation button, skeleton loader
**Addresses:** Briefing restyle, on-demand briefing generation (P1 features)
**Avoids:** Auto-streaming trigger during layout change, briefing prompt producing unstructured output

### Phase 4: Goal-First Project Detail
**Rationale:** Project detail is independent of hub and drawer changes. With the overall layout structure stable, this is lower risk. Goal-first redesign requires explicit validation that workspace entry points (directory link, Open AI button) are not buried — wireframe before coding.
**Delivers:** `ProjectGoalHero` component above phases, `ProjectWorkspaceEntry` consolidating AI + directory + session count, cleaner project detail layout
**Addresses:** Goal-first project detail, workspace entry consolidation (P1 features)
**Avoids:** Losing workspace entry points — verify click count to terminal is <= current (2 clicks) before shipping

### Phase 5: Bug Fixes and Polish
**Rationale:** All three remaining items are independent of each other and the structural changes. Shipping them last minimizes interference with the larger changes. Lowest risk phase.
**Delivers:** Calendar "Today" label fix (day and week view, timezone-safe), deterministic overdue detection, minimizable workflows section
**Addresses:** Calendar Today fix, overdue detection, workflows collapsible (P1 features)
**Avoids:** N/A — isolated, well-scoped changes with no shared dependencies

### Phase Ordering Rationale

- Drawer first: AppLayout simplification reduces surface area for every subsequent change; agent lifecycle must be separated before the UI moves
- Hub second: largest risk area (most state changes, most component rewrites); benefits from clean AppLayout with no right column
- Briefing can parallel hub: component-isolated with no shared state; allows Phase 2 and Phase 3 to ship together
- Project detail fourth: benefits from overall stability; needs a design validation step (wireframe + click-count check) before coding
- Bug fixes last: independent and low-risk; earlier phases should not be held for them

### Research Flags

Phases with standard, well-documented patterns (research-phase not needed):
- **Phase 1 (Drawer Consolidation):** All patterns established in the existing codebase (`display: none` for tabs, Zustand store extension). No novel integration.
- **Phase 3 (Briefing Rework):** Pure CSS/component work using existing `react-markdown` component overrides. Standard pattern.
- **Phase 5 (Bug Fixes):** Simple query logic and date comparison fixes. No research needed.

Phases needing a brief design spike before coding:
- **Phase 2 (Hub Overhaul):** Spike shadcn `Sheet` vs. custom `SlidePanel` — verify Sheet's focus-trap behavior does not conflict with hub chat input. One hour to prototype before committing to the full rewrite.
- **Phase 4 (Project Detail):** Wireframe the goal-first layout and verify click count to terminal before coding. User feedback validation point.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only new dependency is `tw-animate-css`, a well-documented shadcn/ui standard. All other decisions are codebase analysis, not speculation. |
| Features | HIGH | All features grounded in competitor analysis (Linear, Notion, Things, VS Code) and direct codebase inspection. Prioritization is opinionated and well-reasoned. |
| Architecture | HIGH | Research based on direct codebase analysis. Current component structure is fully mapped. Build order is dependency-driven with explicit rationale. |
| Pitfalls | HIGH | Most pitfalls drawn from project history (3 prior Zustand crashes, user feedback files) and known xterm.js constraints. Not hypothetical. |

**Overall confidence:** HIGH

### Gaps to Address

- **shadcn Sheet vs. custom SlidePanel:** ARCHITECTURE.md recommends shadcn `Sheet` (Radix Dialog-based); STACK.md notes both options. Before Phase 2 begins, spike both approaches and decide based on whether Sheet's focus-trap behavior conflicts with hub chat input focus management. Custom implementation gives more control; Sheet gives free keyboard/accessibility handling.
- **Agent auto-start timing:** Moving `startAgent()` to AppLayout level changes when the agent starts — it will start on app launch rather than on panel open. Validate this does not cause unexpected resource usage or TTY allocation issues before committing to the pattern.
- **Briefing prompt structure for sections:** The briefing rework depends on the LLM outputting structured sections (Summary, Deadlines, Blockers, Wins). The current prompt may not guarantee this structure. Prompt engineering for the new briefing format should be validated early in Phase 3 before the UI is built around it.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `AppLayout.tsx`, `HubView.tsx`, `OutputDrawer.tsx`, `AgentPanel.tsx`, `BriefingPanel.tsx`, `ProjectDetail.tsx`, `useWorkspaceStore.ts`, `useAgentStore.ts`, `uiSlice.ts`, `package.json`
- shadcn/ui Tailwind v4 migration guide — confirmed `tw-animate-css` as official replacement
- tw-animate-css GitHub — verified CSS import approach
- Tailwind CSS v4 transition docs — verified `transition-discrete` support

### Secondary (MEDIUM confidence)
- Linear UI redesign blog — inverted L-shape navigation, single-focus views, reduction principles
- PatternFly Drawer design guidelines — overlay vs inline drawers, splitter integration
- VS Code custom layout docs — panel maximize/minimize toggle patterns
- The Daily Briefing Dashboard (Medium) — narrative-first briefing, "buffer zone" concept

### Tertiary (cited for context)
- Project memory files: `feedback_zustand_selector_stability.md`, `project_ui_overhaul_v16.md`, `feedback_ux_seamless.md`
- Google CC AI agent, DayStart AI briefing — briefing format inspiration
- Notion peek pages, Things 3 features, Superhuman command palette — competitor UX patterns

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
