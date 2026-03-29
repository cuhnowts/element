# Phase 21: Central AI Agent - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 21-central-ai-agent
**Areas discussed:** Agent lifecycle, Cross-project awareness, Action classification, Agent identity

---

## Agent Lifecycle

### When should the central agent start running?

| Option | Description | Selected |
|--------|-------------|----------|
| App launch (always on) | Agent terminal session spawns automatically when Element opens. Always available, uses one of the 5 xterm slots permanently. | ✓ |
| First project interaction | Agent spawns the first time user clicks 'Open AI' or a project needs attention. Saves resources until needed. | |
| Manual toggle | User explicitly starts/stops the agent via a button or menu. Full control over when it runs. | |

**User's choice:** App launch (always on)

### Where does the agent terminal live in the UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Global tab in drawer | Agent gets its own permanent tab in the output drawer, separate from per-project terminal tabs. | |
| Sidebar panel | Agent gets a dedicated section in the sidebar. Always visible, doesn't compete with project terminal slots. | ✓ |
| Hidden background | Agent runs invisibly. User only sees it through notifications and an optional 'Agent Log' view. | |

**User's choice:** Sidebar panel

### When the agent crashes or the CLI exits, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-restart with backoff | Agent restarts automatically after a brief delay (2s, 4s, 8s). Max 3 retries before showing an error notification. | ✓ |
| Notify and wait | Show a notification that the agent stopped. User manually restarts via the sidebar panel. | |
| You decide | Claude picks the best recovery strategy during implementation. | |

**User's choice:** Auto-restart with backoff

### Does the agent sidebar panel show raw terminal or structured view?

| Option | Description | Selected |
|--------|-------------|----------|
| Raw terminal (xterm) | Full xterm.js terminal -- user sees exactly what the CLI outputs. | |
| Structured log view | Parsed output showing actions taken, decisions pending, status updates. | |
| Both (tabs) | Two sub-tabs: 'Activity' (structured) and 'Terminal' (raw). | ✓ |

**User's choice:** Both (tabs)

---

## Cross-Project Awareness

### How should the agent access project state?

| Option | Description | Selected |
|--------|-------------|----------|
| MCP server | Element exposes an MCP server that the agent connects to. Clean separation, standard protocol. | ✓ |
| Generated context files | Element periodically writes a state snapshot file that the agent reads. Simple but potentially stale. | |
| Direct DB + file reads | Agent reads SQLite DB and .planning/ files directly. No intermediary but tight coupling. | |

**User's choice:** MCP server (Recommended)

### What scope of tools should the MCP server expose?

| Option | Description | Selected |
|--------|-------------|----------|
| Read + orchestrate | Read project state AND orchestrate actions (spawn sessions, trigger notifications, update status). | ✓ |
| Read only | Agent can only read state. All actions go through the UI. | |
| Read + limited write | Read everything, writes limited to status updates and notifications. | |

**User's choice:** Read + orchestrate

### Should the MCP server be embedded in Tauri or a separate sidecar?

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded in Tauri | Tauri's Rust backend serves MCP over stdio or local socket. No extra process. | |
| Separate sidecar | A standalone MCP server binary shipped alongside the app. More isolated. | ✓ |
| You decide | Claude picks the best hosting approach. | |

**User's choice:** Separate sidecar

---

## Action Classification

### What actions should the agent auto-execute without asking?

| Option | Description | Selected |
|--------|-------------|----------|
| Planning only | Agent can auto-run discuss/plan phases. Execution always requires approval. | |
| Planning + verified execution | Agent can plan AND execute phases with zero human-needed flags. | ✓ |
| Everything except destructive | Agent auto-executes all phases. Only stops for explicit 'human-needed' markers. | |

**User's choice:** Planning + verified execution
**Notes:** User noted this should eventually be a user-configurable decision at app launch, but deferred complexity for now.

### How should the agent request human approval?

| Option | Description | Selected |
|--------|-------------|----------|
| Notification + sidebar action | Agent sends notification. User clicks to see approval in Activity tab. | |
| Modal dialog | A modal pops up showing what the agent wants to do. | |
| Queue in Activity tab | Pending approvals queue with badge count. No interruption. | ✓ |

**User's choice:** Queue in Activity tab

### How should the agent detect that CLI execution needs human input?

| Option | Description | Selected |
|--------|-------------|----------|
| Output pattern matching | Parse terminal output for known patterns. | |
| Exit code convention | CLI exits with specific codes (0=success, 1=error, 2=human-needed). | |
| MCP callback | Agent calls 'report_status' tool to signal completion/failure/blocked. Self-reporting. | ✓ |

**User's choice:** MCP callback

---

## Agent Identity

### What CLI tool should power the central agent?

| Option | Description | Selected |
|--------|-------------|----------|
| Same configured CLI tool | Uses whatever the user set in Settings > AI. Different system prompt and MCP config. | ✓ |
| Hardcoded Claude Code | Central agent always uses Claude Code specifically. | |
| Custom agent script | Element ships a small orchestrator script wrapping the configured CLI. | |

**User's choice:** Same configured CLI tool

### How does the central agent relate to per-project AI sessions?

| Option | Description | Selected |
|--------|-------------|----------|
| Agent spawns project sessions | Central agent uses MCP tools to spawn a new named terminal session, pre-loaded with context. | ✓ |
| Agent writes context, UI spawns | Agent prepares context file. UI spawns terminal session as today. | |
| Agent takes over project terminal | Agent itself starts working on that project in its sidebar panel. | |

**User's choice:** Agent spawns project sessions

### How should the agent receive its system prompt and MCP configuration?

| Option | Description | Selected |
|--------|-------------|----------|
| Generated config files | Element generates CLAUDE.md + MCP config at launch. Easy to inspect and debug. | ✓ |
| Inline via CLI args | System prompt and MCP server address passed as CLI arguments. | |
| You decide | Claude picks the best config delivery approach. | |

**User's choice:** Generated config files

---

## Claude's Discretion

- Activity tab structure and information density
- MCP server communication protocol (stdio vs local socket)
- Specific MCP tool signatures and response formats
- Agent system prompt content and orchestration loop design

## Deferred Ideas

- User-configurable risk tiers for auto-execute (noted during action classification)
