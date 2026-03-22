# Phase 9: Embedded Terminal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 09-embedded-terminal
**Areas discussed:** Terminal placement, Session lifecycle, Shell and environment, Visual appearance

---

## Terminal Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Output drawer tab | Add "Terminal" as a third tab next to Logs and History in the existing bottom drawer | ✓ |
| Dedicated bottom panel | Separate from the output drawer — terminal gets its own resizable panel | |
| Side panel (right) | Terminal opens as a vertical split on the right side of the center content | |

**User's choice:** Output drawer tab
**Notes:** Consistent with existing layout, no new panels needed.

### Open Action

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-switch on project select | Drawer opens and switches to Terminal tab on project select | |
| Manual tab click only | Terminal tab always available but never auto-activates | |
| Keyboard shortcut + tab | Tab available via click, plus keyboard shortcut (Ctrl+`) toggles drawer to Terminal tab | ✓ |

**User's choice:** Keyboard shortcut + tab

### Auto-open Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| No auto-open | Drawer doesn't auto-open on project select | |
| Auto-open on first project select | Drawer auto-opens to Terminal tab on first project select in a session | ✓ |

**User's choice:** Auto-open on first project select in a session

---

## Session Lifecycle

### Session Start

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy on tab focus | PTY spawns when user first clicks Terminal tab or uses shortcut | ✓ |
| On project select | PTY spawns immediately when project selected | |
| Manual start button | Terminal tab shows a 'Start Terminal' button | |

**User's choice:** Lazy on tab focus

### Project Switch Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Kill and restart | Switching projects kills current PTY, starts fresh next time | |
| Keep running in background | Old session stays alive, switching back restores it | |
| Prompt the user | Ask 'Terminal is running — kill or keep?' when switching | Initially selected |

**User's choice:** Initially chose "Prompt the user", then revised to "Kill and restart" (simple approach)
**Notes:** User explicitly said "make it so there are no zombie sessions. This can be a later phase, it should be simple to start out with." Revised to kill-on-switch for simplicity.

### No Directory

| Option | Description | Selected |
|--------|-------------|----------|
| Show tab with message | Terminal tab always visible, shows 'Link a directory' message if no directory | ✓ |
| Hide tab entirely | Terminal tab only appears for projects with linked directory | |

**User's choice:** Show tab with message

---

## Shell and Environment

### Shell Selection

| Option | Description | Selected |
|--------|-------------|----------|
| User's default login shell | Read $SHELL env var (macOS/Linux), system default on Windows | ✓ |
| Always zsh/PowerShell | Hardcode per platform | |
| Configurable per-project | Let user pick shell per project in settings | |

**User's choice:** User's default login shell

### Environment Loading

| Option | Description | Selected |
|--------|-------------|----------|
| Login shell with rc files | Spawn as login shell (-l) so .zshrc/.bashrc loaded | ✓ |
| Minimal environment | Spawn without loading rc files | |
| You decide | Claude picks | |

**User's choice:** Login shell with rc files

---

## Visual Appearance

### Theme

| Option | Description | Selected |
|--------|-------------|----------|
| Match Element's dark theme | Terminal colors matched to Element's design tokens | ✓ |
| Classic terminal look | Black background with green/white text | |
| You decide | Claude picks | |

**User's choice:** Match Element's dark theme

### Font

| Option | Description | Selected |
|--------|-------------|----------|
| Good default, no settings | Standard monospace font, no configuration | ✓ |
| Font size only | Default font with Ctrl+/- size adjustment | |
| Full font settings | Font family, size, line height configurable | |

**User's choice:** Good default, no settings

---

## Claude's Discretion

- PTY library choice for Rust backend
- xterm.js addon selection
- Keyboard shortcut binding mechanism
- Scrollback buffer size
- Terminal resize handling
- Copy/paste implementation details

## Deferred Ideas

- Multi-session tabs (TERM-10)
- Session persistence across project switches
- Font customization
- Per-project shell override
