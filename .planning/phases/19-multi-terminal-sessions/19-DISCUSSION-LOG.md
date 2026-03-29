# Phase 19: Multi-Terminal Sessions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 19-multi-terminal-sessions
**Areas discussed:** Session lifecycle, Tab bar design, Per-project isolation, PTY cleanup

---

## Session Lifecycle

### Open AI behavior with existing sessions

| Option | Description | Selected |
|--------|-------------|----------|
| Always create new | Spawn a new named session alongside existing ones | |
| Reuse if AI session exists | Reuse existing AI session, only create if none exists | |
| Ask user each time | Prompt reuse vs create on every click | |
| Custom | Prompt "Refresh context? You will lose all current memory." if AI session exists | ✓ |

**User's choice:** Custom — If AI session exists, prompt "Refresh context? You will lose all current memory." with options to refresh or keep. If no AI session, create new without prompting.
**Notes:** User wants to acknowledge that Claude Code sessions have memory/context that would be lost.

### Creating non-AI sessions

| Option | Description | Selected |
|--------|-------------|----------|
| "+" button on tab bar | Small + icon, creates plain shell with auto-generated name | ✓ |
| "+" button with name prompt | Same + but pops input for naming | |
| Right-click context menu | Right-click for "New Session" option | |

**User's choice:** "+" button on tab bar
**Notes:** None

### Session limits

| Option | Description | Selected |
|--------|-------------|----------|
| No hard limit | Users create as many as they want, tab bar scrolls | ✓ |
| Soft limit with warning | Warning after N sessions | |
| Hard limit of 5 | Cap at 5 per project | |

**User's choice:** No hard limit
**Notes:** None

### Session naming

| Option | Description | Selected |
|--------|-------------|----------|
| "AI Planning" / "AI Progress" | Name reflects AI button state | |
| Always "AI" | Static label, append number for multiples | |
| Custom | Specific names based on actual work — phase names, command names | ✓ |

**User's choice:** Custom — Names should be specific and descriptive. AI sessions named after phases (e.g., "Phase 19: Multi-Terminal") or commands (e.g., "GSD Manager", "Dev Server", "Caffeine"). Not generic labels.
**Notes:** User emphasized "the names are key" — this is a high-priority UX detail.

---

## Tab Bar Design

### Tab placement

| Option | Description | Selected |
|--------|-------------|----------|
| Replace Terminal tab with session sub-tabs | Terminal drawer tab becomes container, session tabs as sub-row | ✓ |
| Session tabs as top-level drawer tabs | Each session alongside Logs/History | |
| Separate terminal panel | Terminal gets own panel outside drawer | |

**User's choice:** Replace Terminal tab with session sub-tabs
**Notes:** User selected the preview showing two-tier layout: drawer tabs on top, session tabs below.

### Close button behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Close immediately | Click x kills PTY, no confirmation | ✓ |
| Confirm if process running | Show warning if foreground process active | |

**User's choice:** Close immediately
**Notes:** None

### Shell exit behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Show "exited" and keep tab | Tab stays with visual indicator | |
| Auto-remove after delay | Tab auto-closes after ~3 seconds | ✓ |
| Auto-remove immediately | Tab disappears instantly | |

**User's choice:** Auto-remove tab after delay
**Notes:** None

### Tab overflow

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal scroll | Tabs scroll with subtle indicators | ✓ |
| Dropdown overflow | Show first N tabs, "..." for rest | |

**User's choice:** Horizontal scroll
**Notes:** None

---

## Per-Project Isolation

### Project switch behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Keep running, hide UI | PTYs run in background, tab bar swaps to new project | ✓ |
| Keep running, show all | All sessions from all projects visible | |
| Suspend and restore | Pause PTY output on switch | |

**User's choice:** Keep running, hide UI
**Notes:** None

### Background activity indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Dot/badge on sidebar project | Small indicator next to projects with running sessions | ✓ |
| No indicator | No visibility into background activity | |

**User's choice:** Dot/badge on sidebar project
**Notes:** None

### Unlink/remove behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Kill all sessions immediately | Clean break, all PTYs terminated | ✓ |
| Orphan sessions with warning | Sessions keep running with warning banner | |

**User's choice:** Kill all sessions immediately
**Notes:** None

---

## PTY Cleanup

### SIGTERM to SIGKILL timeout

| Option | Description | Selected |
|--------|-------------|----------|
| 3 seconds | SIGTERM, wait 3s, SIGKILL | ✓ |
| 5 seconds | More generous timeout | |

**User's choice:** 3 seconds
**Notes:** Meets TERM-04 requirement with margin.

### App quit cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit cleanup on quit | Iterate all sessions, run SIGTERM/SIGKILL sequence | ✓ |
| Let OS handle it | Rely on OS child process cleanup | |

**User's choice:** Explicit cleanup on quit
**Notes:** None

---

## Claude's Discretion

- Zustand store structure for multi-session state
- Session ID generation approach
- Terminal tab sub-row styling and active indicator design
- Exact auto-remove delay timing and animation
- Scroll indicator appearance for tab overflow

## Deferred Ideas

None — discussion stayed within phase scope.
