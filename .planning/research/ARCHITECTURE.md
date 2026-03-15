# Architecture Patterns

**Domain:** Desktop workflow orchestration platform (AI-native, local-first)
**Researched:** 2026-03-15

## Recommended Architecture

Element is a **layered desktop application** with a Rust backend (Tauri 2.x), a TypeScript/React frontend, and a local SQLite database. The system decomposes into six bounded components connected through typed IPC and an internal event bus.

```
+------------------------------------------------------------------+
|                        FRONTEND (WebView)                        |
|  +------------------+  +----------------+  +------------------+  |
|  | Workflow Editor   |  | Status Panel   |  | Briefing View    |  |
|  | (List Builder)    |  | (Live Output)  |  | (Daily Summary)  |  |
|  +------------------+  +----------------+  +------------------+  |
|  +------------------+  +----------------+  +------------------+  |
|  | Tools Panel       |  | Plugin Mgmt    |  | Settings         |  |
|  +------------------+  +----------------+  +------------------+  |
+-------------------------------+----------------------------------+
                                | Tauri IPC (invoke / events)
+-------------------------------v----------------------------------+
|                       CORE ENGINE (Rust)                         |
|  +------------------+  +----------------+  +------------------+  |
|  | Workflow Engine   |  | Scheduler      |  | Event Bus        |  |
|  | (Executor +       |  | (Cron +        |  | (Internal pub/   |  |
|  |  Pipeline Comp.)  |  |  Trigger Mgr)  |  |  sub messaging)  |  |
|  +------------------+  +----------------+  +------------------+  |
|  +------------------+  +----------------+  +------------------+  |
|  | Plugin Host       |  | AI Gateway     |  | Pulse Ingestion  |  |
|  | (FS watcher +     |  | (Provider      |  | (Signal adapters |  |
|  |  sandbox loader)  |  |  abstraction)  |  |  + normalizer)   |  |
|  +------------------+  +----------------+  +------------------+  |
|  +-------------------------------------------------------------+ |
|  | Data Layer (SQLite via rusqlite + migrations)                | |
|  +-------------------------------------------------------------+ |
+------------------------------------------------------------------+
                                |
           +--------------------+---------------------+
           |                    |                      |
    External Tools       Signal Sources          AI Providers
    (Claude Code,        (Calendar API,          (Claude, GPT,
     CLIs, agents)        Email, Slack)           local models)
```

### Component Boundaries

| Component | Responsibility | Communicates With | Boundary Rule |
|-----------|---------------|-------------------|---------------|
| **Workflow Engine** | Parse, validate, execute, and compose workflows. Implements pipe-style data passing between steps. | Scheduler, Plugin Host, AI Gateway, Data Layer, Event Bus | Owns the `Workflow` and `Execution` domain types. Only component that spawns external processes. |
| **Scheduler** | CRON-based scheduling, trigger management, wake-on-signal. | Workflow Engine, Pulse Ingestion, Event Bus | Fires `RunWorkflow` events. Never executes workflows directly. |
| **Event Bus** | Internal async pub/sub for decoupling components. Typed event channels. | All components | Thin transport layer. No business logic. Events are fire-and-forget with optional ack. |
| **Plugin Host** | Watches plugin directories, loads/validates plugin manifests, sandboxes plugin execution. | Workflow Engine, Data Layer, filesystem | Plugins cannot access raw IPC or DB. They interact through a defined Plugin API surface. |
| **AI Gateway** | Unified interface to LLM providers. Handles routing, fallback, prompt formatting, response normalization. | Workflow Engine (on demand), Data Layer (for config/keys) | All AI calls go through this gateway. No component calls providers directly. |
| **Pulse Ingestion** | Adapters for external signal sources (calendar, email, Slack, GitHub). Normalizes signals into a standard `Signal` type. | Scheduler, Data Layer, Event Bus | Each signal source is an adapter implementing a `SignalSource` trait. Adapters are plugin-loadable. |
| **Data Layer** | SQLite persistence. Schema migrations. Query interface for all stored data (workflows, executions, signals, memory, config). | All Rust-side components | Single source of truth. No component bypasses the Data Layer for persistence. |
| **Frontend** | Workflow editing (list builder), status/output panels, daily briefing view, settings, plugin management. | Core Engine via Tauri IPC (invoke for commands, listen for events) | Purely presentational + user input. No business logic. Receives state updates via event stream from backend. |

### Data Flow

**Workflow Execution (the core loop):**

```
1. Trigger fires (CRON tick, manual run, signal arrival)
        |
2. Scheduler emits RunWorkflow event on Event Bus
        |
3. Workflow Engine picks up event, loads workflow definition from Data Layer
        |
4. Engine resolves pipeline: Step A | Step B | Step C
        |
5. For each step:
   a. If step is "external-exec": spawn CLI process, capture stdout as Document
   b. If step is "ai-call": route through AI Gateway, receive Document
   c. If step is "transform": apply local transformation to Document
   d. Pass output Document as input to next step (pipe semantics)
        |
6. Engine writes execution result + logs to Data Layer
        |
7. Engine emits ExecutionComplete event on Event Bus
        |
8. Frontend receives event via Tauri event listener, updates UI
```

**Signal Ingestion (Pulse):**

```
1. Pulse adapter polls external source (or receives webhook)
        |
2. Raw data normalized into Signal { source, type, timestamp, payload }
        |
3. Signal written to Data Layer
        |
4. SignalArrived event emitted on Event Bus
        |
5. Scheduler evaluates: does any workflow trigger match this signal?
   - YES: emits RunWorkflow
   - NO: signal stored for briefing/memory aggregation
```

**Document type** -- the universal data envelope passed between pipeline steps:

```rust
struct Document {
    content: serde_json::Value,   // The actual data (flexible JSON)
    metadata: DocumentMeta,        // Source step, timestamp, content-type hint
}
```

This is the "water in the pipe." Every step receives a `Document` and emits a `Document`. This is how `workflow_a | workflow_b` composition works -- the output Document of workflow_a becomes the input Document of workflow_b.

## Patterns to Follow

### Pattern 1: Pipeline Composition via Document Passing

**What:** Workflows are pipelines of steps. Each step transforms a `Document` and passes it to the next. Workflows themselves are composable -- a workflow can be a step in another workflow.

**When:** All workflow execution.

**Why:** This is the Unix pipe model applied to structured data. It keeps steps decoupled (each only knows about Document in/out), enables reuse, and makes the system understandable. n8n uses a similar model (JSON objects flowing between nodes) but Element simplifies by enforcing linear pipelines rather than arbitrary graphs.

**Example:**
```rust
// Workflow definition (conceptual)
Pipeline {
    steps: vec![
        Step::External { cmd: "curl", args: ["https://api.news.com/top"] },
        Step::AI { prompt: "Summarize these headlines for {{user.name}}" },
        Step::Transform { template: "briefing.html" },
    ]
}

// Composition: one workflow feeds another
Pipeline {
    steps: vec![
        Step::Workflow { id: "fetch-news" },
        Step::Workflow { id: "format-briefing" },
        Step::External { cmd: "notify-send", args: ["Daily Briefing Ready"] },
    ]
}
```

### Pattern 2: Adapter Pattern for AI Gateway

**What:** A trait-based abstraction where each AI provider implements a common interface. The gateway routes requests based on user config, handles fallback chains, and normalizes responses.

**When:** Any workflow step that needs LLM capabilities.

**Why:** Model-agnostic is a hard requirement. The adapter pattern (used by LiteLLM, Pydantic AI, and Vercel AI SDK) is the proven approach. Element should define its own `AiProvider` trait rather than depending on an external routing library, keeping the dependency surface minimal for a desktop app.

**Example:**
```rust
trait AiProvider: Send + Sync {
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse>;
    fn name(&self) -> &str;
    fn supports_streaming(&self) -> bool;
}

struct AiGateway {
    providers: Vec<Box<dyn AiProvider>>,
    default_provider: String,
    fallback_chain: Vec<String>,
}
```

### Pattern 3: File-Based Plugin System with Manifest

**What:** Plugins are directories dropped into `~/.element/plugins/` (or platform equivalent). Each plugin has a `manifest.toml` declaring its capabilities, and one or more workflow definition files. The Plugin Host watches this directory and hot-loads on changes.

**When:** Extending Element with new workflow steps, signal adapters, or workflow templates.

**Why:** File-based drop-in is the simplest distribution model and aligns with the open-source core + paid plugins business model. A filesystem watcher (via `notify` crate) enables hot-reload without restart.

**Example plugin structure:**
```
~/.element/plugins/
  daily-news/
    manifest.toml        # name, version, author, capabilities, permissions
    workflows/
      fetch-news.yaml    # workflow definition
      summarize.yaml
    templates/
      briefing.html
```

### Pattern 4: Event Bus for Internal Decoupling

**What:** Components communicate through typed events on an async channel (tokio broadcast or similar). Events are structs, not strings.

**When:** Cross-component communication that should not create direct dependencies.

**Why:** The Scheduler should not import the Workflow Engine. The Frontend should not poll for updates. Events decouple these concerns. Tauri 2.0 already has an event system for frontend-backend communication; the internal Event Bus mirrors this pattern on the Rust side.

## Anti-Patterns to Avoid

### Anti-Pattern 1: God Orchestrator
**What:** Putting all coordination logic in a single monolithic component that knows about every step type, every provider, every signal source.
**Why bad:** Becomes impossible to extend. Every new feature touches the same file. Plugin system cannot work if the core is not decomposed.
**Instead:** Each component owns its domain. The Workflow Engine knows about step execution, not about how AI providers work or how signals arrive. It delegates through interfaces.

### Anti-Pattern 2: Direct Process Spawning from UI
**What:** Letting the frontend directly spawn or manage external processes (CLIs, agents).
**Why bad:** Violates Tauri's security model. Creates race conditions. Frontend has no business managing process lifecycles.
**Instead:** Frontend sends `invoke("run_workflow", ...)` to the Rust backend. The Workflow Engine manages all process spawning, captures output, and streams updates back via events.

### Anti-Pattern 3: Unstructured Plugin Communication
**What:** Letting plugins call arbitrary Rust functions, access the database directly, or emit raw events.
**Why bad:** Breaks sandboxing. Malicious or buggy plugins can corrupt data or crash the app. Kills the paid plugin marketplace model (trust issue).
**Instead:** Plugins interact only through a defined Plugin API: they declare capabilities in their manifest, receive Documents as input, and return Documents as output. The Plugin Host mediates all interactions.

### Anti-Pattern 4: Polling for State Updates
**What:** Frontend timers that poll the backend for execution status, signal counts, etc.
**Why bad:** Wastes CPU, introduces latency, creates flickering UI.
**Instead:** Use Tauri's event system. Backend pushes state changes to frontend. Frontend subscribes to specific event types and updates reactively.

### Anti-Pattern 5: Workflow Definitions as Code-Only
**What:** Requiring all workflows to be written in code (Rust, TypeScript, Python).
**Why bad:** Kills accessibility for non-developer users. Makes the GUI builder impossible to implement if workflows are arbitrary code.
**Instead:** Workflows are data (YAML/TOML/JSON definitions) that the engine interprets. The GUI builder and code editor both produce the same data format. Code-defined workflows use a thin DSL that compiles to this same data format.

## Scalability Considerations

| Concern | Solo User (v1) | Power User (v2) | Plugin Ecosystem (v3) |
|---------|----------------|------------------|----------------------|
| **Concurrent workflows** | Sequential execution fine | Thread pool for parallel steps within a pipeline | Worker pool with priority queue |
| **Data volume** | Single SQLite file, no issues up to ~1GB | Execution log pruning, archival strategy | Per-plugin data isolation, vacuum scheduling |
| **Plugin count** | <10 plugins, eager load all | Lazy loading, only activate used plugins | Dependency resolution, version constraints |
| **Signal throughput** | Polling every 5min adequate | Configurable polling intervals per source | Webhook support for push-based sources |
| **AI calls** | One provider, synchronous | Streaming responses, parallel calls | Cost tracking, rate limiting, provider pooling |

## Build Order (Dependency Chain)

Components should be built in this order based on dependencies:

```
Phase 1: Foundation
  Data Layer (SQLite schema + migrations)
  Event Bus (typed channels)

Phase 2: Core Engine
  Workflow Engine (executor + Document pipeline)
    depends on: Data Layer, Event Bus

Phase 3: Shell Integration
  Scheduler (CRON + triggers)
    depends on: Workflow Engine, Event Bus
  Plugin Host (filesystem watcher + manifest parser)
    depends on: Workflow Engine, Data Layer

Phase 4: Intelligence
  AI Gateway (provider abstraction)
    depends on: Data Layer (config), Workflow Engine (step type)
  Pulse Ingestion (signal adapters)
    depends on: Scheduler, Data Layer, Event Bus

Phase 5: Interface
  Frontend (all panels)
    depends on: All backend components via IPC
```

**Rationale:** You cannot test workflows without persistence (Data Layer first). You cannot schedule without an engine to schedule (Engine before Scheduler). Plugins and AI are extensions of the engine, not prerequisites. Frontend comes last because the backend can be validated entirely through CLI/tests.

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Desktop framework | Tauri 2.x | Smaller bundles (~10MB vs ~100MB+ Electron), Rust backend aligns with performance needs, capability-based security model fits plugin sandboxing. 35% YoY adoption growth validates ecosystem maturity. |
| Data format for workflows | YAML with JSON schema validation | Human-readable/editable (code users), parseable (GUI builder), version-controllable (git). YAML over JSON for readability; over TOML for nested structure support. |
| Internal communication | Typed event bus (tokio broadcast) | Decouples components without adding infrastructure. Not a full message broker -- this is a single-process desktop app. |
| IPC model | Tauri invoke (commands) + event listeners | Tauri 2.0's IPC is fetch-like, supports binary payloads, and has built-in permission scoping. No need to build custom IPC. |
| Process execution | `tokio::process::Command` with stdout/stderr capture | Async process spawning with streaming output. Workflows that call external tools (Claude Code, CLIs) need non-blocking execution with real-time output. |
| Plugin isolation | Manifest-declared permissions + Document-only I/O | Full sandboxing (WASM) is complex and premature for v1. Manifest permissions + restricted API surface is the pragmatic middle ground. Can evolve to WASM sandboxing later. |

## Sources

- [Tauri 2.0 Stable Release](https://v2.tauri.app/blog/tauri-20/) -- IPC rewrite, plugin architecture, capability permissions
- [Tauri Inter-Process Communication](https://v2.tauri.app/concept/inter-process-communication/) -- invoke system, event listeners, security model
- [Tauri Plugin Development](https://v2.tauri.app/develop/plugins/) -- plugin structure, command scoping
- [Electron vs Tauri comparison (DoltHub)](https://www.dolthub.com/blog/2025-11-13-electron-vs-tauri/) -- performance benchmarks, bundle size
- [Tauri vs Electron (Hopp)](https://www.gethopp.app/blog/tauri-vs-electron) -- memory usage, adoption data
- [n8n Architecture (DeepWiki)](https://deepwiki.com/n8n-io/n8n) -- workflow execution engine, queue mode
- [n8n System Design (DEV)](https://dev.to/tinhtinhcd/understanding-n8n-from-a-system-design-perspective-5075) -- JSON workflow definitions, node execution model
- [Temporal Workflow Engine Principles](https://temporal.io/blog/workflow-engine-principles) -- event history, durable execution
- [Database-Backed Workflow Orchestration (InfoQ)](https://www.infoq.com/news/2025/11/database-backed-workflow/) -- PostgreSQL as orchestration layer pattern
- [Implementing LLM Agnostic Architecture (Entrio)](https://www.entrio.io/blog/implementing-llm-agnostic-architecture-generative-ai-module) -- adapter pattern, provider abstraction
- [Model Agnostic Pattern and LLM API Gateway](https://towardsai.net/p/machine-learning/llm-ai-agent-applications-with-langchain-and-langgraph-part-29-model-agnostic-pattern-and-llm-api-gateway) -- routing, fallback chains
- [Multi-Provider LLM Integration (Aider)](https://deepwiki.com/Aider-AI/aider/6.3-multi-provider-llm-integration) -- real-world multi-provider implementation
- [cr-sqlite (GitHub)](https://github.com/vlcn-io/cr-sqlite) -- CRDT-based SQLite for future sync capability
- [Plugin Architecture Pattern (Medium)](https://medium.com/omarelgabrys-blog/plug-in-architecture-dec207291800) -- core + plugin decomposition
- [Apple Plugin Architecture](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/LoadingCode/Concepts/Plugins.html) -- platform conventions for plugin directories
