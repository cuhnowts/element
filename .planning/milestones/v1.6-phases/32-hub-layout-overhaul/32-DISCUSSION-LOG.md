# Phase 32: Hub Layout Overhaul - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 32-hub-layout-overhaul
**Areas discussed:** Panel trigger UI, Slide-in behavior, Center view composition, Panel persistence

---

## Panel Trigger UI

### Toggle mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Toolbar icon buttons | Horizontal toolbar at top of hub with icon+label toggle buttons. Active state visually indicated. | ✓ |
| Side ribbons (current pattern) | Vertical MinimizedColumn ribbons on collapsed sides, toggling overlays | |
| Toolbar + keyboard shortcuts | Toolbar buttons plus Cmd+1/2/3 shortcuts | |

**User's choice:** Toolbar icon buttons
**Notes:** No keyboard shortcuts needed initially.

### Toolbar location

| Option | Description | Selected |
|--------|-------------|----------|
| Top of hub view | Dedicated toolbar row at top of HubView, below app title bar | ✓ |
| Integrated into center header | Buttons embedded in center panel header row | |

**User's choice:** Top of hub view

### Button active state

| Option | Description | Selected |
|--------|-------------|----------|
| Filled background when active | Active button gets filled/accent background (like shadcn Toggle) | ✓ |
| Underline indicator | Active button gets an underline/bottom border | |
| You decide | Claude picks | |

**User's choice:** Filled background when active

---

## Slide-in Behavior

### Overlay vs push

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay | Panels float on top of center content with shadow. No reflow. | ✓ |
| Push/shrink center | Opening a panel compresses the center view. Content reflows. | |

**User's choice:** Overlay

### Panel sides

| Option | Description | Selected |
|--------|-------------|----------|
| Calendar left, Goals right | Calendar slides from left edge, Goals from right edge | ✓ |

**User's choice:** Calendar left, Goals right
**Notes:** User clarified the arrangement: "Calendar left, center, then goals" — reversing the initially proposed Goals-left/Calendar-right.

### Dismiss behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Toolbar button only | Panels stay open until explicitly toggled off | ✓ |
| Click outside dismisses | Clicking center area closes panel | |

**User's choice:** Toolbar button only

### Multi-panel

| Option | Description | Selected |
|--------|-------------|----------|
| Both allowed simultaneously | Calendar left + Goals right can coexist | ✓ |
| One at a time | Opening one auto-closes the other | |

**User's choice:** Both allowed simultaneously

---

## Center View Composition

### Default center content

| Option | Description | Selected |
|--------|-------------|----------|
| Chat only | Full-width hub chat as primary interface | |
| Briefing + Chat (current) | BriefingPanel pinned at top, HubChat below | |
| Chat with briefing inline | Briefing appears as special message/card in chat stream | ✓ |

**User's choice:** Chat with briefing inline in messages
**Notes:** User then provided detailed vision for center view as a command hub:
1. Greeting + brief day pulse at top
2. Action buttons (Run Daily Briefing, Organize Calendar, Organize Goals) acting like /gsd commands
3. Chat output below — action results drop into the stream
4. Jump-to-top button for navigation

User specified: "please document those things for a later milestone, but ensure you are creating the UI in that way." Full skill wiring is future — Phase 32 builds the UI structure.

### Toolbar buttons

| Option | Description | Selected |
|--------|-------------|----------|
| Two buttons only (Cal + Goals) | Briefing handled by center action buttons, toolbar has only panel toggles | ✓ |

**User's choice:** Two buttons (Calendar + Goals)
**Notes:** Briefing is no longer a slide-in panel — it's an action button in the center command hub.

---

## Panel Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Always start closed | Hub opens with just center view. Panels opened on demand. | ✓ |
| Remember last state | Persist open/closed via Zustand persist | |

**User's choice:** Always start closed

---

## Claude's Discretion

- Panel overlay width
- CSS animation duration and easing
- Shadow/backdrop styling
- Greeting text and day pulse approach
- Action button visual styling
- Jump-to-top button placement

## Deferred Ideas

- Full skill wiring for action buttons (future milestone)
- Dynamic action button registry
- Day pulse generation from real project data
- Greeting personalization
