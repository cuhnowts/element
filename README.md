# Element

**A desktop work OS that lets AI orchestrate your projects — so you focus on decisions, not mechanics.**

Element is a local-first project management platform built with Tauri, React, and SQLite. It structures your work into themes, projects, phases, and tasks, then uses AI to plan, execute, and monitor across everything. A central AI agent lives inside the app — it generates daily briefings, manages your calendar, queries your knowledge wiki, and runs shell commands, all through natural conversation.

---

## What Makes Element Different

- **AI-native, not AI-bolted.** The AI isn't a sidebar chat — it's the orchestrator. It knows your projects, deadlines, calendar, and priorities. Ask it to reschedule your day and it does.
- **Local-first.** Your data lives on your machine in SQLite. No cloud dependency, no subscriptions for core features.
- **Plugin architecture.** Knowledge wiki, calendar sync, shell commands — they're all plugins. Add capabilities by dropping files into a directory.
- **MCP server built in.** External AI tools (Claude Code, Cursor, etc.) can read your projects, run tests, and manage tasks through the Model Context Protocol.

---

## Features

### Project Management
- **Themes, Projects, Phases, Tasks** — hierarchical work structure with drag-and-drop organization
- **Goal-first project view** — each project leads with its goal, not a task list
- **Phase tracking** — link directories, sync with `.planning/` folders, track progress per phase
- **Due dates with urgency visuals** — three-tier system (overdue, due soon, normal) with backlog exemption

### AI Hub
- **Conversational AI** — multi-turn chat with full project context, markdown rendering, and tool use
- **Daily briefing** — CEO-style morning summary aggregating priorities across all projects
- **Smart scheduling** — AI generates daily plans factoring in calendar events, deadlines, and priorities
- **Bot skills** — 18+ tools: task CRUD, project creation, shell commands, file creation, calendar management, wiki queries

### Knowledge Wiki
- **Plugin-powered wiki** — three-layer system (raw sources, LLM-compiled articles, schema rules)
- **Natural language access** — query, ingest, and lint your wiki through hub chat
- **MCP-accessible** — external AI tools can read and write to your wiki

### Calendar Integration
- **Google Calendar sync** — OAuth with token refresh, background auto-sync, 410 recovery
- **Day/week view** — Outlook-style time grid with meeting blocks and work blocks
- **Schedule negotiation** — tell the AI you lost time and it regenerates your day

### Terminal & Workspace
- **Embedded terminal** — full PTY with xterm.js, per-project working directory, WebGL rendering
- **Multi-session support** — named terminal tabs per project with independent state
- **File explorer** — gitignore-aware tree with live filesystem watching

### Plugin System
- **Skill registration** — plugins declare skills that appear in hub chat automatically
- **MCP tool registration** — plugin tools are discoverable by external AI agents
- **Owned directories** — plugins manage their own filesystem locations
- **Core plugins** — shell, HTTP, filesystem, calendar, and knowledge engine ship built-in

### MCP Server
- **10+ tools** — read projects, tasks, calendar events; create work blocks; manage wiki
- **Plugin tool bridge** — any plugin's MCP tools appear in ListTools/CallTools without server changes
- **DB-based discovery** — tools loaded from SQLite, not hardcoded

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | [Tauri 2.x](https://tauri.app/) (Rust) |
| Frontend | React 19, TypeScript, Tailwind CSS |
| Components | [shadcn/ui](https://ui.shadcn.com/) |
| State | Zustand with localStorage persistence |
| Database | SQLite (rusqlite) — local-first, WAL mode |
| Terminal | xterm.js + tauri-plugin-pty |
| AI providers | Anthropic, OpenAI, Ollama, OpenAI-compatible |
| MCP | Model Context Protocol server over stdio |
| Bundler | Vite + esbuild |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Rust** (latest stable)
- **macOS** (primary) or **Windows** (experimental)

### Install & Run

```bash
# Clone
git clone https://github.com/cuhnowts/element.git
cd element

# Install dependencies
npm install
cd mcp-server && npm install && npm run build && cd ..

# Run in dev mode
cargo tauri dev
```

### AI Provider Setup

1. Open the app and go to **Settings > AI Providers**
2. Add a provider (Anthropic, OpenAI, Ollama, or any OpenAI-compatible endpoint)
3. Enter your API key — stored locally in SQLite, never leaves your machine

### MCP Server (for external AI tools)

The MCP server runs as a sidecar, giving tools like Claude Code access to your Element data:

```json
{
  "mcpServers": {
    "element": {
      "command": "node",
      "args": ["path/to/element/mcp-server/dist/index.js", "path/to/element.db"]
    }
  }
}
```

---

## Architecture

```
element/
├── src/                    # React frontend
│   ├── components/         # UI components (hub, sidebar, center, settings)
│   ├── hooks/              # Custom hooks (terminal, plugins, chat)
│   ├── stores/             # Zustand state slices
│   └── lib/                # Tauri API bindings, action registry
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── ai/             # AI provider gateway, credentials
│   │   ├── commands/       # Tauri IPC command handlers
│   │   ├── db/             # SQLite migrations and models
│   │   ├── plugins/        # Plugin host, registries, core plugins
│   │   ├── heartbeat/      # Background deadline risk engine
│   │   └── knowledge/      # Knowledge engine (wiki compiler)
│   └── capabilities/       # Tauri security permissions
└── mcp-server/             # MCP server (Node.js)
    └── src/                # Tool handlers, plugin bridge
```

---

## Version History

| Version | Name | Highlights |
|---------|------|------------|
| **v1.8** | Plugin-First Knowledge | Plugin skill/MCP registration, knowledge wiki engine, hub chat plugin dispatch |
| **v1.7** | Test Foundations | Biome v2 migration, 297 Rust tests, pre-commit hooks, testing MCP server |
| **v1.6** | Hub Redesign | Single-column hub, slide-over panels, goal-first project detail |
| **v1.5** | Time Bounded | Google Calendar sync, day/week view, scheduling engine, due dates |
| **v1.4** | Daily Hub | Goals tree, AI briefing, hub chat, bot skills, MCP write tools |
| **v1.3** | Foundation & Execution | Multi-terminal, notifications, MCP server, agent lifecycle |
| **v1.2** | Intelligent Planning | Tiered AI planning, .planning/ sync, adaptive context builder |
| **v1.1** | Project Manager | Themes, phases, file explorer, terminal, AI onboarding |
| **v1.0** | MVP | Task/project CRUD, workflows, scheduling, plugin system, 4 AI providers |

---

## License

Open source core. See [LICENSE](LICENSE) for details.
