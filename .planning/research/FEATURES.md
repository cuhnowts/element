# Feature Research

**Domain:** Desktop productivity app UI overhaul -- hub dashboards, goal-first project views, briefing UX, drawer/panel patterns
**Researched:** 2026-04-04
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a modern desktop productivity app. Missing these makes the product feel unpolished or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single-view hub with no forced horizontal scroll | Linear, Notion, Things all use a single center column as the primary view. 3-column horizontal layouts feel like spreadsheets, not command centers. Users expect a focused center with optional peripherals. | MEDIUM | Current HubView uses `ResizablePanelGroup` with 3 mandatory columns (goals, briefing, calendar). Replace with single center view. Goals/calendar become opt-in slide-in overlay panels. |
| Click-to-toggle drawer minimize/maximize | VS Code, every IDE, and most desktop apps with bottom panels use a single click to toggle between minimized (header-only bar) and expanded states. Current "Hide Output"/"Show Output" text button is functional but not spatial. | LOW | Replace text toggle with a chevron or grip bar. Click header bar = toggle. Drag handle = resize. Two distinct interactions. Existing `toggleDrawer` and `drawerOpen` in workspace store already support this. |
| Keyboard shortcut for drawer toggle | VS Code uses Ctrl+\`, Superhuman makes everything keyboard-accessible. Power users expect panel toggles to have shortcuts. | LOW | Wire to existing Tauri hotkey system. Cmd+J (VS Code convention for bottom panel) is the natural choice. |
| Scannable briefing with visual hierarchy | Google CC, DayStart, BriefingAM all present AI summaries with clear sections, bold headings, and visual separation. A wall of markdown text is not a briefing -- it is a blog post. | MEDIUM | Current `BriefingContent` renders raw markdown from LLM output. Needs structured sections: top-line summary (1-2 sentences), then categorized blocks (deadlines, blockers, progress). Think newspaper front page, not essay. |
| On-demand briefing generation | Users expect to control when expensive AI operations run. Auto-generating on every hub load (current 30-min stale check in `BriefingPanel` useEffect) feels wasteful and slow on first open. | LOW | Change from auto-generate to show-last-cached on load, with prominent "Generate Briefing" button. Keep cache. Remove the auto-trigger in the useEffect. Existing `requestBriefing` store action supports this. |
| Project detail shows goal/purpose prominently | Things 3 leads with the project purpose. Linear shows project description at top. Users opening a project need to immediately see WHY this project exists, not just its task list. | LOW | Current ProjectDetail shows: name > AI button + directory > progress bar > description textarea > metadata > phases. Elevate description/goal to a styled hero statement below the name. Pull from `.planning/PROJECT.md` core value if available. |
| Drawer tab for AI panel | Consolidating AI from right sidebar into bottom drawer is expected -- VS Code puts all auxiliary panels in the bottom/side panel system. Having a separate right sidebar for AI feels inconsistent when terminal is already in the drawer. | MEDIUM | Add "AI" tab to `DrawerHeader` tabs (currently: Terminal, Logs, History). Move agent panel content into drawer. Remove right sidebar. Existing `OutputDrawer` tab-switching infrastructure handles this cleanly. |
| Smooth slide-in animation for panels | Notion peek pages, Linear detail overlays, and macOS system panels all animate in/out. Abrupt show/hide feels broken in 2026. | LOW | Use CSS transitions (transform + opacity) on slide-in panels. 200-250ms ease-out. Tailwind `transition-transform duration-200` on the panel container. |

### Differentiators (Competitive Advantage)

Features that set Element apart from Linear, Notion, and Things. Not required, but create the "this feels different" reaction.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Goal-first project detail with .planning integration | No competitor shows the project's goal, current milestone, and AI-generated roadmap as the first thing you see. Linear shows issues. Notion shows databases. Things shows tasks. Element can show the WHY before the WHAT -- pulling live data from `.planning/PROJECT.md` and `ROADMAP.md`. | MEDIUM | Parse `Core Value`, `Current Milestone`, and active requirements from PROJECT.md. Display as a styled card above phases. Already have `.planning/` sync infrastructure from v1.2 (`syncPlanningRoadmap`, file watcher). |
| Briefing as narrative command center | Google CC and DayStart prove AI briefings work but they are separate apps. Element embeds the briefing directly into the hub with contextual structure -- the daily briefing dashboard article calls this the "buffer zone" pattern: sorted priorities, clear blockers, drafted next-actions. The key insight: "lead with narrative, not data." | MEDIUM | Restyle the briefing output to use structured prompt engineering (instruct LLM to output sections: Summary, Deadlines, Blockers, Wins). Render each section as a visually distinct card. No entity linking yet -- that comes later. |
| Hub slide-in panels (goals tree, calendar) as overlays | Instead of fixed columns that compete for space, goals and calendar slide in from left/right as overlay panels. User sees full-width center by default, pulls in context panels when needed. Notion's side peek proves this pattern works. | MEDIUM | Implement as fixed-position overlays with subtle backdrop dim. Toggle via icon buttons in hub header bar. Store open/closed state in `useWorkspaceStore.hubLayout`. Replace current `ResizablePanelGroup` approach entirely. |
| Drawer grip bar with resize memory | VS Code remembers panel height. Most apps forget. Element should remember drawer height per-context (hub vs project) and restore it on view switch. The grip bar itself should be a visible drag handle. | LOW | Store `drawerHeight` in workspace store keyed by view type. Apply on mount. Use existing `react-resizable-panels` resize callbacks. |
| Unified workspace entry on project detail | Instead of separate "Open AI" button + "Directory Link" + terminal sessions scattered across the view, present a single "Workspace" card that shows: linked directory, terminal status (N active sessions), and AI action button. One coherent block. | LOW | Group existing `OpenAiButton`, `DirectoryLink`, and `useTerminalSessionStore` session count into a styled card component. No new backend work. Pure layout consolidation. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems in Element's context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multi-column resizable hub (keep current layout) | "Let me customize my layout" -- power user appeal. | 3 equal columns force content into narrow widths, create horizontal scroll on smaller screens, and make the briefing unreadable. Linear and Superhuman prove single-focus views with opt-in detail win. ResizablePanelGroup drag handles add friction. | Single center view with slide-in overlay panels. Full width by default, pull in context when needed. |
| Auto-playing briefing animation/streaming | "Show the AI thinking in real-time" -- feels futuristic. | Streaming text is distracting when you want to scan. User wants the answer, not the process. Streaming is fine for chat; briefings should appear complete and scannable. | Generate in background, show skeleton loader, reveal complete briefing. Keep streaming for hub chat only. |
| Drag-to-rearrange hub sections | "Let me put calendar above briefing." | Adds DnD complexity for minimal value. Hub sections have a natural hierarchy (greeting > briefing > chat). Rearranging breaks designed flow and creates layout bugs. | Fixed section order with show/hide toggles for optional sections. |
| Full-page project overview with tabs | "Give me a Notion-style page with sub-pages." | Projects in Element are workspaces, not documents. A tabbed overview (Overview / Tasks / Files / Terminal) adds navigation layers. The current scroll-down approach is simpler. | Keep single scrollable project detail. Add goal card at top, phases below. Workspace stays in drawer. |
| Right sidebar for AI agent (keep current) | "I want AI visible while working on tasks." | Right sidebar competes for horizontal space. On a typical 1440px laptop: sidebar + center + left nav = cramped center. Bottom drawer gives AI the full screen width. | AI panel as bottom drawer tab. Full-width AI conversations. Toggle with Cmd+J. |
| Notion-style peek/overlay for everything | "Let me peek into any item without navigating." | Over-engineering for v1.6. Peek modals for tasks/phases add complexity without clear value when the task detail sidebar already exists. | Keep task detail in existing right panel. Use slide-in overlays only for hub panels (goals, calendar). |

## Feature Dependencies

```
[Hub single-view layout]
    |
    +--requires--> [Slide-in panel infrastructure]
    |                  |
    |                  +--requires--> [Panel open/closed state in hubLayout store]
    |
    +--enhances--> [Briefing restyle]
                       |
                       +--enhances--> [Interactive briefing with entity links] (v1.7+)

[Drawer click-to-toggle]
    |
    +--requires--> [Drawer minimize state]  (exists: drawerOpen in workspaceStore)
    |
    +--enhances--> [AI panel in drawer]
                       |
                       +--requires--> [Move agent panel from right sidebar to drawer tab]

[Goal-first project detail]
    |
    +--requires--> [.planning/PROJECT.md parsing]  (exists: planning sync from v1.2)
    |
    +--independent--> [Workspace entry consolidation]

[Briefing restyle]
    +--independent--> [On-demand generation toggle]

[Calendar "Today" fix]  -- independent, pure bug fix
[Deterministic overdue detection]  -- independent, query logic change
[Workflows minimizable]  -- independent, collapsible section
```

### Dependency Notes

- **Hub single-view requires slide-in panel infrastructure first:** Removing the 3-column `ResizablePanelGroup` without an alternative for goals/calendar would lose functionality. Build slide-in panels before or simultaneously with layout change.
- **AI panel in drawer requires drawer tab addition:** The `DrawerHeader` tab system is already built (Terminal, Logs, History). Adding "AI" tab is straightforward. Moving agent panel content is the real work -- extracting it from the right sidebar component.
- **Goal-first project detail reuses existing .planning/ sync:** The `syncPlanningRoadmap` and file watcher from v1.2 already pull PROJECT.md data. This feature needs a display component, not new backend work.
- **Briefing restyle is independent of hub layout:** Can be done before or after the hub layout change. The briefing component (`BriefingPanel`) is self-contained.
- **Bug fixes are fully independent:** Calendar "Today" label, overdue detection, and workflows collapsible can ship in any phase without dependencies.

## MVP Definition

### Ship in v1.6 (Core Clarity Goals)

- [ ] **Hub single-view layout** -- replace 3-column `ResizablePanelGroup` with center-focused view
- [ ] **Hub slide-in panels** -- goals tree and calendar as overlay panels toggled by header icons
- [ ] **Briefing restyle** -- structured sections with visual hierarchy, not raw markdown wall
- [ ] **On-demand briefing** -- cached display on load, explicit generate button, no auto-trigger
- [ ] **Drawer click-to-toggle** -- grip bar or chevron, click header = toggle, visual minimize state
- [ ] **AI panel in drawer** -- move from right sidebar to bottom drawer tab
- [ ] **Goal-first project detail** -- goal/purpose card at top of project view
- [ ] **Workspace entry consolidation** -- group AI button, directory link, session indicator
- [ ] **Calendar "Today" label fix** -- bug fix, only show on actual today
- [ ] **Deterministic overdue detection** -- `due_date < today AND status != complete`, not LLM
- [ ] **Workflows section minimizable** -- collapsible when not in use

### Add After Validation (v1.6.x)

- [ ] **Keyboard shortcuts for panel toggles** -- Cmd+J for drawer, Cmd+B for goals panel
- [ ] **Drawer height memory per context** -- store and restore drawer height for hub vs project views
- [ ] **Briefing section collapse/expand** -- let users collapse individual briefing sections

### Future Consideration (v1.7+)

- [ ] **Interactive briefing with entity links** -- click project/task mentions to navigate
- [ ] **Briefing scheduling** -- configure when briefing auto-generates (morning, on-demand, custom)
- [ ] **Hub quick-action cards** -- actionable cards in briefing (approve, reschedule, dismiss)
- [ ] **Project detail peek panels** -- side-peek for files/terminal from project detail

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Hub single-view layout | HIGH | MEDIUM | P1 |
| Slide-in panels (goals, calendar) | HIGH | MEDIUM | P1 |
| Briefing restyle (visual hierarchy) | HIGH | MEDIUM | P1 |
| On-demand briefing generation | MEDIUM | LOW | P1 |
| Drawer click-to-toggle | MEDIUM | LOW | P1 |
| AI panel in drawer | HIGH | MEDIUM | P1 |
| Goal-first project detail | HIGH | LOW | P1 |
| Workspace entry consolidation | MEDIUM | LOW | P1 |
| Calendar "Today" label fix | MEDIUM | LOW | P1 |
| Deterministic overdue detection | HIGH | LOW | P1 |
| Workflows minimizable | LOW | LOW | P1 |
| Keyboard shortcuts for panels | MEDIUM | LOW | P2 |
| Drawer height memory | LOW | LOW | P2 |
| Briefing section collapse | LOW | LOW | P2 |
| Interactive briefing links | HIGH | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.6 -- directly serves "Clarity" milestone goal
- P2: Should have, add in polish phase or v1.6.x patch
- P3: Nice to have, defer to future milestone

## Competitor Feature Analysis

| Feature | Linear | Notion | Things 3 | Superhuman | Element v1.6 |
|---------|--------|--------|-----------|------------|--------------|
| Dashboard layout | Single list/board view, inverted L-shape nav. No multi-column dashboard. | Flexible database views, custom dashboards. Complexity is the point. | Single "Today" list with calendar events integrated at top. | Single inbox view, zero chrome, nothing competes for attention. | **Single center view with opt-in slide-in overlay panels.** Full width by default, context on demand. |
| Goal/project overview | Project description + status header. Functional, not prominent. | Page with properties, endlessly flexible but unstructured. | Project pie-chart progress icon, goal text in project description. | N/A (email client). | **Goal card from .planning with milestone, core value, progress.** The WHY before the WHAT. |
| Daily summary/briefing | No native briefing. | No native briefing. | "Today" view with due items -- list, not narrative. | AI summaries per email thread, not a daily briefing. | **AI-generated narrative briefing with structured sections** -- summary, deadlines, blockers, wins. |
| Panel/detail overlays | Side panel for issue meta-properties. Minimal. | Side peek, center peek, full page -- 3 modes with toggle. | Inline expansion in list, no overlays. | Split view (list + detail), keyboard-driven. | **Slide-in overlay panels for goals/calendar.** Single mode, simple toggle. |
| Bottom drawer/panel | N/A (web app, no terminal). | N/A (web app). | N/A (task app). | N/A (email client). | **Terminal + logs + AI in resizable bottom drawer** with grip bar, click-to-toggle, height memory. |
| Keyboard-first UX | Full keyboard nav, Cmd+K. | Partial (Cmd+K, some shortcuts). | Keyboard shortcuts for core actions. | Everything keyboard-driven, Cmd+K universal palette. | **Keyboard shortcuts for panel toggles + existing hotkeys.** Cmd+J for drawer. |

**Element's unique position:** The combination of AI briefing + goal-first projects + embedded terminal workspace does not exist in any competitor. Linear is for teams. Notion is for documents. Things is for personal tasks. Superhuman is for email. Element is for personal project orchestration with AI -- the gap is real and none of these competitors are moving toward it.

## Sources

- [Linear UI redesign (Part II)](https://linear.app/now/how-we-redesigned-the-linear-ui) -- inverted L-shape navigation, panel alignment, reduction principles
- [Linear dashboard best practices](https://linear.app/now/dashboards-best-practices) -- dashboard layout guidance
- [Notion peek pages guide](https://www.sparxno.com/blog/peek-pages-notion) -- side peek, center peek, full page modes
- [Notion sidebar UI breakdown](https://medium.com/@quickmasum/ui-breakdown-of-notions-sidebar-2121364ec78d) -- sidebar navigation patterns
- [Things 3 features](https://culturedcode.com/things/features/) -- Today view, project progress pie charts
- [Superhuman command palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/) -- keyboard-first UX philosophy
- [PatternFly Drawer design guidelines](https://www.patternfly.org/components/drawer/design-guidelines/) -- overlay vs inline drawers, primary-detail patterns, splitter integration
- [VS Code custom layout docs](https://code.visualstudio.com/docs/configure/custom-layout) -- panel maximize/minimize toggle patterns
- [The Daily Briefing Dashboard (Dominique Dias)](https://medium.com/@dormenique/the-daily-briefing-dashboard-you-need-a-command-center-8b200459db60) -- narrative-first briefing, "buffer zone" concept, input station pattern
- [Google CC AI agent](https://blog.google/technology/google-labs/cc-ai-agent/) -- "Your Day Ahead" morning briefing as synthesized summary
- [DayStart AI briefing](https://apps.apple.com/us/app/daystart-ai-morning-briefing/id6751055528) -- 3-minute structured morning briefing format
- [Linear design trend (LogRocket)](https://blog.logrocket.com/ux-design/linear-design/) -- minimalist SaaS aesthetic, content-first layout
- Element codebase: `src/components/center/HubView.tsx` (current 3-column ResizablePanelGroup)
- Element codebase: `src/components/center/ProjectDetail.tsx` (current project detail layout)
- Element codebase: `src/components/layout/OutputDrawer.tsx` (current drawer with tab system)
- Element codebase: `src/components/output/DrawerHeader.tsx` (current toggle and tab UI)
- Element codebase: `src/components/hub/BriefingPanel.tsx` (current auto-generate briefing)

---
*Feature research for: Element v1.6 Clarity -- hub, project, briefing, drawer UI overhaul*
*Researched: 2026-04-04*
