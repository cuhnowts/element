# Phase 32: Hub Layout Overhaul - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the 3-column resizable hub layout with a single full-width center view and opt-in slide-in overlay panels. The center view becomes a command hub with greeting, action buttons, and chat output. Calendar and Goals are overlay panels toggled from a top bar.

</domain>

<decisions>
## Implementation Decisions

### Panel Toggle UI
- **D-01:** Top toggle bar at the top of HubView (below app title bar) with two buttons: Calendar and Goals. No Briefing button — briefing is triggered from the center action buttons.
- **D-02:** Toggle buttons use filled/accent background when active, ghost/outline when inactive. Multiple can be active simultaneously.

### Slide-in Behavior
- **D-03:** Panels are overlays that float on top of center content with shadow. Center view stays full-width underneath — no reflow or compression.
- **D-04:** Calendar panel slides in from the left edge. Goals panel slides in from the right edge.
- **D-05:** Both panels can be open simultaneously (Calendar left + Goals right).
- **D-06:** Panels are dismissed only via the toolbar toggle button — clicking in the center area does not close them.
- **D-07:** Animations use CSS transforms per HUB-05 requirement.

### Center View Composition
- **D-08:** Center view is a command hub, not just a chat window. Structure from top to bottom:
  1. **Greeting + day pulse** — "Good morning" + brief summary of the day (busy/light, things needing attention — a pulse, not details)
  2. **Action buttons** — Skill-trigger buttons like "Run Daily Briefing", "Organize Calendar", "Organize Goals". These act like `/gsd` slash commands.
  3. **Chat output area** — When an action button is clicked, its output drops into the chat stream below the action buttons.
  4. **Jump-to-top button** — Quick navigation back to the greeting + action buttons after scrolling through chat output.
- **D-09:** The briefing toolbar button from HUB-04 is replaced by the "Run Daily Briefing" action button in the center view. The requirement is satisfied — briefing is accessible from the hub, just not as a slide-in panel.

### Panel Persistence
- **D-10:** Panels always start closed on hub load. No persistence of open/closed state across sessions. Clean starting state every time.

### Claude's Discretion
- Panel overlay width (reasonable default, likely ~300-350px)
- Exact CSS transform animation duration and easing
- Shadow/backdrop styling for overlay panels
- Greeting text source and day pulse generation approach
- Action button visual styling (cards, pills, etc.)
- Jump-to-top button placement and style

### Future Milestone Items (Deferred — build UI structure now)
- Full skill wiring: action buttons triggering real `/gsd`-style commands (Run Briefing, Organize Calendar, Organize Goals)
- Dynamic action button registry (user-configurable commands)
- Day pulse generation from real project data
- Greeting personalization

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — HUB-01 through HUB-05 define the acceptance criteria for this phase

### Existing Hub Code
- `src/components/center/HubView.tsx` — Current 3-column ResizablePanelGroup to be replaced
- `src/components/hub/HubCenterPanel.tsx` — Current BriefingPanel + HubChat composition
- `src/components/hub/MinimizedColumn.tsx` — Current collapse/expand ribbons (to be removed)
- `src/components/hub/GoalsTreePanel.tsx` — Goals tree content (reused in Goals overlay panel)
- `src/components/hub/calendar/HubCalendar.tsx` — Calendar content (reused in Calendar overlay panel)
- `src/components/hub/HubChat.tsx` — Chat component (reused in center view chat area)
- `src/components/hub/BriefingPanel.tsx` — Current briefing (replaced by inline action button approach)
- `src/stores/useWorkspaceStore.ts` — HubLayout interface and Zustand persist (needs update)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GoalsTreePanel` — Full goals tree component, can be dropped into overlay panel as-is
- `HubCalendar` — Full calendar component, can be dropped into overlay panel as-is
- `HubChat` — Chat component for the center view chat output area
- `BriefingPanel` / `BriefingContent` / `BriefingGreeting` — Existing briefing components to reference for the greeting + day pulse pattern
- shadcn `Button` with `variant="ghost"` / `variant="default"` — toggle button active/inactive states
- Tailwind `translate-x`, `transition`, `shadow-lg` — CSS transform animations for slide-in

### Established Patterns
- Zustand with `persist` middleware for UI state (useWorkspaceStore)
- shadcn/ui + Tailwind CSS for all components
- `react-resizable-panels` currently used but will be removed from HubView (still used elsewhere)

### Integration Points
- `CenterPanel.tsx` renders `HubView` when on hub route — entry point unchanged
- `useWorkspaceStore` — HubLayout interface needs simplification (remove panel sizes, add overlay open/closed booleans, but no persistence needed since always-start-closed)

</code_context>

<specifics>
## Specific Ideas

- Center view should feel like a **command hub** — greeting, action buttons, then chat output flowing below
- Action buttons are modeled after `/gsd` slash commands — each triggers a specific skill/action
- The "jump to top" button provides quick navigation back to the command area after scrolling through chat output
- Day pulse is a brief, non-detailed summary: "Light day today" or "Busy day — 2 things need moved" — not a full briefing

</specifics>

<deferred>
## Deferred Ideas

- **Full skill wiring for action buttons** — Connect "Run Daily Briefing", "Organize Calendar", "Organize Goals" to real backend commands. Phase 32 builds the UI structure with placeholder/static action buttons; a future milestone wires them to actual skill execution.
- **Dynamic action button registry** — Let users configure which action buttons appear in the command hub.
- **Day pulse from real data** — Generate the greeting summary from actual project/calendar state.

</deferred>

---

*Phase: 32-hub-layout-overhaul*
*Context gathered: 2026-04-04*
