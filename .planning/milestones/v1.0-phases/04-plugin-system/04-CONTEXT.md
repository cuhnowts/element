# Phase 4: Plugin System - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend Element with a file-drop plugin system, secure credential management, core connectors (shell, HTTP, file system), and calendar integration (Google/Outlook). Users can install plugins by dropping folders into a directory, manage API keys in a vault, use built-in workflow step types, and see calendar events in the existing calendar panel. Plugin marketplace, Pulse ingestion, and AI-assisted features are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Plugin manifest & lifecycle
- Plugins are single folders with a manifest file + plugin code files — simple, inspectable, version-controllable
- Plugin Host uses FS watcher for hot-reload — detects changes and auto-reloads plugins (great for development)
- Failed plugins show in the plugin list with an error badge and details — app continues normally, user can fix and reload
- Capability-based permission model: manifest declares needed capabilities (e.g., 'network', 'fs:read', 'credentials'). Plugin Host enforces boundaries at runtime
- Aligns with ARCHITECTURE.md: plugins cannot access raw IPC or DB, only the defined Plugin API surface

### Credential storage
- Dedicated 'Credentials' section in app settings — vault-style UI for adding/editing/deleting named credentials
- Secrets stored in OS keychain (macOS Keychain / Windows Credential Manager) via Tauri's secure storage
- Named credential model: user creates credentials (e.g., 'Google API Key'), plugin manifest declares which credential names it requires, Plugin Host provides only declared credentials
- Vault UI supports reveal (temporary unmask) and copy-to-clipboard buttons — standard 1Password/Bitwarden pattern

### Core plugin behavior
- Shell command plugin: unrestricted command execution with warning icon on shell steps. This is a power-user desktop app — trust the user
- Data passing between workflow steps: structured JSON documents. Each step outputs a typed document, next step receives it as input. Aligns with BSD-style piping model from PROJECT.md
- HTTP request plugin: full HTTP client — method, URL, headers, body, auth, timeout. Like Postman in a workflow step
- File system plugin: read, write, list, and watch capabilities. Scoped to user-configured paths for safety

### Calendar integration
- OAuth flow via in-app browser popup (Tauri webview) — capture token, store in credential vault
- Full event details displayed in the existing Phase 2 calendar panel: title, time, location, attendees, description. Events are read-only
- Background poll every 5 minutes for sync, plus manual refresh button. Balances freshness vs API quota
- Multiple calendar accounts supported, each color-coded in the calendar panel. Common need for work + personal calendars

### Claude's Discretion
- Plugin manifest schema specifics (exact fields, validation rules)
- Plugin API surface design (trait definitions, method signatures)
- Sandbox implementation approach (process isolation vs capability restriction)
- Calendar event caching strategy in SQLite
- Credential vault UI layout details
- Core plugin step configuration UI

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.planning/research/ARCHITECTURE.md` — Plugin Host component design (FS watcher + sandbox loader), component boundaries, Plugin API surface rules, data flow
- `.planning/research/PITFALLS.md` — Plugin security boundaries, scope creep warnings

### Stack and patterns
- `.planning/research/STACK.md` — Tauri 2.x secure storage APIs, Rust backend patterns, React 19 frontend
- `.planning/research/SUMMARY.md` — Research synthesis, architecture rationale

### Requirements and project
- `.planning/REQUIREMENTS.md` — PLUG-01 through PLUG-04 define exact capabilities this phase delivers
- `.planning/PROJECT.md` — File-based plugin system constraint, open source core + paid plugins business model, local-first data

### Prior phase context
- `.planning/phases/01-desktop-shell-and-task-foundation/01-CONTEXT.md` — Data model decisions, SQLite layer, Tauri IPC patterns
- `.planning/phases/02-task-ui-and-execution-history/02-CONTEXT.md` — Calendar panel layout, multi-panel workspace where calendar events will display

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No plugin-related code exists yet — greenfield for plugin system
- Phase 1 will establish: SQLite data layer, Tauri IPC commands, Rust backend structure
- Phase 2 will establish: calendar panel UI component where calendar events will render
- Phase 3 will establish: workflow engine, step execution, shell/HTTP execution patterns that core plugins formalize

### Established Patterns
- Tauri 2.x secure storage for OS keychain integration (credential vault backend)
- Tauri IPC (invoke/events) for all frontend-backend communication
- Zustand for frontend state management (plugin state, credential state)
- shadcn/ui for consistent UI components (vault UI, plugin management UI)

### Integration Points
- Plugin Host integrates with Workflow Engine to register new step types
- Credential vault integrates with OS keychain via Tauri secure storage API
- Calendar plugin feeds events into the Phase 2 calendar panel component
- Plugin manifest permissions checked against the Plugin API surface defined in ARCHITECTURE.md

</code_context>

<specifics>
## Specific Ideas

- Plugin folder structure mirrors the "drop files in a directory" constraint from PROJECT.md — users should be able to git clone a plugin repo into the plugins folder and it just works
- Core plugins (shell, HTTP, FS) ship built-in but follow the same manifest/API pattern as user plugins — they're reference implementations
- Credential vault UX inspired by 1Password/Bitwarden — masked values with reveal/copy buttons
- Calendar integration is the first real external signal source — sets the pattern for future Pulse integrations (v2)

</specifics>

<deferred>
## Deferred Ideas

- Plugin marketplace with paid workflows — PLAT-02 in v2 requirements
- Pulse signal ingestion (email, Slack, GitHub) — INTEL-01 in v2
- Plugin auto-update mechanism — future enhancement
- Calendar event editing from within Element — read-only for now
- Plugin dependency management (plugin A depends on plugin B) — complexity not needed for v1

</deferred>

---

*Phase: 04-plugin-system*
*Context gathered: 2026-03-15*
