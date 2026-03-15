# Technology Stack

**Project:** Element — Desktop Workflow Orchestration Platform
**Researched:** 2026-03-15

## Recommended Stack

### Application Shell

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tauri | 2.10.x | Desktop app shell | 10x smaller bundles (~5MB vs 100MB+), 30-40MB memory vs Electron's 200-300MB, 40% faster startup, Rust backend for performance-critical workflow engine, native OS webview for "Discord-like" feel, built-in plugin architecture aligns with Element's plugin model, security-first with opt-in permissions | HIGH |
| Rust (via Tauri) | stable | Backend logic, workflow engine core, IPC | Type-safe, memory-safe without GC, excellent concurrency for running parallel workflows, natural fit for Tauri's command system | HIGH |

### Frontend Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 19.x | UI framework | Largest ecosystem for complex desktop-style UIs, shadcn/ui component library, resizable panels, sidebar layouts all built for React. Element's UI (status panel, output panel, tools panel, sidebar) maps directly to shadcn's resizable panel components | HIGH |
| TypeScript | 5.7+ | Type safety | Non-negotiable for a project this complex. Type-safe IPC with Tauri commands | HIGH |
| Vite | 6.x | Build tool / dev server | Tauri's recommended bundler, fast HMR, first-class TypeScript support | HIGH |

### UI Component Library

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| shadcn/ui | latest (CLI v4) | Component library | Copy-paste model means full control — critical for a desktop app that needs custom behavior. Resizable panels, sidebar, command palette, dialog, sheet all ship out of the box. Tailwind v4 + OKLCH colors supported | HIGH |
| Tailwind CSS | 4.x | Styling | shadcn/ui foundation, @theme directive for theming (dark/light mode critical for desktop apps), zero runtime CSS overhead | HIGH |
| react-resizable-panels | latest | Panel layout | Powers shadcn's resizable component. Provides VS Code-style adjustable panel groups — exactly what Element's multi-panel UI needs | HIGH |

### Routing & State

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TanStack Router | latest | Client-side routing | Type-safe file-based routing, SPA-only (correct for Tauri — no SSR), search params as state. Multiple community templates prove Tauri + TanStack Router works well | MEDIUM |
| Zustand | 5.x | Client state management | Centralized store pattern fits Element's interconnected state (active workflow, panel states, notifications, AI responses). Middleware for persistence (localStorage), devtools, immer. Simpler than Redux, more structured than Jotai for a desktop app with many related state slices | HIGH |

### Database & Storage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| SQLite (via rusqlite) | 3.x | Local-first data storage | Zero-config, single-file database, perfect for local-first architecture. rusqlite gives native Rust access — no serialization overhead for backend operations. Workflows, schedules, memory, user preferences all stored locally | HIGH |
| tauri-plugin-sql | official | Frontend DB access | Official Tauri plugin using sqlx under the hood, provides IPC bridge for frontend to query SQLite when needed | HIGH |
| Drizzle ORM | 0.45.x | TypeScript schema/queries | Type-safe SQL with zero dependencies (7.4kb), SQLite support, migration system via drizzle-kit. Used on the frontend/TypeScript side for type-safe queries through Tauri IPC | MEDIUM |

**Architecture note:** The Rust backend owns the database via rusqlite for performance-critical operations (workflow execution, scheduling). The frontend uses Drizzle for type definitions and lighter queries routed through Tauri commands. This dual approach avoids the overhead of routing every DB call through IPC while keeping TypeScript types in sync.

### AI Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel AI SDK | 6.x | Model-agnostic AI abstraction | Unified API across providers (Anthropic, OpenAI, Google), streaming support, tool calling, agent capabilities via v3 Language Model Spec. Community provider for Ollama enables local model support. Used by the Rust backend via sidecar Node process or directly from frontend | HIGH |
| @ai-sdk/anthropic | latest | Claude provider | First-class Claude support including Claude 4 | HIGH |
| @ai-sdk/openai | latest | OpenAI provider | GPT-4o, o1, o3 support | HIGH |
| ai-sdk-ollama | 3.x | Local model provider | Ollama integration for local LLMs, tool calling support, works offline — critical for local-first philosophy | MEDIUM |

**Architecture note:** AI calls originate from the TypeScript layer (not Rust) because the AI SDK ecosystem is JavaScript-native. Rust handles workflow orchestration and scheduling; when a workflow step needs AI, it delegates to the TypeScript AI layer via Tauri's event system.

### Workflow Engine

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom Rust engine | — | Workflow execution core | No existing TypeScript workflow engine fits Element's model (BSD-style piping, document passing between stages, local-first). Build on Rust's tokio for async execution, channels for step-to-step data flow. This is Element's core IP — it should not depend on an external library | HIGH |
| tokio | 1.x | Async runtime | Tauri already uses tokio. Provides async task spawning, timers, channels for workflow step orchestration | HIGH |
| tauri-plugin-schedule-task | latest | CRON scheduling | Cron-like task scheduling in Rust, runs even when app is not in foreground — required for CRON report delivery and scheduled workflows | MEDIUM |
| serde / serde_json | 1.x | Serialization | Workflow definitions, plugin manifests, IPC payloads all need JSON serialization. serde is the Rust standard | HIGH |

### Plugin System

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| File-based plugin loader (custom) | — | Plugin discovery & loading | Scan a directory for plugin manifests (TOML/JSON), validate schema, register workflow steps. Aligns with Tauri 2's own plugin architecture philosophy but at the application level | HIGH |
| JSON Schema | draft-07 | Plugin manifest validation | Validate plugin.json manifests declaratively. Well-understood, tooling exists | HIGH |

**Plugin architecture:** Plugins are directories dropped into `~/.element/plugins/` containing a `plugin.json` manifest and either TypeScript workflow definitions (interpreted) or compiled Rust shared libraries (for performance plugins). The manifest declares capabilities, required permissions, and workflow step definitions. This mirrors Tauri's own capability-based security model.

### Dev Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Biome | 1.x | Linting + formatting | Single tool replaces ESLint + Prettier, 10-100x faster, consistent formatting | HIGH |
| Vitest | 2.x | Frontend testing | Vite-native, fast, compatible with Testing Library | HIGH |
| cargo test | — | Rust testing | Built-in, no setup needed | HIGH |
| Playwright | latest | E2E testing | Tauri has Playwright integration for testing desktop app flows | MEDIUM |

### Build & Distribution

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| tauri-cli | 2.x | Build & bundle | Produces .dmg (macOS), .msi/.exe (Windows), .AppImage (Linux). Auto-updater plugin available | HIGH |
| GitHub Actions | — | CI/CD | Tauri has official GitHub Actions for cross-platform builds | HIGH |
| tauri-plugin-updater | official | Auto-update | Built-in update mechanism, no external service needed | HIGH |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| App shell | Tauri 2 | Electron | 10x larger bundles, 5-7x more memory, slower startup. Electron's Node.js integration is unnecessary — Rust is better for the workflow engine. Electron remains viable for JS-heavy teams, but Element benefits from Rust's performance for workflow execution |
| App shell | Tauri 2 | .NET MAUI (C# route) | Weaker web UI ecosystem, no equivalent to shadcn/react-resizable-panels for complex panel layouts. Cross-platform story is shakier than Tauri's. C# was considered per PROJECT.md but TypeScript + Rust is a stronger combination for this use case |
| Frontend | React | SolidJS | SolidJS has better raw performance via fine-grained reactivity, but smaller ecosystem. shadcn/ui, TanStack Router, and the broader component library ecosystem all favor React. For a complex desktop UI with many panels, the ecosystem advantage outweighs SolidJS's perf edge |
| Frontend | React | Svelte 5 | Svelte 5 with runes is excellent, but component library ecosystem is thinner. No shadcn/ui equivalent with the same breadth. For Element's complex multi-panel UI, React's ecosystem wins |
| State | Zustand | Jotai | Jotai's atomic model is better for fine-grained reactivity but worse for interconnected state. Element's state (active workflow, panel layout, AI responses, notifications) is highly interconnected — Zustand's centralized store is a better mental model |
| State | Zustand | Redux Toolkit | Unnecessary complexity for this use case. Zustand provides the same centralized pattern with 1/10th the boilerplate |
| Database | SQLite (rusqlite) | libSQL | libSQL adds cloud sync which is unnecessary for local-first v1. Adds complexity without benefit. Can migrate to libSQL later if cloud sync becomes a feature |
| Database | SQLite (rusqlite) | better-sqlite3 | better-sqlite3 is Node.js-only. Element's backend is Rust, so rusqlite is the natural choice. No IPC overhead for backend DB operations |
| ORM | Drizzle | Prisma | Prisma's engine binary adds bloat and complexity in a Tauri app. Drizzle is lightweight (7.4kb), zero dependencies, SQL-first approach is more transparent |
| AI SDK | Vercel AI SDK | LangChain.js | LangChain is heavier, more opinionated, and adds abstractions Element doesn't need. The AI SDK's provider model is cleaner and the unified streaming API is exactly what Element needs for AI workflow steps |
| Workflow | Custom Rust | Temporal/ts-edge | Temporal is server-oriented (overkill for desktop). ts-edge is too simple. Element's BSD-pipe workflow model is unique enough to warrant a custom engine — and it's core IP |
| Scheduling | tauri-plugin-schedule-task | node-cron | Runs in Rust's async runtime, works when app is backgrounded, no Node.js dependency |

## Installation

```bash
# Prerequisites
# Install Rust: https://rustup.rs
# Install Node.js 20+ (via fnm or nvm)

# Create Tauri project
npm create tauri-app@latest element -- --template react-ts

# Frontend dependencies
npm install react@19 react-dom@19
npm install @tanstack/react-router
npm install zustand
npm install tailwindcss@4 @tailwindcss/vite
npm install drizzle-orm

# shadcn/ui (CLI adds components individually)
npx shadcn@latest init

# AI SDK
npm install ai @ai-sdk/anthropic @ai-sdk/openai
npm install ai-sdk-ollama

# Dev dependencies
npm install -D typescript @types/react @types/react-dom
npm install -D vite @vitejs/plugin-react
npm install -D @biomejs/biome
npm install -D vitest @testing-library/react
npm install -D drizzle-kit

# Rust dependencies (in src-tauri/Cargo.toml)
# rusqlite = { version = "0.32", features = ["bundled"] }
# serde = { version = "1", features = ["derive"] }
# serde_json = "1"
# tokio = { version = "1", features = ["full"] }
# tauri-plugin-sql = "2"
# tauri-plugin-schedule-task = "0.1"
```

## Version Pinning Strategy

Pin major versions, allow patch updates:
- Tauri: `~2.10` (patch updates only, Tauri is still maturing)
- React: `^19.0` (stable, minor updates safe)
- AI SDK: `^6.0` (active development, pin to major)
- Drizzle: `^0.45` (pre-1.0, pin to minor)
- rusqlite: `0.32` (Rust convention, pin to minor)

## Architecture Decision: Why TypeScript + Rust (not pure TypeScript or pure Rust)

Element needs two things that pull in opposite directions:
1. **Rich, complex UI** with panels, sidebars, drag-and-drop, real-time updates (favors TypeScript/React ecosystem)
2. **High-performance workflow engine** with concurrent execution, scheduling, file system access (favors Rust)

Tauri 2 bridges these naturally: React renders the UI in the system webview, Rust handles the engine. IPC is the bridge — Tauri's command system provides type-safe async communication between them.

The AI SDK lives in TypeScript because the entire AI provider ecosystem is JavaScript-first. Rust calls out to the TypeScript AI layer when workflow steps need intelligence.

This is not a compromise — it's playing to each language's strength.

## Sources

- [Tauri 2.0 Official Site](https://v2.tauri.app/) — HIGH confidence
- [Tauri Architecture](https://v2.tauri.app/concept/architecture/) — HIGH confidence
- [Tauri IPC Documentation](https://v2.tauri.app/concept/inter-process-communication/) — HIGH confidence
- [Tauri Plugin Development](https://v2.tauri.app/develop/plugins/) — HIGH confidence
- [Tauri SQL Plugin](https://v2.tauri.app/plugin/sql/) — HIGH confidence
- [Vercel AI SDK](https://ai-sdk.dev) — HIGH confidence
- [AI SDK Providers](https://ai-sdk.dev/docs/foundations/providers-and-models) — HIGH confidence
- [AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6) — HIGH confidence
- [shadcn/ui](https://ui.shadcn.com/) — HIGH confidence
- [shadcn/ui Resizable](https://ui.shadcn.com/docs/components/radix/resizable) — HIGH confidence
- [shadcn/ui Sidebar](https://ui.shadcn.com/docs/components/radix/sidebar) — HIGH confidence
- [Drizzle ORM SQLite](https://orm.drizzle.team/docs/get-started-sqlite) — HIGH confidence
- [TanStack Router](https://tanstack.com/router/latest) — HIGH confidence
- [Tauri vs Electron Performance](https://www.gethopp.app/blog/tauri-vs-electron) — MEDIUM confidence
- [Zustand vs Jotai Performance Guide](https://www.reactlibraries.com/blog/zustand-vs-jotai-vs-valtio-performance-guide-2025) — MEDIUM confidence
- [tauri-plugin-schedule-task](https://crates.io/crates/tauri-plugin-schedule-task) — MEDIUM confidence
- [ai-sdk-ollama](https://www.npmjs.com/package/ai-sdk-ollama) — MEDIUM confidence
