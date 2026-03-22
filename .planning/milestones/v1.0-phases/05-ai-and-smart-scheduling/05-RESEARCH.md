# Phase 5: AI and Smart Scheduling - Research

**Researched:** 2026-03-15
**Domain:** Model-agnostic AI provider integration, AI-assisted task creation, intelligent time-block scheduling
**Confidence:** HIGH

## Summary

Phase 5 adds two major capabilities to Element: (1) a model-agnostic AI gateway that lets users configure AI providers (Claude, OpenAI, Ollama, custom endpoints) and get AI-assisted task scaffolding, and (2) a smart scheduling system that detects open time blocks around calendar meetings and assigns prioritized tasks to those blocks.

The critical architectural decision is where AI calls happen. The STACK.md research recommended AI calls from TypeScript via Vercel AI SDK because the AI provider ecosystem is JavaScript-native. However, Element's architecture routes all external calls through the Rust backend (anti-pattern: direct process spawning from UI). The recommended approach is a **Rust-native AI gateway using `reqwest`** that makes direct HTTP calls to provider APIs. This avoids a Node.js sidecar, keeps the architecture simple (no bundled Node runtime), and aligns with the established pattern where the Rust backend owns all external communication. The Claude, OpenAI, and Ollama APIs are all simple REST endpoints -- a trait-based abstraction in Rust with `reqwest` is straightforward and avoids the complexity of sidecar management. Streaming responses can be forwarded to the frontend via Tauri events.

For smart scheduling, the algorithm is deterministic (priority + due date ranking, greedy time-block filling) and runs entirely in Rust. Calendar event data comes from Phase 4's calendar integration. The schedule overlay renders in the existing sidebar below MiniCalendar.

**Primary recommendation:** Build the AI gateway as a pure Rust module using `reqwest` for HTTP calls, with an `AiProvider` trait for provider abstraction. Use Tauri IPC commands for AI operations and Tauri events for streaming responses. Schedule calculation is a pure Rust algorithm operating on in-memory task and calendar data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dedicated 'AI Providers' section in app settings, alongside the existing credential vault
- Add provider flow: select provider type (Claude, OpenAI, Ollama, Custom endpoint), enter API key (or auto-detect for Ollama), select model
- One global default provider/model for all AI features -- user sets it once, AI works everywhere
- Local model support via two paths: first-class Ollama auto-detection (discovers available models, no key needed) + generic OpenAI-compatible endpoint (user provides base URL + optional API key)
- API keys stored in the Phase 4 credential vault (OS keychain via Tauri secure storage) -- no separate key management
- When no AI provider is configured, all AI features are hidden -- app is 100% functional without AI
- On-demand 'AI Assist' sparkle button on task creation and editing -- AI only acts when user clicks
- Two modes: built-in AI assist (configured provider) + CLI/agent invocation (external tools)
- Built-in AI generates full task scaffold: structured description, workflow steps, priority suggestion, estimated duration, related tasks, and relevant tags
- Inline diff-style presentation: AI fills task fields directly with suggestions highlighted/marked, user accepts individual fields, edits, or dismisses
- Available on both new and existing tasks
- User-configured work hours (start time, end time, work days, default 9am-5pm Mon-Fri)
- Open blocks detected only within configured work hours
- Minimum useful block size: 30 minutes
- User-configurable buffer time between meetings and work blocks (default 10min, range 0-30min)
- Detected blocks shown as colored overlay in the existing calendar panel
- Auto-suggest with user confirmation: app fills blocks with prioritized tasks and shows proposed schedule
- Priority logic: priority + due date combined -- urgent/high tasks fill first blocks, approaching due dates get priority boost
- Tasks too long for any single block are split across multiple blocks with continuation indicator
- Schedule regenerates fresh each morning (or on app launch) based on current priorities and today's calendar

### Claude's Discretion
- AI Gateway abstraction layer design (provider trait, response normalization, error handling)
- Prompt engineering for task scaffolding (what context to include, output format)
- Time block calculation algorithm specifics
- Calendar overlay visual design (colors, opacity, indicators)
- CLI/agent invocation interface implementation details
- Loading states during AI generation
- Schedule regeneration trigger logic (app launch vs time-based)

### Deferred Ideas (OUT OF SCOPE)
- Memory system learning user preferences and patterns -- INTEL-02 in v2
- Pattern detection suggesting automations from repeated manual tasks -- INTEL-03 in v2
- Pulse system ingesting email/Slack/GitHub signals -- INTEL-01 in v2
- AI-ranked task assignment (using AI to rank instead of priority + due date) -- could revisit if simple heuristic proves insufficient
- Per-feature or per-task model overrides -- start with global default, add granularity if users request it
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | App supports model-agnostic AI layer (Claude, GPT, local models) | Rust `AiProvider` trait with provider implementations for Anthropic, OpenAI, Ollama, and OpenAI-compatible endpoints. Provider config stored in SQLite `ai_providers` table, API keys in credential vault. |
| AI-02 | AI assists task creation (suggests structure, steps, context) | AI Assist sparkle button triggers Tauri IPC command that sends task context to configured provider, receives structured scaffold, frontend presents inline diff-style suggestions. Streaming via Tauri events. |
| SCHED-01 | App auto-fills open time blocks with work sessions around meetings | Work hours config in SQLite. Algorithm reads calendar events for today, computes open blocks (minus buffer time, minimum block size), displays as schedule strip in sidebar. |
| SCHED-02 | App assigns tasks to work sessions based on priority | Greedy algorithm: score tasks by (priority_weight + due_date_urgency), sort descending, assign to open blocks in time order. Split tasks exceeding block duration across multiple blocks. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| reqwest | 0.12.x | HTTP client for AI provider APIs | Rust standard for async HTTP. Already pairs with tokio (in use). Supports streaming via `Response::bytes_stream()`. No need for a JS runtime. |
| serde / serde_json | 1.x | Request/response serialization | Already in use. All AI provider APIs use JSON. |
| tokio | 1.x | Async runtime | Already in use. Powers async HTTP calls and streaming. |
| tauri-plugin-stronghold or keyring | 2.x | Secure credential storage | OS keychain integration for API keys. Stronghold is official Tauri plugin (though noted for deprecation in v3). Alternative: `tauri-plugin-keyring` wrapping Rust `keyring` crate for native OS keychain. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| futures | 0.3.x | Stream utilities for streaming responses | When processing SSE/streaming chunks from AI providers |
| tokio-stream | 0.1.x | Stream adapters | Converting reqwest byte streams into typed event streams |
| uuid | 1.x | ID generation for providers and schedule blocks | Already in use |
| chrono | 0.4.x | Time calculations for scheduling | Already in use. Work hours, block duration, buffer time math |

### Frontend (existing, no new deps)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React | 19.x | UI framework | All new components (settings tabs, AI panel, schedule strip) |
| Zustand | 5.x | State management | New `aiSlice` and `schedulingSlice` store slices |
| Lucide React | latest | Icons | Sparkles, Terminal, RefreshCw, Check, X, Trash2, ArrowDown |
| shadcn/ui | latest | Components | Dialog, Card, Switch, Select, Input, Button, Badge, ScrollArea, Skeleton, Sonner |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Rust reqwest (direct API calls) | Vercel AI SDK via Node.js sidecar | Sidecar adds ~40MB to bundle, requires pkg/nexe compilation, inter-process communication complexity. AI provider APIs are simple REST -- reqwest handles them directly without a JS runtime. |
| Custom AiProvider trait | async-openai / anthropic-sdk-rust crates | Third-party crates add dependencies and may lag behind API changes. The APIs are simple enough (one HTTP endpoint each) that a thin custom trait is more maintainable. |
| Stronghold plugin | keyring crate directly | Stronghold provides encrypted file storage but is heavier. keyring provides native OS keychain access which is simpler and aligns with "OS keychain via Tauri secure storage" requirement. |

**Installation:**
```bash
# No new frontend dependencies needed -- all shadcn components and Lucide icons already available

# Rust dependencies (add to src-tauri/Cargo.toml)
# reqwest = { version = "0.12", features = ["json", "stream"] }
# futures = "0.3"
# tokio-stream = "0.1"
# tauri-plugin-stronghold = "2"  # OR keyring = "3"
```

## Architecture Patterns

### Recommended Project Structure

```
src-tauri/src/
  ai/
    mod.rs              # AiGateway struct, provider routing
    provider.rs         # AiProvider trait definition
    anthropic.rs        # Anthropic/Claude implementation
    openai.rs           # OpenAI implementation
    ollama.rs           # Ollama implementation (auto-detection)
    openai_compat.rs    # Generic OpenAI-compatible endpoint
    types.rs            # CompletionRequest, CompletionResponse, etc.
    prompts.rs          # Task scaffolding prompt templates
  scheduling/
    mod.rs              # Schedule generation entry point
    time_blocks.rs      # Open block detection algorithm
    assignment.rs       # Task-to-block assignment algorithm
    types.rs            # ScheduleBlock, WorkHours, etc.
  commands/
    ai_commands.rs      # Tauri IPC commands for AI operations
    scheduling_commands.rs  # Tauri IPC commands for scheduling
  db/
    sql/
      002_ai_scheduling.sql  # New tables: ai_providers, work_hours, scheduled_blocks

src/
  stores/
    aiSlice.ts          # AI provider config state, suggestion state
    schedulingSlice.ts  # Work hours, schedule blocks state
  components/
    detail/
      AiAssistButton.tsx      # Sparkle button component
      AiSuggestionPanel.tsx   # Inline diff-style suggestions
    sidebar/
      ScheduleStrip.tsx       # Day schedule with time blocks
      ScheduleBlock.tsx       # Individual block (meeting/work/buffer)
    settings/
      AiSettings.tsx          # AI Providers tab content
      ScheduleSettings.tsx    # Work Hours tab content
      ProviderCard.tsx        # Provider config card
      AddProviderDialog.tsx   # Add/edit provider dialog
```

### Pattern 1: Trait-Based AI Provider Abstraction

**What:** A Rust trait `AiProvider` that all provider implementations satisfy. The `AiGateway` routes requests to the configured default provider.

**When to use:** All AI operations (task scaffolding, future AI features).

**Example:**
```rust
// Source: ARCHITECTURE.md pattern + Anthropic/OpenAI API structures
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompletionRequest {
    pub system_prompt: String,
    pub user_message: String,
    pub max_tokens: u32,
    pub temperature: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompletionResponse {
    pub content: String,
    pub model: String,
    pub usage: TokenUsage,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenUsage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

#[async_trait::async_trait]
pub trait AiProvider: Send + Sync {
    fn name(&self) -> &str;
    fn provider_type(&self) -> ProviderType;
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, AiError>;
    async fn complete_stream(
        &self,
        request: CompletionRequest,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError>;
    async fn test_connection(&self) -> Result<bool, AiError>;
    async fn list_models(&self) -> Result<Vec<ModelInfo>, AiError>;
}

pub struct AiGateway {
    providers: HashMap<String, Box<dyn AiProvider>>,
    default_provider_id: Option<String>,
}
```

### Pattern 2: Streaming AI Responses via Tauri Events

**What:** When AI generates a task scaffold, stream partial results to the frontend via Tauri events rather than waiting for the complete response.

**When to use:** All AI completion calls (user sees progressive generation).

**Example:**
```rust
// Rust command handler
#[tauri::command]
async fn ai_assist_task(
    app: tauri::AppHandle,
    task_context: TaskContext,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    let gateway = { state.lock().unwrap().ai_gateway.clone() };
    let (tx, mut rx) = tokio::sync::mpsc::channel(32);

    // Spawn streaming in background
    tokio::spawn(async move {
        let request = build_scaffold_request(&task_context);
        let _ = gateway.complete_stream(request, tx).await;
    });

    // Forward stream chunks to frontend
    tokio::spawn(async move {
        while let Some(chunk) = rx.recv().await {
            let _ = app.emit("ai-stream-chunk", &chunk);
        }
        let _ = app.emit("ai-stream-complete", ());
    });

    Ok(())
}
```

```typescript
// Frontend listener
import { listen } from "@tauri-apps/api/event";

function useAiStream() {
  const [chunks, setChunks] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const unlisten1 = listen<string>("ai-stream-chunk", (event) => {
      setChunks((prev) => [...prev, event.payload]);
    });
    const unlisten2 = listen("ai-stream-complete", () => {
      setIsGenerating(false);
    });
    return () => { unlisten1.then(f => f()); unlisten2.then(f => f()); };
  }, []);

  return { chunks, isGenerating, setIsGenerating };
}
```

### Pattern 3: Greedy Time-Block Scheduling Algorithm

**What:** A deterministic algorithm that finds open blocks in a work day and assigns tasks by priority score.

**When to use:** Schedule generation on app launch and manual regeneration.

**Example:**
```rust
// Core scheduling algorithm
pub fn generate_schedule(
    work_hours: &WorkHours,
    calendar_events: &[CalendarEvent],
    tasks: &[TaskWithPriority],
    buffer_minutes: i32,
    min_block_minutes: i32,
    target_date: NaiveDate,
) -> Vec<ScheduleBlock> {
    // 1. Build timeline for the day (work_start to work_end)
    // 2. Mark calendar events as occupied
    // 3. Apply buffer_minutes around each event
    // 4. Find gaps >= min_block_minutes
    // 5. Sort tasks by score: priority_weight + due_date_urgency
    // 6. Greedily assign tasks to blocks (split if task > block)
    // 7. Return schedule blocks (meetings + work + buffers)
    todo!()
}

fn score_task(task: &TaskWithPriority, today: NaiveDate) -> f64 {
    let priority_weight = match task.priority {
        TaskPriority::Urgent => 100.0,
        TaskPriority::High => 75.0,
        TaskPriority::Medium => 50.0,
        TaskPriority::Low => 25.0,
    };

    let due_date_urgency = task.due_date.map_or(0.0, |due| {
        let days_until = (due - today).num_days() as f64;
        if days_until <= 0.0 { 50.0 }         // overdue: max boost
        else if days_until <= 1.0 { 40.0 }     // due today
        else if days_until <= 3.0 { 25.0 }     // due within 3 days
        else if days_until <= 7.0 { 10.0 }     // due this week
        else { 0.0 }
    });

    priority_weight + due_date_urgency
}
```

### Pattern 4: Provider-Specific API Normalization

**What:** Each provider has a different API shape. The provider implementation translates to/from the common `CompletionRequest`/`CompletionResponse` types.

**When to use:** Every provider implementation.

**Example (Anthropic):**
```rust
// Anthropic Messages API: POST https://api.anthropic.com/v1/messages
impl AnthropicProvider {
    fn build_request(&self, req: &CompletionRequest) -> serde_json::Value {
        serde_json::json!({
            "model": self.model,
            "max_tokens": req.max_tokens,
            "system": req.system_prompt,
            "messages": [
                { "role": "user", "content": req.user_message }
            ]
        })
    }
}

// OpenAI Chat Completions API: POST https://api.openai.com/v1/chat/completions
impl OpenAiProvider {
    fn build_request(&self, req: &CompletionRequest) -> serde_json::Value {
        serde_json::json!({
            "model": self.model,
            "max_tokens": req.max_tokens,
            "messages": [
                { "role": "system", "content": req.system_prompt },
                { "role": "user", "content": req.user_message }
            ]
        })
    }
}

// Ollama: POST http://localhost:11434/api/chat (or /v1/chat/completions for OpenAI compat)
impl OllamaProvider {
    fn build_request(&self, req: &CompletionRequest) -> serde_json::Value {
        serde_json::json!({
            "model": self.model,
            "messages": [
                { "role": "system", "content": req.system_prompt },
                { "role": "user", "content": req.user_message }
            ],
            "stream": false
        })
    }
}
```

### Anti-Patterns to Avoid

- **AI calls from the frontend directly:** All AI API calls must go through Rust backend via Tauri IPC. API keys never touch the frontend JavaScript context.
- **Blocking the UI during AI generation:** Always stream responses and show progress. Never `await` a full completion before showing anything.
- **Hardcoding provider-specific logic outside the provider module:** The gateway and all consumers should only use `CompletionRequest`/`CompletionResponse`. Provider-specific quirks stay inside provider implementations.
- **Schedule calculation in the frontend:** Schedule logic involves calendar events, task data, and work hours config -- all owned by the Rust backend. Calculate server-side, send results to frontend for display only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client | Raw TCP/TLS connections | `reqwest` crate | Connection pooling, TLS, timeouts, streaming, redirect handling |
| Secure credential storage | Encrypted file on disk | OS keychain via `keyring` crate or `tauri-plugin-stronghold` | OS-level security, not custom crypto |
| SSE/streaming parsing | Custom byte-level parser | `reqwest` byte stream + line-based splitting on `data:` prefix | SSE format is simple but has edge cases (multi-line data, empty lines) |
| UUID generation | Custom ID scheme | `uuid` crate (already in use) | Standards-compliant, collision-resistant |
| Date/time arithmetic | Manual minute calculations | `chrono` crate (already in use) | Time zone handling, DST edge cases, duration math |

**Key insight:** The AI provider APIs are deceptively simple REST endpoints, but the details matter: Anthropic uses `x-api-key` header while OpenAI uses `Authorization: Bearer`. Anthropic returns `content[0].text` while OpenAI returns `choices[0].message.content`. Ollama auto-detection requires a `GET /api/tags` call. These small differences multiply across providers -- the trait abstraction absorbs them.

## Common Pitfalls

### Pitfall 1: API Key Exposure in Frontend Context
**What goes wrong:** API keys passed to the frontend for direct API calls, visible in browser devtools/memory.
**Why it happens:** Tempting to use the Vercel AI SDK directly in React components.
**How to avoid:** All API keys stay in Rust backend. Frontend invokes Tauri commands, backend makes HTTP calls. Keys retrieved from OS keychain only when needed, never stored in memory longer than the request.
**Warning signs:** `import { anthropic } from '@ai-sdk/anthropic'` in any frontend file.

### Pitfall 2: Ollama Auto-Detection Hanging
**What goes wrong:** App startup blocks or hangs when Ollama is not running, because auto-detection makes a network call.
**Why it happens:** Synchronous connection attempt to `localhost:11434` with no timeout.
**How to avoid:** Auto-detection is async with a 2-second timeout. If Ollama is not reachable, provider shows as "unavailable" -- no error, no blocking. Detection runs only when user visits AI settings, not on app startup.
**Warning signs:** App takes > 5 seconds to start on machines without Ollama.

### Pitfall 3: AI Response Parsing Failures
**What goes wrong:** AI returns malformed JSON for the task scaffold, partial responses on timeout, or unexpected format.
**Why it happens:** LLM output is inherently unpredictable. Prompt says "return JSON" but model returns markdown-wrapped JSON or extra text.
**How to avoid:** Parse AI response with fallback strategies: (1) try direct JSON parse, (2) try extracting JSON from markdown code blocks, (3) try extracting individual fields via regex, (4) return raw text as description-only scaffold. Never crash on malformed AI output.
**Warning signs:** `JSON.parse()` or `serde_json::from_str()` with no error handling on AI response.

### Pitfall 4: Schedule Algorithm Edge Cases
**What goes wrong:** Schedule generates impossible or useless blocks. Examples: 5-minute gaps scheduled as work blocks, overnight meetings causing negative durations, all-day events not handled.
**Why it happens:** Calendar events have edge cases (multi-day events, no end time, recurring events that span midnight).
**How to avoid:** Clamp all events to the work day window. Skip all-day events (they don't block time in the same way). Enforce minimum block size strictly. Test with edge cases: zero events, overlapping events, events before/after work hours, events spanning the entire work day.
**Warning signs:** Schedule strip shows blocks of 5 or 10 minutes, or negative-duration blocks.

### Pitfall 5: Streaming State Management Complexity
**What goes wrong:** Multiple AI Assist clicks create interleaved streams, partial suggestions from a cancelled request overwrite new ones.
**Why it happens:** No request cancellation or request ID tracking.
**How to avoid:** Each AI assist request gets a unique ID. Frontend ignores stream chunks for stale request IDs. New request cancels previous in-flight request (drop the sender). Store `currentRequestId` in Zustand and filter events by it.
**Warning signs:** Clicking AI Assist twice shows mixed suggestions from both requests.

## Code Examples

### AI Provider API Endpoints Reference

```
Anthropic Messages API:
  POST https://api.anthropic.com/v1/messages
  Headers: x-api-key: {key}, anthropic-version: 2023-06-01, content-type: application/json
  Body: { model, max_tokens, system, messages: [{role, content}] }
  Response: { content: [{type: "text", text: "..."}], model, usage: {input_tokens, output_tokens} }

OpenAI Chat Completions API:
  POST https://api.openai.com/v1/chat/completions
  Headers: Authorization: Bearer {key}, Content-Type: application/json
  Body: { model, max_tokens, messages: [{role, content}] }
  Response: { choices: [{message: {content: "..."}}], model, usage: {prompt_tokens, completion_tokens} }

Ollama Chat API:
  POST http://localhost:11434/api/chat
  Body: { model, messages: [{role, content}], stream: false }
  Response: { message: {content: "..."}, model }

Ollama List Models:
  GET http://localhost:11434/api/tags
  Response: { models: [{name, size, ...}] }

Ollama OpenAI-Compatible:
  POST http://localhost:11434/v1/chat/completions
  (Same format as OpenAI)
```

### Task Scaffolding Prompt Template

```rust
fn build_scaffold_prompt(task: &TaskContext) -> CompletionRequest {
    let system = r#"You are a task planning assistant. Given a task title and optional context,
generate a structured scaffold. Respond with valid JSON only, no markdown wrapping.

JSON schema:
{
  "description": "detailed task description",
  "steps": ["step 1", "step 2", ...],
  "priority": "urgent|high|medium|low",
  "estimated_minutes": 30,
  "tags": ["tag1", "tag2"]
}

Keep descriptions actionable and concise. Steps should be concrete actions.
Priority should reflect complexity and urgency implied by the title.
Estimate duration realistically (most tasks: 30-120 minutes)."#;

    let user = format!(
        "Task title: {}\nProject: {}\nExisting description: {}\nExisting context: {}",
        task.title,
        task.project_name.as_deref().unwrap_or("(none)"),
        if task.description.is_empty() { "(none)" } else { &task.description },
        if task.context.is_empty() { "(none)" } else { &task.context },
    );

    CompletionRequest {
        system_prompt: system.to_string(),
        user_message: user,
        max_tokens: 1024,
        temperature: 0.3,
    }
}
```

### Database Migration (002)

```sql
-- AI provider configuration
CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY,
    provider_type TEXT NOT NULL
        CHECK(provider_type IN ('anthropic', 'openai', 'ollama', 'openai_compatible')),
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    base_url TEXT,
    credential_key TEXT,  -- reference to credential vault key name
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Work hours configuration (single row, user settings)
CREATE TABLE IF NOT EXISTS work_hours (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton row
    start_time TEXT NOT NULL DEFAULT '09:00',
    end_time TEXT NOT NULL DEFAULT '17:00',
    work_days TEXT NOT NULL DEFAULT 'mon,tue,wed,thu,fri',
    buffer_minutes INTEGER NOT NULL DEFAULT 10,
    min_block_minutes INTEGER NOT NULL DEFAULT 30,
    updated_at TEXT NOT NULL
);

-- Scheduled blocks for a given day
CREATE TABLE IF NOT EXISTS scheduled_blocks (
    id TEXT PRIMARY KEY,
    schedule_date TEXT NOT NULL,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL
        CHECK(block_type IN ('work', 'meeting', 'buffer')),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_confirmed INTEGER NOT NULL DEFAULT 0,
    source_event_id TEXT,  -- calendar event ID for meeting blocks
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_date ON scheduled_blocks(schedule_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_task ON scheduled_blocks(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_default ON ai_providers(is_default);
```

### Zustand Store Slices

```typescript
// aiSlice.ts
interface AiProvider {
  id: string;
  providerType: "anthropic" | "openai" | "ollama" | "openai_compatible";
  name: string;
  model: string;
  baseUrl: string | null;
  isDefault: boolean;
}

interface TaskScaffold {
  description?: string;
  steps?: string[];
  priority?: TaskPriority;
  estimatedMinutes?: number;
  tags?: string[];
}

interface AiSlice {
  providers: AiProvider[];
  isGenerating: boolean;
  currentRequestId: string | null;
  pendingSuggestions: TaskScaffold | null;
  loadProviders: () => Promise<void>;
  addProvider: (input: AddProviderInput) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  setDefaultProvider: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<boolean>;
  requestAiAssist: (taskId: string) => Promise<void>;
  acceptSuggestion: (field: keyof TaskScaffold) => void;
  dismissSuggestion: (field: keyof TaskScaffold) => void;
  acceptAll: () => void;
  dismissAll: () => void;
}

// schedulingSlice.ts
interface ScheduleBlock {
  id: string;
  blockType: "work" | "meeting" | "buffer";
  startTime: string;
  endTime: string;
  taskId?: string;
  taskTitle?: string;
  taskPriority?: TaskPriority;
  eventTitle?: string;
  isConfirmed: boolean;
  isContinuation: boolean;
}

interface WorkHoursConfig {
  startTime: string;
  endTime: string;
  workDays: string[];
  bufferMinutes: number;
  minBlockMinutes: number;
}

interface SchedulingSlice {
  todaySchedule: ScheduleBlock[];
  workHours: WorkHoursConfig | null;
  isScheduleLoading: boolean;
  loadWorkHours: () => Promise<void>;
  saveWorkHours: (config: WorkHoursConfig) => Promise<void>;
  generateSchedule: () => Promise<void>;
  applySchedule: () => Promise<void>;
  swapBlocks: (blockId1: string, blockId2: string) => void;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI SDK in JS (Vercel AI SDK) | Direct Rust HTTP via reqwest | 2025-2026 | Eliminates Node.js sidecar dependency; simpler architecture for desktop apps |
| Single provider hardcoded | Trait-based multi-provider | 2024+ | Industry standard since multi-model became common |
| Full calendar replication | Overlay on existing calendar data | Phase 4 foundation | Calendar events already flowing; just compute open blocks from existing data |
| Manual task scheduling | Algorithmic time-block filling | Reclaim.ai, Clockwise popularized 2022+ | Deterministic priority+due_date scoring is the standard approach |

**Deprecated/outdated:**
- `tauri-plugin-stronghold` is marked for deprecation in Tauri v3; prefer `keyring` crate or `tauri-plugin-keyring` for OS keychain access
- Ollama's `/api/generate` endpoint (use `/api/chat` for chat-style interactions, or `/v1/chat/completions` for OpenAI compatibility)

## Open Questions

1. **Credential vault implementation status (Phase 4 dependency)**
   - What we know: Phase 4 CONTEXT specifies OS keychain via Tauri secure storage for credential management
   - What's unclear: Phase 4 is not yet implemented -- the credential vault does not exist in the codebase yet
   - Recommendation: Phase 5 must build the credential storage layer if Phase 4 has not been completed. Use `keyring` crate (Rust) for OS keychain access. Store a reference key name in `ai_providers.credential_key` column, actual secret in OS keychain.

2. **Calendar event data availability**
   - What we know: Phase 4 CONTEXT specifies 5-minute poll calendar integration with event data in the app
   - What's unclear: No calendar integration code exists yet
   - Recommendation: For SCHED-01/SCHED-02, the schedule algorithm needs calendar event data. If Phase 4 calendar integration is not complete, use a stub/mock calendar data source. The scheduling algorithm is independent of how calendar data arrives.

3. **Task `due_date` and `estimated_duration` fields**
   - What we know: Current task model has no `due_date` or `estimated_duration` fields. SCHED-02 needs due dates for priority scoring. AI-02 suggests estimated duration.
   - What's unclear: Whether to add these fields to the existing `tasks` table or a separate table.
   - Recommendation: Add `due_date TEXT` and `estimated_minutes INTEGER` columns to the `tasks` table via migration 002. These are core task properties, not scheduling metadata.

4. **CLI/agent invocation scope**
   - What we know: CONTEXT says CLI invocation is "core to the vision" -- users invoke Claude Code, code-puppy, etc. from within Element
   - What's unclear: How deep the terminal emulation needs to go
   - Recommendation: Start with `tauri::api::process::Command` to spawn a CLI process, capture stdout/stderr, stream to a panel. Not a full terminal emulator -- just command execution with output display. Can evolve to PTY-based terminal later if needed.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest 4.1.x + Testing Library |
| Framework (backend) | cargo test (built-in) |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `npm run test && cd src-tauri && cargo test` |
| Full suite command | `npm run test && cd src-tauri && cargo test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | Provider trait implementations handle Claude/OpenAI/Ollama API formats | unit (Rust) | `cd src-tauri && cargo test ai::` | No -- Wave 0 |
| AI-01 | Provider CRUD (add/remove/set default) persists to DB | unit (Rust) | `cd src-tauri && cargo test ai::` | No -- Wave 0 |
| AI-01 | Settings UI renders providers, add/remove dialogs work | unit (TS) | `npx vitest run src/components/settings/AiSettings.test.tsx` | No -- Wave 0 |
| AI-02 | Task scaffold prompt produces valid JSON scaffold | unit (Rust) | `cd src-tauri && cargo test ai::prompts` | No -- Wave 0 |
| AI-02 | AI suggestion panel renders suggestions, accept/dismiss works | unit (TS) | `npx vitest run src/components/detail/AiSuggestionPanel.test.tsx` | No -- Wave 0 |
| AI-02 | AI assist button hidden when no provider configured | unit (TS) | `npx vitest run src/components/detail/AiAssistButton.test.tsx` | No -- Wave 0 |
| SCHED-01 | Open block detection with various calendar event configurations | unit (Rust) | `cd src-tauri && cargo test scheduling::time_blocks` | No -- Wave 0 |
| SCHED-01 | Work hours config CRUD | unit (Rust) | `cd src-tauri && cargo test scheduling::` | No -- Wave 0 |
| SCHED-02 | Task scoring and assignment to blocks | unit (Rust) | `cd src-tauri && cargo test scheduling::assignment` | No -- Wave 0 |
| SCHED-02 | Task splitting across multiple blocks | unit (Rust) | `cd src-tauri && cargo test scheduling::assignment::split` | No -- Wave 0 |
| SCHED-02 | Schedule strip renders blocks correctly | unit (TS) | `npx vitest run src/components/sidebar/ScheduleStrip.test.tsx` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test && cd src-tauri && cargo test`
- **Per wave merge:** `npm run test && cd src-tauri && cargo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src-tauri/src/ai/` module -- entire AI gateway module is new
- [ ] `src-tauri/src/scheduling/` module -- entire scheduling module is new
- [ ] `src-tauri/src/db/sql/002_ai_scheduling.sql` -- new migration for AI and scheduling tables
- [ ] `src-tauri/src/commands/ai_commands.rs` -- new Tauri IPC commands
- [ ] `src-tauri/src/commands/scheduling_commands.rs` -- new Tauri IPC commands
- [ ] `reqwest` dependency in Cargo.toml -- not yet added
- [ ] `async-trait` dependency in Cargo.toml -- needed for async trait methods
- [ ] Frontend test files for new components -- none exist yet
- [ ] Rust test files for new modules -- none exist yet
- [ ] `due_date` and `estimated_minutes` task columns -- migration needed

## Sources

### Primary (HIGH confidence)
- Anthropic Messages API: https://docs.anthropic.com/en/api/messages -- API shape, headers, response format
- OpenAI Chat Completions API: https://platform.openai.com/docs/api-reference/chat -- API shape, headers, response format
- Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md -- Chat endpoint, model listing, OpenAI compatibility
- Tauri 2 IPC: https://v2.tauri.app/concept/inter-process-communication/ -- Command system, event listeners
- Tauri 2 Sidecar: https://v2.tauri.app/learn/sidecar-nodejs/ -- Node.js sidecar approach (considered, not recommended)
- Existing codebase: `src-tauri/src/` -- Established patterns for Tauri commands, DB access, models

### Secondary (MEDIUM confidence)
- [Tauri Stronghold Plugin](https://v2.tauri.app/plugin/stronghold/) -- Secure storage, noted for v3 deprecation
- [tauri-plugin-keyring](https://github.com/HuakunShen/tauri-plugin-keyring) -- OS keychain wrapper for Tauri
- [Vercel AI SDK 6](https://vercel.com/blog/ai-sdk-6) -- Provider abstraction design (reference, not used directly)
- [Ollama OpenAI Compatibility](https://ollama.com/blog/openai-compatibility) -- OpenAI-compatible endpoint details

### Tertiary (LOW confidence)
- [anthropic-sdk-rust](https://crates.io/crates/anthropic-sdk-rust) -- Rust SDK option (not recommended due to dependency surface)
- [async-openai](https://docs.rs/async-openai) -- Rust OpenAI client (not recommended, prefer direct reqwest)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- reqwest + direct HTTP is well-established, AI provider APIs are documented and stable
- Architecture: HIGH -- Trait-based provider abstraction is the proven pattern (used by LiteLLM, AI SDK, aider); scheduling algorithm is deterministic and testable
- Pitfalls: HIGH -- Common failure modes well-documented across AI integration literature and observed in similar projects
- Open questions: MEDIUM -- Phase 4 dependency (credential vault, calendar data) creates uncertainty about what infrastructure will exist

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (AI provider APIs are stable; Ollama API may evolve)
