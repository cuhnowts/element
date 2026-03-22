# Phase 11: Workspace Integration and AI Context - Research

**Researched:** 2026-03-22
**Domain:** Workspace state management, AI-driven context summaries, progress suggestions
**Confidence:** HIGH

## Summary

Phase 11 adds three capabilities to Element: (1) per-project workspace state (remembered tab, drawer, and layout per project), (2) AI-generated "where was I?" summaries on project switch, and (3) AI-driven progress suggestions in Track+Suggest mode. The implementation builds entirely on existing infrastructure -- the AiGateway provider abstraction for AI calls, Zustand stores for state, and the ProjectDetail component as the rendering surface.

The core technical challenge is prompt engineering for concise, useful summaries from task/phase data, and wiring the project-switch event to trigger AI generation with proper gating (idle threshold, AI mode checks). No new database tables are needed -- all data comes from existing task/phase queries with aggregation, and workspace state lives in Zustand memory.

**Primary recommendation:** Extend `useWorkspaceStore` with a per-project state map, add two new Rust commands (`generate_context_summary` and `generate_suggestions`) that query task/phase data and call AiGateway, and render summary/suggestion cards in ProjectDetail using the existing AiSuggestionPanel visual language.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Auto-switch to project view on project selection. Center panel shows project detail by default. AI summary card appears at top of project detail.
- **D-02:** Per-project tab memory -- workspace remembers last-active center panel tab per project.
- **D-03:** Per-project drawer state -- drawer open/closed and active tab saved per project.
- **D-04:** "Where was I?" summary triggers on project switch after 30+ minutes idle from that project. First open in session always shows summary.
- **D-05:** Summary content: recent task completions, current phase status, AI-suggested next actions. 3-5 bullet points max.
- **D-06:** Summary via AiGateway. Fallback when no provider: template summary with task counts and phase progress.
- **D-07:** Summary as dismissible card at top of project detail view, above directory link and progress bar.
- **D-08:** Track+Suggest surfaces task-focused suggestions: next tasks, stalled phase alerts, untouched task reminders, phase completion nudges.
- **D-09:** Suggestion cards below summary, each with action button and dismiss button.
- **D-10:** Suggestions refresh on project switch only. No background polling. Dismissed suggestions don't reappear until next switch.
- **D-11:** On-demand mode: no auto-generated AI features. Clean project view.
- **D-12:** Track+Auto-execute shows same summary/suggestions as Track+Suggest.
- **D-13:** AI context from existing task data only. No new tracking infrastructure or tables.
- **D-14:** Last-viewed timestamp per project in Zustand in-memory state (not persisted). Resets on app restart.

### Claude's Discretion
- AI prompt design for context summary and suggestion generation
- Exact idle threshold (30min suggested but adjustable)
- How per-project workspace state is structured in Zustand (map keyed by project ID, etc.)
- Loading/skeleton state while AI summary generates
- Animation/transition for summary card appearance and dismissal
- How suggestion action buttons route to the relevant task or phase

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AIAS-02 | AI generates a "where was I?" context summary when user switches to a project | D-04 through D-07: Idle threshold gating, AiGateway call with fallback template, dismissible card UI. Supported by existing `AiProvider.complete()` + `prompts.rs` pattern. |
| AIAS-03 | AI tracks project progress and surfaces relevant suggestions (in Track+Suggest mode) | D-08 through D-12: Task-focused suggestions, card UI with action/dismiss, mode gating. Supported by existing task query infrastructure + AiGateway. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No CLAUDE.md file exists in the project root. No project-specific constraints to enforce.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | (in project) | Per-project workspace state, context summary state | Already used for all app state |
| Tauri commands | v2 | Backend AI context generation commands | Established command pattern |
| AiGateway + providers | (in project) | Model-agnostic AI completions | Already handles Anthropic, OpenAI, Ollama, OpenAI-compat |
| rusqlite | (in project) | Aggregate queries for task/phase data | Already used for all DB access |
| shadcn/ui | (in project) | Card, Button, Skeleton for summary/suggestion UI | Already used for all UI components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (in project) | Icons for summary/suggestion cards (Bot, Lightbulb, X) | Card header icons per D-07/D-09 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand in-memory map | localStorage per-project | Overkill for UI-only state that can reset on restart (D-14 explicitly says in-memory) |
| Non-streaming AI call | Streaming | Summary is short (3-5 bullets); non-streaming `complete()` is simpler and sufficient |

**Installation:** No new packages needed. All dependencies are already in the project.

## Architecture Patterns

### Recommended Project Structure
```
src-tauri/src/ai/
  prompts.rs          # ADD: build_context_summary_request, build_suggestions_request
  gateway.rs          # UNCHANGED
  provider.rs         # UNCHANGED
  types.rs            # ADD: ContextSummary, ProjectSuggestion response types

src-tauri/src/commands/
  ai_commands.rs      # ADD: generate_context_summary, generate_suggestions commands

src/stores/
  useWorkspaceStore.ts  # EXTEND: per-project state map
  contextSlice.ts       # NEW: context summary + suggestion state (or extend aiSlice)

src/components/center/
  ProjectDetail.tsx        # EXTEND: render summary and suggestion cards at top
  ContextSummaryCard.tsx   # NEW: "where was I?" dismissible card
  SuggestionCard.tsx       # NEW: individual suggestion card with action/dismiss
```

### Pattern 1: Per-Project Workspace State Map
**What:** A `Record<string, ProjectWorkspaceState>` in `useWorkspaceStore` keyed by project ID, storing last-active center tab, drawer state, and last-viewed timestamp.
**When to use:** On every project switch (read to restore) and on every layout change (write to persist).
**Example:**
```typescript
// In useWorkspaceStore.ts
interface ProjectWorkspaceState {
  centerTab: 'detail' | 'files';
  drawerOpen: boolean;
  drawerTab: 'logs' | 'history' | 'terminal';
  lastViewedAt: number; // Date.now() timestamp, in-memory only
}

interface WorkspaceState {
  // ... existing global fields ...
  projectStates: Record<string, ProjectWorkspaceState>;
  getProjectState: (projectId: string) => ProjectWorkspaceState;
  setProjectState: (projectId: string, partial: Partial<ProjectWorkspaceState>) => void;
  recordProjectView: (projectId: string) => void;
  shouldShowSummary: (projectId: string) => boolean;
}
```

### Pattern 2: Project Switch -> AI Summary Flow
**What:** When `selectedProjectId` changes, check idle threshold, determine AI mode, generate or skip summary.
**When to use:** Every project switch event.
**Example:**
```typescript
// In a useEffect watching selectedProjectId
useEffect(() => {
  if (!selectedProjectId) return;

  const projectState = getProjectState(selectedProjectId);
  const aiMode = project?.aiMode; // from Phase 10's ai_mode column

  // On-demand mode: no auto summary
  if (aiMode === 'on-demand') return;

  // Check idle threshold
  if (shouldShowSummary(selectedProjectId)) {
    generateContextSummary(selectedProjectId);
  }

  // Record this view
  recordProjectView(selectedProjectId);
}, [selectedProjectId]);
```

### Pattern 3: Backend Context Aggregation + AI Call
**What:** Rust command queries task/phase data, builds a structured context string, calls AiGateway, returns parsed summary.
**When to use:** `generate_context_summary` and `generate_suggestions` commands.
**Example:**
```rust
// In ai_commands.rs
#[tauri::command]
pub async fn generate_context_summary(
    project_id: String,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
) -> Result<ContextSummary, String> {
    // 1. Query task/phase data while holding lock
    let context_data = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gather_project_context(&db, &project_id)
            .map_err(|e| e.to_string())?
    };

    // 2. Try AI provider
    let provider_result = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway.get_default_config(&db)
    };

    match provider_result {
        Ok(config) => {
            let provider = gateway.build_provider(&config).map_err(|e| e.to_string())?;
            let request = build_context_summary_request(&context_data);
            let response = provider.complete(request).await.map_err(|e| e.to_string())?;
            parse_context_summary(&response.content).map_err(|e| e.to_string())
        }
        Err(_) => {
            // Fallback: template summary
            Ok(build_template_summary(&context_data))
        }
    }
}
```

### Pattern 4: Fallback Template Summary (No AI Provider)
**What:** When no AI provider is configured, generate a structured summary from raw data.
**When to use:** Fallback per D-06.
**Example:**
```rust
fn build_template_summary(data: &ProjectContext) -> ContextSummary {
    let mut bullets = Vec::new();

    if data.recently_completed > 0 {
        bullets.push(format!("{} task(s) completed recently", data.recently_completed));
    }
    bullets.push(format!(
        "Current phase: {} ({}/{} tasks done)",
        data.current_phase_name, data.phase_complete, data.phase_total
    ));
    bullets.push(format!(
        "Overall progress: {}/{} tasks complete",
        data.total_complete, data.total_tasks
    ));
    // ... next incomplete tasks as suggestions

    ContextSummary {
        bullets,
        is_ai_generated: false,
        note: Some("Configure an AI provider in Settings for smarter summaries.".into()),
    }
}
```

### Anti-Patterns to Avoid
- **Polling for suggestions:** D-10 explicitly says no background polling. Generate once on project switch, dismiss locally.
- **Persisting last-viewed to DB:** D-14 says in-memory only. Don't add a database column for timestamps.
- **Streaming for short summaries:** The summary is 3-5 bullet points. Use `complete()` (non-streaming), not `complete_stream()`. Simpler error handling, no event forwarding needed.
- **Separate summary fetch per card type:** Generate summary and suggestions in one backend call or two parallel calls, not sequentially blocking UI.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI completions | Custom HTTP client | AiGateway + AiProvider trait | Already supports 4 provider types with auth, error handling |
| Dismissible card UI | Custom card component from scratch | Extend AiSuggestionPanel pattern | Already has accept/dismiss per-field, left-border accent styling |
| State persistence | Manual localStorage | Zustand persist middleware | useWorkspaceStore already uses it; just add `partialize` for new fields |
| JSON response parsing | Manual string parsing | serde_json + regex fallback | Exact pattern in `parse_scaffold_response` already handles JSON + code blocks |

**Key insight:** This phase is almost entirely integration work. Every building block exists -- AI gateway, prompt patterns, Zustand state, card UI. The new work is prompt design, data aggregation queries, and wiring the project-switch trigger.

## Common Pitfalls

### Pitfall 1: Mutex Lock Held Across Async Boundary
**What goes wrong:** Holding `db_state.lock()` across an `await` point causes the Mutex to be held for the entire AI API call (seconds), blocking all other Tauri commands.
**Why it happens:** The pattern looks natural: lock DB, read data, call AI, return.
**How to avoid:** Extract all DB data into local variables while holding the lock, drop the lock, THEN make the async AI call. The existing `ai_assist_task` command already demonstrates this correctly.
**Warning signs:** App freezes during AI generation; other panels stop updating.

### Pitfall 2: Race Condition on Fast Project Switching
**What goes wrong:** User switches projects rapidly. AI summary for project A returns after user is now on project B, overwriting project B's state.
**Why it happens:** Async AI call takes 1-3 seconds. User doesn't wait.
**How to avoid:** Tag each summary request with the project ID it was generated for. On response, only apply if `selectedProjectId` still matches. Use a request ID pattern (like existing `currentRequestId` in aiSlice).
**Warning signs:** Summary content doesn't match current project.

### Pitfall 3: AI Provider Error Crashes Summary Flow
**What goes wrong:** AI provider returns error (rate limit, auth expired), and UI gets stuck in loading state.
**Why it happens:** Error path not handled; fallback not triggered.
**How to avoid:** Catch AI errors and fall back to template summary. Always resolve the summary -- never leave the card in a permanent loading state.
**Warning signs:** Skeleton loader stuck indefinitely after project switch.

### Pitfall 4: Missing Phase Data Before Phase 7 Completion
**What goes wrong:** Phase 11 code references phase tables/queries that Phase 7 introduces. If Phase 7 hasn't been executed yet in the database, queries fail.
**Why it happens:** Phase 7 adds the phases table and related queries.
**How to avoid:** Make phase-related aggregation queries defensive -- if the phases table or phase_id column doesn't exist, gracefully degrade to task-only summaries. Alternatively, ensure Phase 7 migration runs before Phase 11 code executes (which it will, since migrations run on app start).
**Warning signs:** SQL errors about missing tables/columns.

### Pitfall 5: Zustand Partial Persist Leaking Timestamps
**What goes wrong:** Per-project `lastViewedAt` timestamps get persisted to localStorage, causing stale summary behavior across app restarts.
**Why it happens:** `partialize` in persist middleware doesn't exclude the new fields.
**How to avoid:** Per D-14, `lastViewedAt` must NOT be persisted. Only persist `centerTab`, `drawerOpen`, `drawerTab` in `partialize`. Or keep timestamps in a separate non-persisted part of the store.
**Warning signs:** Summary doesn't show on first project open after restart.

## Code Examples

### Gather Project Context (Rust)
```rust
// Source: Derived from existing task.rs query patterns
struct ProjectContext {
    project_name: String,
    total_tasks: usize,
    total_complete: usize,
    recently_completed: usize,  // last 7 days
    in_progress: usize,
    blocked: usize,
    current_phase_name: Option<String>,
    phase_complete: usize,
    phase_total: usize,
    next_incomplete_tasks: Vec<String>,  // titles of next 3 incomplete tasks
}

fn gather_project_context(db: &Database, project_id: &str) -> Result<ProjectContext, rusqlite::Error> {
    let tasks = db.list_tasks(project_id)?;
    let total = tasks.len();
    let complete = tasks.iter().filter(|t| t.status == TaskStatus::Complete).count();
    let in_progress = tasks.iter().filter(|t| t.status == TaskStatus::InProgress).count();
    let blocked = tasks.iter().filter(|t| t.status == TaskStatus::Blocked).count();

    // Recently completed: tasks with updated_at in last 7 days and status complete
    let seven_days_ago = chrono::Utc::now() - chrono::Duration::days(7);
    let recently_completed = tasks.iter()
        .filter(|t| t.status == TaskStatus::Complete)
        .filter(|t| chrono::DateTime::parse_from_rfc3339(&t.updated_at)
            .map(|dt| dt > seven_days_ago)
            .unwrap_or(false))
        .count();

    let next_incomplete: Vec<String> = tasks.iter()
        .filter(|t| t.status == TaskStatus::Pending || t.status == TaskStatus::InProgress)
        .take(3)
        .map(|t| t.title.clone())
        .collect();

    Ok(ProjectContext {
        project_name: db.get_project(project_id)?.name,
        total_tasks: total,
        total_complete: complete,
        recently_completed,
        in_progress,
        blocked,
        current_phase_name: None, // Phase 7 will add phase queries
        phase_complete: 0,
        phase_total: 0,
        next_incomplete_tasks: next_incomplete,
    })
}
```

### Context Summary Prompt (Rust)
```rust
// Source: Follows existing build_scaffold_request pattern in prompts.rs
pub fn build_context_summary_request(context: &ProjectContext) -> CompletionRequest {
    let system = r#"You are a project assistant. Given project progress data, generate a concise "where was I?" summary. Respond with valid JSON only.

JSON schema:
{
  "bullets": ["bullet 1", "bullet 2", ...],
  "suggested_next": ["action 1", "action 2"]
}

Rules:
- 3-5 bullet points maximum for bullets
- 1-3 suggested next actions
- Be concise and actionable
- Focus on what changed recently and what needs attention
- If tasks are blocked, mention them
- If a phase is nearly complete, highlight it"#;

    let user = format!(
        "Project: {}\nTotal tasks: {} ({} complete, {} in-progress, {} blocked)\nRecently completed (7d): {}\nCurrent phase: {} ({}/{} done)\nNext incomplete tasks: {}",
        context.project_name,
        context.total_tasks, context.total_complete, context.in_progress, context.blocked,
        context.recently_completed,
        context.current_phase_name.as_deref().unwrap_or("(no phases)"),
        context.phase_complete, context.phase_total,
        context.next_incomplete_tasks.join(", ")
    );

    CompletionRequest {
        system_prompt: system.to_string(),
        user_message: user,
        max_tokens: 512,
        temperature: 0.3,
    }
}
```

### Dismissible Summary Card (React)
```tsx
// Source: Follows AiSuggestionPanel.tsx card pattern
interface ContextSummaryCardProps {
  summary: ContextSummary;
  onDismiss: () => void;
}

function ContextSummaryCard({ summary, onDismiss }: ContextSummaryCardProps) {
  return (
    <div className="rounded-lg bg-card p-4 border-l-2" style={{ borderColor: 'oklch(0.6 0.118 184.714)' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Where was I?</span>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
          <X className="size-3" />
        </Button>
      </div>
      <ul className="space-y-1 text-sm">
        {summary.bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-muted-foreground mt-0.5">-</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      {summary.note && (
        <p className="mt-2 text-xs text-muted-foreground italic">{summary.note}</p>
      )}
    </div>
  );
}
```

### Suggestion Card (React)
```tsx
interface SuggestionCardProps {
  suggestion: ProjectSuggestion;
  onAction: () => void;
  onDismiss: () => void;
}

function SuggestionCard({ suggestion, onAction, onDismiss }: SuggestionCardProps) {
  return (
    <div className="rounded-lg bg-card p-3 border-l-2 border-muted">
      <div className="flex items-start gap-2">
        <Lightbulb className="size-4 text-yellow-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm">{suggestion.text}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="outline" size="sm" onClick={onAction}>
            {suggestion.actionLabel}
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
            <X className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI streaming for all responses | Non-streaming for short responses | Project convention | Use `complete()` for summaries (short), `complete_stream()` for scaffolds (long) |
| Global workspace state | Per-project workspace state | Phase 11 | `useWorkspaceStore` evolves from flat global state to project-keyed map |

**Deprecated/outdated:**
- None relevant. All infrastructure is current.

## Open Questions

1. **Phase data availability**
   - What we know: Phase 7 introduces the phases table and queries. Phase 11 depends on Phase 7 being complete.
   - What's unclear: The exact shape of phase queries (list phases for project, phase progress) -- depends on Phase 7 implementation.
   - Recommendation: Code defensively. If phase queries exist, use them. If not (e.g., Phase 7 not yet merged), degrade to task-only summaries. The prompt and aggregation code should treat phase data as optional.

2. **AI mode field on projects**
   - What we know: Phase 10 (D-18) adds `ai_mode` column to projects table and the dropdown UI.
   - What's unclear: Exact column name, enum values, default value in DB.
   - Recommendation: Assume `ai_mode TEXT NOT NULL DEFAULT 'on-demand' CHECK(ai_mode IN ('track-suggest', 'track-auto-execute', 'on-demand'))` based on Phase 10 decisions. Read from project record to gate AI features.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). Phase 11 is purely code/config changes using existing project infrastructure.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1 |
| Config file | Implicit via `vite.config.ts` |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AIAS-02-a | Summary triggers on project switch after idle threshold | unit | `npx vitest run src/stores/useWorkspaceStore.test.ts` | No - Wave 0 |
| AIAS-02-b | Fallback template summary when no AI provider | unit | `npx vitest run src/components/center/ContextSummaryCard.test.tsx` | No - Wave 0 |
| AIAS-02-c | Summary card renders and dismisses | unit | `npx vitest run src/components/center/ContextSummaryCard.test.tsx` | No - Wave 0 |
| AIAS-02-d | First open in session always shows summary | unit | `npx vitest run src/stores/useWorkspaceStore.test.ts` | No - Wave 0 |
| AIAS-03-a | Suggestions only shown in Track+Suggest / Track+Auto-execute modes | unit | `npx vitest run src/components/center/SuggestionCard.test.tsx` | No - Wave 0 |
| AIAS-03-b | Suggestion cards have action and dismiss buttons | unit | `npx vitest run src/components/center/SuggestionCard.test.tsx` | No - Wave 0 |
| AIAS-03-c | Dismissed suggestions don't reappear until next switch | unit | `npx vitest run src/stores/contextSlice.test.ts` | No - Wave 0 |
| AIAS-02/03-backend | Rust context aggregation returns correct counts | unit (Rust) | `cd src-tauri && cargo test context_summary` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --run`
- **Per wave merge:** `npm run test && cd src-tauri && cargo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/stores/useWorkspaceStore.test.ts` -- per-project state map, idle threshold, shouldShowSummary logic
- [ ] `src/components/center/ContextSummaryCard.test.tsx` -- render, dismiss, fallback display
- [ ] `src/components/center/SuggestionCard.test.tsx` -- render, action routing, dismiss, mode gating
- [ ] `src/stores/contextSlice.test.ts` -- summary/suggestion state, request lifecycle, race condition protection
- [ ] `src-tauri/src/ai/prompts.rs` Rust tests -- context summary prompt building, response parsing
- [ ] `src-tauri/src/commands/ai_commands.rs` Rust tests -- gather_project_context aggregation correctness

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/ai/prompts.rs` -- Existing prompt pattern (build_scaffold_request)
- `src-tauri/src/ai/gateway.rs` -- AiGateway provider abstraction and default provider lookup
- `src-tauri/src/ai/provider.rs` -- AiProvider trait with complete() and complete_stream()
- `src-tauri/src/commands/ai_commands.rs` -- Existing ai_assist_task pattern (mutex lock handling, streaming)
- `src/stores/aiSlice.ts` -- AI state management (isGenerating, pendingSuggestions, request lifecycle)
- `src/stores/useWorkspaceStore.ts` -- Zustand persist pattern for workspace state
- `src/components/detail/AiSuggestionPanel.tsx` -- Card UI pattern with accept/dismiss
- `src/components/center/ProjectDetail.tsx` -- Current project detail view (integration target)
- `src-tauri/src/db/sql/001_initial.sql` -- Tasks schema (status, priority, timestamps)
- `.planning/phases/10-ai-project-onboarding/10-CONTEXT.md` -- Phase 10 AI mode decisions (D-16 through D-18)
- `.planning/phases/07-project-phases-and-directory-linking/07-CONTEXT.md` -- Phase 7 phase/progress decisions

### Secondary (MEDIUM confidence)
- Phase 7 and 10 implementation details inferred from CONTEXT.md decisions (actual implementation may differ in naming)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, no new dependencies
- Architecture: HIGH - Patterns directly derived from existing codebase (prompts.rs, ai_commands.rs, aiSlice.ts)
- Pitfalls: HIGH - Mutex lock pitfall demonstrated in existing code; race condition is standard async UI concern

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (30 days -- stable infrastructure, no external dependencies)
