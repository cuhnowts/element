
### 999.10 — Slide Panels Push Layout Instead of Overlay
Currently the Calendar and Goals slide-in panels (SlideOverPanel) use absolute positioning and overlay on top of the hub center content. User wants them to push the center content aside so panels sit next to the hub, not on top of it. Requires changing from absolute to flex/grid layout that shares horizontal space.

### 999.11 — Configurable Workspace Opener
"Open Workspace" currently opens the terminal drawer. User wants this to be configurable per-project: open Finder, VS Code, terminal-only, or other tools depending on the type of work. For now, terminal-only is correct. Configuration UI and multi-opener support deferred.

### 999.9 — Agent Sandbox / Self-Rewrite Protection
The Element AI agent runs with `--dangerously-skip-permissions`. Need to evaluate safer alternatives: remove that flag and use Claude Code's permission system, add `--deny-write` flags, or scope MCP tools to read-only where possible. The agent should never be able to modify the Element codebase itself.
