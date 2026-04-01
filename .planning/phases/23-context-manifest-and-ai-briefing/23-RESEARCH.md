# Phase 23: Context Manifest and AI Briefing - Research

**Researched:** 2026-04-01
**Domain:** Rust Tauri backend (context aggregation, AI streaming) + React frontend (streaming markdown UI)
**Confidence:** HIGH

## Summary

This phase adds two tightly coupled features: (1) a Rust-side context manifest that aggregates project and phase status across all projects into a token-budgeted markdown string cached in `Arc<Mutex<String>>`, and (2) a React frontend that streams an LLM-generated daily briefing into the hub center column using the existing AI gateway and Tauri event system.

The manifest is a new Tauri command (`build_context_manifest`) that queries SQLite for all projects and their phases, formats them as structured markdown, enforces a 2000-token budget via character-count heuristic (~4 chars/token = 8000 chars max), and caches the result in managed state. The briefing is a new Tauri command (`generate_briefing`) that reads the cached manifest, constructs a system prompt, calls the default AI provider via the existing `AiGateway` + `AiProvider::complete_stream`, and emits `briefing-chunk`/`briefing-complete`/`briefing-error` events to the frontend. The frontend renders streaming markdown via `react-markdown` in a new `briefingSlice` Zustand store.

**Primary recommendation:** Follow the existing `ai_assist_task` pattern in `ai_commands.rs` for streaming, the `generate_context_file` pattern in `onboarding_commands.rs` for data aggregation, and create a standalone `useBriefingStore` (not merged into the main AppStore) following the `useAgentStore` pattern.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Manifest includes projects + phases only. No individual tasks.
- D-02: Manifest is structured markdown with sections per project.
- D-03: Manifest is built by a Rust Tauri command (`build_context_manifest`) that queries SQLite directly.
- D-04: Token budget enforced via character-based estimate (~4 chars/token heuristic). Truncate if over 2000-token budget. No external tokenizer dependency.
- D-05: Manifest rebuilds on debounced DB mutations (task/phase status changes, ~5s debounce). Stays current without rebuilding on every keystroke.
- D-06: Cached manifest lives Rust-side in an `Arc<Mutex<String>>`. Tauri command returns it instantly. MCP sidecar can also read it.
- D-07: Briefing generated via the Rust AI gateway (existing provider system from aiSlice/onboarding_commands).
- D-08: Response streams as chunked Tauri events (`briefing-chunk`, `briefing-complete`). Hub component listens and appends. Matches existing `ai-stream-complete` pattern.
- D-09: Briefing auto-generates on hub load, is manually refreshable via a button, AND regenerates on a time loop (every 2-3 hours) while the hub is visible.
- D-10: Greeting style is warm and concise: "Good morning, Jake. Here's your day."
- D-11: Time-of-day aware: greeting shifts with time (morning / afternoon / evening).
- D-12: Adaptive edge state messaging: zero projects gets "No projects yet -- create one to get started." All caught up gets "Great work -- what else do you want to tackle today?"
- D-13: Briefing content rendered as markdown (react-markdown or similar).

### Claude's Discretion
- Specific LLM system prompt content and structure
- Debounce timing tuning (5s is a starting point)
- Time loop interval (2-3 hours is guidance, exact value is implementation detail)
- Markdown rendering library choice
- Briefing loading skeleton/placeholder design
- Whether to show "last refreshed" timestamp on the briefing

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTX-01 | System generates an in-memory context manifest aggregating all project/phase/task status | Rust `build_context_manifest` command queries `list_projects` + `list_phases` per project, formats as markdown, caches in `Arc<Mutex<String>>` managed state |
| CTX-02 | Manifest stays within a 2000-token budget for efficient LLM consumption | Character-based heuristic (8000 chars max at ~4 chars/token), truncation strategy documented below |
| CTX-03 | Manifest refreshes on relevant DB mutations (task/phase status changes) | Debounced backend event listener on `plan-saved` / task/phase mutation events, rebuilds cached string |
| BRIEF-01 | User sees a personalized greeting and AI-generated daily summary on hub load | `BriefingPanel` component in hub center column, time-of-day greeting from `BriefingGreeting`, streaming content from `BriefingContent` |
| BRIEF-02 | Briefing aggregates priorities across all projects (phases due, tasks overdue, upcoming) | Manifest provides project/phase status; LLM system prompt instructs prioritization, deadline highlighting, overdue flagging |
| BRIEF-03 | Briefing streams in via the existing AI gateway with loading state | `generate_briefing` Tauri command uses `AiGateway::get_default_provider` + `complete_stream`, emits `briefing-chunk` events; frontend `useBriefingStore` manages lifecycle |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 10.1.0 | Render briefing markdown in React | Standard ESM-only markdown renderer for React; D-13 specifies markdown rendering |
| zustand | 5.0.11 | Briefing state management (useBriefingStore) | Already in project; standalone store like useAgentStore |
| @tauri-apps/api | (existing) | Tauri event listening + command invocation | Already in project |
| reqwest | (existing) | HTTP client for AI provider calls | Already in project's Rust backend |
| tokio | (existing) | Async runtime for streaming | Already in project's Rust backend |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| remark-gfm | 4.0.0 | GitHub-flavored markdown (tables, strikethrough) | If briefing content uses GFM features like tables or task lists |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown | marked + dangerouslySetInnerHTML | react-markdown is safer (no raw HTML injection) and integrates with React component tree |
| Standalone useBriefingStore | Slice in main AppStore | Standalone is cleaner -- briefing state is independent and follows useAgentStore pattern |

**Installation:**
```bash
npm install react-markdown remark-gfm
```

**Version verification:** react-markdown 10.1.0 confirmed via npm registry (2026-04-01). remark-gfm 4.0.0 is the current stable.

## Architecture Patterns

### Recommended Project Structure
```
src-tauri/src/
  commands/
    manifest_commands.rs       # build_context_manifest, generate_briefing
  models/
    manifest.rs                # ManifestState, manifest builder logic
src/
  stores/
    useBriefingStore.ts        # Standalone Zustand store for briefing state
  hooks/
    useBriefingStream.ts       # Tauri event listener for briefing-chunk/complete/error
  components/
    hub/
      BriefingPanel.tsx        # Container: greeting + card + content
      BriefingGreeting.tsx     # Time-of-day greeting component
      BriefingContent.tsx      # Streaming markdown rendered via react-markdown
      BriefingSkeleton.tsx     # Loading placeholder
      BriefingRefreshButton.tsx # Ghost icon button with spin animation
```

### Pattern 1: Manifest Cache as Managed State
**What:** A `ManifestState` struct wrapping `Arc<Mutex<String>>` registered via `app.manage()` in `lib.rs`. The `build_context_manifest` command reads from this cache; a background rebuilder updates it on DB mutations.
**When to use:** Whenever Rust-side cached state needs to be shared across multiple Tauri commands.
**Example:**
```rust
// In manifest.rs
pub struct ManifestState {
    pub cached: Arc<Mutex<String>>,
}

// In lib.rs setup
app.manage(ManifestState {
    cached: Arc::new(Mutex::new(String::new())),
});

// In manifest_commands.rs
#[tauri::command]
pub async fn build_context_manifest(
    db_state: State<'_, Arc<Mutex<Database>>>,
    manifest_state: State<'_, ManifestState>,
) -> Result<String, String> {
    let manifest = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        build_manifest_string(&db)?
    };
    let mut cached = manifest_state.cached.lock().map_err(|e| e.to_string())?;
    *cached = manifest.clone();
    Ok(manifest)
}
```

### Pattern 2: Streaming Briefing via Tauri Events
**What:** Follow the exact pattern from `ai_assist_task` in `ai_commands.rs` -- extract DB data, build provider, create `mpsc` channel, spawn forwarder task, call `complete_stream`, emit completion/error events.
**When to use:** Any LLM streaming from Rust to frontend.
**Example:**
```rust
#[tauri::command]
pub async fn generate_briefing(
    app: AppHandle,
    db_state: State<'_, Arc<Mutex<Database>>>,
    manifest_state: State<'_, ManifestState>,
    gateway: State<'_, AiGateway>,
) -> Result<(), String> {
    // 1. Read cached manifest
    let manifest = {
        let cached = manifest_state.cached.lock().map_err(|e| e.to_string())?;
        cached.clone()
    };

    // 2. Get provider config (drop DB lock before async)
    let provider_config = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway.get_default_config(&db).map_err(|e| e.to_string())?
    };

    let provider = gateway.build_provider(&provider_config).map_err(|e| e.to_string())?;

    // 3. Build request
    let request = CompletionRequest {
        system_prompt: build_briefing_system_prompt(),
        user_message: manifest,
        max_tokens: 1024,
        temperature: 0.7,
    };

    // 4. Stream via channel (same pattern as ai_assist_task)
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(32);
    let app_clone = app.clone();
    let forwarder = tokio::spawn(async move {
        while let Some(chunk) = rx.recv().await {
            let _ = app_clone.emit("briefing-chunk", &chunk);
        }
    });

    let result = provider.complete_stream(request, tx).await;
    let _ = forwarder.await;

    match result {
        Ok(_) => { let _ = app.emit("briefing-complete", ()); Ok(()) }
        Err(e) => { let _ = app.emit("briefing-error", e.to_string()); Err(e.to_string()) }
    }
}
```

### Pattern 3: Standalone Zustand Store with Event Listeners
**What:** `useBriefingStore` is a standalone `create()` store (not a slice in AppStore), matching `useAgentStore` pattern. A `useBriefingStream` hook listens for Tauri events and dispatches store actions.
**When to use:** When state is independent from the main app store and has its own lifecycle.
**Example:**
```typescript
// useBriefingStore.ts
import { create } from "zustand";

type BriefingStatus = "idle" | "loading" | "streaming" | "complete" | "error";

interface BriefingState {
  briefingContent: string;
  briefingStatus: BriefingStatus;
  briefingError: string | null;
  lastRefreshedAt: number | null;
  requestBriefing: () => void;
  appendChunk: (chunk: string) => void;
  completeBriefing: () => void;
  failBriefing: (error: string) => void;
}

export const useBriefingStore = create<BriefingState>()((set) => ({
  briefingContent: "",
  briefingStatus: "idle",
  briefingError: null,
  lastRefreshedAt: null,
  requestBriefing: () => set({ briefingContent: "", briefingStatus: "loading", briefingError: null }),
  appendChunk: (chunk) => set((s) => ({
    briefingContent: s.briefingContent + chunk,
    briefingStatus: "streaming",
  })),
  completeBriefing: () => set({ briefingStatus: "complete", lastRefreshedAt: Date.now() }),
  failBriefing: (error) => set({ briefingStatus: "error", briefingError: error }),
}));
```

### Pattern 4: Debounced Manifest Rebuild
**What:** Listen for DB mutation events (task/phase CRUD) in Rust, debounce for 5 seconds, then rebuild the cached manifest. Use `tokio::time::sleep` in a spawned task with a shared `AtomicBool` or channel to coalesce rapid mutations.
**When to use:** When cached data needs to stay fresh but rebuilds are expensive relative to mutation frequency.
**Example:**
```rust
// In lib.rs setup, after managing ManifestState:
let rebuild_tx = spawn_manifest_rebuilder(app.handle().clone());
app.manage(ManifestRebuildTrigger(rebuild_tx));

// Mutation commands call:
let _ = rebuild_trigger.0.send(()).await;
// The rebuilder debounces internally
```

### Anti-Patterns to Avoid
- **Holding DB lock across await:** Extract all DB data synchronously, drop the lock, THEN do async work. The existing `ai_assist_task` demonstrates this correctly.
- **Returning new object refs from Zustand selectors:** Per project memory, never return `{ content, status }` -- use primitive selectors like `useBriefingStore(s => s.briefingStatus)`.
- **Rebuilding manifest on every task edit:** Use debounce (5s). Rapid edits during a work session should not trigger N rebuilds.
- **Including individual tasks in manifest:** D-01 explicitly excludes them -- only project + phase level. Task counts (total/completed per phase) are acceptable as summary stats.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom parser or dangerouslySetInnerHTML | react-markdown 10.1.0 | XSS safety, React component integration, streaming-friendly (re-renders on content change) |
| Token counting | Custom tokenizer or tiktoken binding | Character heuristic (~4 chars/token) | D-04 explicitly chose this approach; good enough for budget enforcement |
| Debounce logic | Manual setTimeout tracking | tokio debounce pattern with mpsc channel | Rust-side debounce is more reliable than frontend; coalesces across all mutation sources |
| Time-of-day greeting | Complex timezone logic | Simple hour check: `< 12` morning, `< 17` afternoon, else evening | Local system time via `chrono::Local::now()` or JS `new Date().getHours()` |

**Key insight:** The manifest builder is the only truly new logic. Everything else reuses existing patterns (AI gateway streaming, Zustand stores, Tauri events). The complexity is in wiring, not invention.

## Common Pitfalls

### Pitfall 1: DB Lock Held Across Async Boundary
**What goes wrong:** `Mutex<Database>` is not `Send`-safe across `.await` points. Holding the lock while calling `complete_stream` deadlocks or panics.
**Why it happens:** Natural to write `let db = state.lock()` then use `db` later in the same async block.
**How to avoid:** Extract all data into local variables in a scoped block `{ let db = ...; let data = ...; data }`, then proceed with async work. See `ai_assist_task` lines 103-114 for the canonical pattern.
**Warning signs:** Compilation errors about `MutexGuard` not implementing `Send`.

### Pitfall 2: Manifest Size Blowup with Many Projects
**What goes wrong:** 50+ projects with 10+ phases each could exceed the 8000-char budget.
**Why it happens:** Each project gets a section with phase listings.
**How to avoid:** Truncation strategy: (1) include all projects with just name + active phase count, (2) expand detail only for projects with in-progress phases, (3) if still over budget, truncate oldest/least-active projects with a "[N more projects]" summary line. Always measure after building, truncate if needed.
**Warning signs:** Manifest string length > 8000 chars in testing.

### Pitfall 3: react-markdown ESM Import Issues
**What goes wrong:** react-markdown 10.x is ESM-only. Incorrect import or bundler config causes "require is not defined" or similar errors.
**Why it happens:** CJS/ESM boundary issues with some bundler configurations.
**How to avoid:** Vite (which Tauri uses) handles ESM natively. Use `import ReactMarkdown from 'react-markdown'` -- no special config needed.
**Warning signs:** Build errors mentioning CommonJS or require().

### Pitfall 4: Briefing Regeneration Race Condition
**What goes wrong:** User clicks refresh while a timer-triggered generation is in progress, causing interleaved chunks from two generations.
**Why it happens:** No guard against concurrent generation.
**How to avoid:** Track a `requestId` (UUID) in the store. On each new generation request, set a new `requestId`. When chunks arrive, verify they match the current `requestId` -- or simpler, just clear content on new request start and let the latest stream win. The UI spec already says "old content replaced as new chunks arrive" and "refresh button disabled while streaming."
**Warning signs:** Garbled briefing content, mixed text from two generations.

### Pitfall 5: Missing Default AI Provider
**What goes wrong:** `generate_briefing` calls `gateway.get_default_config()` which returns an error if no provider is configured.
**Why it happens:** New users or users who removed their provider.
**How to avoid:** Check for default provider before calling. If none, emit `briefing-error` with "No AI provider configured" message. The UI spec already defines the error state: "Check your AI provider settings and try again."
**Warning signs:** Unhandled error toast on hub load.

### Pitfall 6: User Name Not Set for Greeting
**What goes wrong:** Greeting shows "Good morning, undefined" or empty name.
**Why it happens:** No `user_name` app setting exists yet.
**How to avoid:** Fall back to OS username (`whoami` equivalent) or omit the name entirely: "Good morning. Here's your day." The `get_app_setting("user_name")` call can be added, with a future settings UI to set it. For now, use a sensible default.
**Warning signs:** Empty or placeholder name in greeting.

## Code Examples

### Manifest Builder (Rust)
```rust
// Source: Pattern derived from generate_context_file in onboarding_commands.rs
fn build_manifest_string(db: &Database) -> Result<String, String> {
    let projects = db.list_projects().map_err(|e| e.to_string())?;
    let mut manifest = String::from("# Project Status\n\n");
    let now = chrono::Local::now();
    manifest.push_str(&format!("Generated: {}\n\n", now.format("%Y-%m-%d %H:%M")));

    for project in &projects {
        manifest.push_str(&format!("## {}\n", project.name));
        let phases = db.list_phases(&project.id).map_err(|e| e.to_string())?;
        if phases.is_empty() {
            manifest.push_str("No phases defined.\n\n");
            continue;
        }
        for phase in &phases {
            // Query task counts per phase for summary stats
            let tasks = db.list_tasks(&project.id).map_err(|e| e.to_string())?;
            let phase_tasks: Vec<_> = tasks.iter().filter(|t| t.phase_id.as_deref() == Some(&phase.id)).collect();
            let completed = phase_tasks.iter().filter(|t| t.status == TaskStatus::Complete).count();
            let total = phase_tasks.len();
            manifest.push_str(&format!("- Phase {}: {} ({}/{})\n",
                phase.sort_order + 1, phase.name, completed, total));
        }
        manifest.push_str("\n");
    }

    // Enforce token budget: ~4 chars/token, 2000 token budget = 8000 chars
    if manifest.len() > 8000 {
        manifest.truncate(7900);
        manifest.push_str("\n\n[...truncated for token budget]\n");
    }

    Ok(manifest)
}
```

### Briefing Event Listener Hook (TypeScript)
```typescript
// Source: Pattern from useAiStream.ts
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useBriefingStore } from "../stores/useBriefingStore";

export function useBriefingStream() {
  const appendChunk = useBriefingStore((s) => s.appendChunk);
  const completeBriefing = useBriefingStore((s) => s.completeBriefing);
  const failBriefing = useBriefingStore((s) => s.failBriefing);

  useEffect(() => {
    const u1 = listen<string>("briefing-chunk", (e) => appendChunk(e.payload));
    const u2 = listen("briefing-complete", () => completeBriefing());
    const u3 = listen<{ error: string }>("briefing-error", (e) => failBriefing(e.payload.error));
    return () => {
      u1.then((f) => f());
      u2.then((f) => f());
      u3.then((f) => f());
    };
  }, [appendChunk, completeBriefing, failBriefing]);
}
```

### Time-of-Day Greeting (TypeScript)
```typescript
function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const nameStr = name ? `, ${name}` : "";
  if (hour < 12) return `Good morning${nameStr}. Here's your day.`;
  if (hour < 17) return `Good afternoon${nameStr}. Here's where things stand.`;
  return `Good evening${nameStr}. Here's your wrap-up.`;
}
```

### Streaming Markdown Rendering (React)
```tsx
import ReactMarkdown from "react-markdown";
import { useBriefingStore } from "@/stores/useBriefingStore";

function BriefingContent() {
  const content = useBriefingStore((s) => s.briefingContent);
  const status = useBriefingStore((s) => s.briefingStatus);

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
      {status === "streaming" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-markdown 8.x (CJS) | react-markdown 10.x (ESM-only) | 2024 | Must use ESM imports; Vite handles this natively |
| remark-react (deprecated) | react-markdown | 2023 | react-markdown is the maintained successor |
| Custom streaming state | Zustand with event listeners | Already established in project | Follow existing useAiStream + aiSlice patterns |

**Deprecated/outdated:**
- `remark-react`: Deprecated, use react-markdown instead
- react-markdown < 9: CJS versions, no longer maintained

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust: `cargo test`, TypeScript: Vitest (if configured) |
| Config file | `src-tauri/Cargo.toml` for Rust tests |
| Quick run command | `cd src-tauri && cargo test manifest` |
| Full suite command | `cd src-tauri && cargo test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTX-01 | Manifest aggregates all projects/phases | unit | `cd src-tauri && cargo test test_build_manifest` | No -- Wave 0 |
| CTX-02 | Manifest stays under 2000-token budget | unit | `cd src-tauri && cargo test test_manifest_token_budget` | No -- Wave 0 |
| CTX-03 | Manifest refreshes on DB mutations | integration | Manual verification (debounced rebuild) | No -- manual-only |
| BRIEF-01 | Greeting + briefing on hub load | manual | Visual verification in app | No -- manual-only |
| BRIEF-02 | Briefing reflects project priorities | manual | Visual verification of LLM output quality | No -- manual-only |
| BRIEF-03 | Briefing streams with loading state | manual | Visual verification of streaming UX | No -- manual-only |

### Sampling Rate
- **Per task commit:** `cd src-tauri && cargo test manifest`
- **Per wave merge:** `cd src-tauri && cargo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/models/manifest.rs` tests -- covers CTX-01, CTX-02
- [ ] Test helper: create N projects with M phases to verify truncation behavior
- [ ] No frontend test infrastructure needed for manual-only BRIEF requirements

## Open Questions

1. **User name source for greeting**
   - What we know: `get_app_setting("user_name")` can store/retrieve it. No settings UI for user name exists.
   - What's unclear: Should we add a setting UI, use OS username, or hardcode a default?
   - Recommendation: Use `get_app_setting("user_name")` with fallback to empty string (greeting without name). Name setting can be added in a future settings phase.

2. **Manifest rebuild trigger mechanism**
   - What we know: DB mutations happen through Tauri commands. The frontend emits events like `plan-saved`. Rust-side, we could hook into command completion.
   - What's unclear: Best debounce implementation in Rust (tokio task with channel vs. timer reset pattern).
   - Recommendation: Use a `tokio::sync::mpsc` channel. Mutation commands send a unit message. A spawned background task receives messages and waits 5 seconds after the last message before rebuilding. Simple and proven.

3. **Briefing timer behavior when hub is not visible**
   - What we know: D-09 says "while the hub is visible." The timer should not fire when user is in a project view.
   - What's unclear: How the frontend detects "hub is visible" -- activeView state from Phase 22.
   - Recommendation: The timer lives in the `BriefingPanel` component via `useEffect` with `setInterval`. When the component unmounts (user navigates away from hub), the interval is cleared automatically. Clean React lifecycle.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src-tauri/src/commands/ai_commands.rs` -- streaming pattern (ai_assist_task)
- Codebase analysis: `src-tauri/src/commands/onboarding_commands.rs` -- data aggregation pattern (generate_context_file)
- Codebase analysis: `src-tauri/src/ai/gateway.rs` -- AiGateway, provider building, default config
- Codebase analysis: `src-tauri/src/ai/provider.rs` -- AiProvider trait with complete_stream
- Codebase analysis: `src-tauri/src/ai/types.rs` -- CompletionRequest, CompletionResponse
- Codebase analysis: `src/hooks/useAiStream.ts` -- Tauri event listener pattern
- Codebase analysis: `src/stores/useAgentStore.ts` -- standalone Zustand store pattern
- Codebase analysis: `src/stores/aiSlice.ts` -- AI state management pattern
- npm registry: react-markdown 10.1.0 (verified 2026-04-01)
- Phase 23 UI Spec: `23-UI-SPEC.md` -- component inventory, state contract, event contract

### Secondary (MEDIUM confidence)
- Phase 23 CONTEXT.md decisions D-01 through D-13

### Tertiary (LOW confidence)
- remark-gfm version (4.0.0 assumed from training data, not registry-verified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- react-markdown version verified, all Rust dependencies already in project
- Architecture: HIGH -- all patterns directly derived from existing codebase analysis
- Pitfalls: HIGH -- identified from actual code patterns and known Rust async constraints

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain, no fast-moving dependencies)
