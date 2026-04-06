# Phase 33: Briefing Rework - Research

**Researched:** 2026-04-04
**Domain:** Tauri + React unified hub center, Rust scoring engine, structured LLM JSON output
**Confidence:** HIGH

## Summary

Phase 33 replaces the current auto-fired markdown briefing with an on-demand, card-based briefing rendered inside a unified hub center. The work spans three layers: (1) a new Rust `scoring.rs` module that computes priority-ranked project data with tags, (2) a modified briefing command that feeds scored data to the LLM and expects structured JSON back, and (3) a rewritten `HubCenterPanel` that merges briefing cards into the chat stream with action chips, collapsible sections, and project navigation.

The existing codebase provides strong foundations: `useBriefingStream` already handles Tauri event-based streaming, `useHubChatStore` manages chat messages with turn caps, and the `Card`/`Badge`/`Button` shadcn components cover all UI needs. The scoring engine is new Rust code that queries the same DB tables the manifest builder and heartbeat risk assessor already use -- `tasks`, `phases`, `calendar_events`, `scheduled_blocks`. The LLM output format shifts from markdown to JSON, which requires a new system prompt and frontend JSON parser but reuses the existing `complete_stream` provider trait.

**Primary recommendation:** Build the scoring engine first (it is the data source for everything else), then wire the modified briefing command, then rewrite the frontend. The scoring engine is pure Rust with no external dependencies and is fully testable with in-memory SQLite.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Hub center is a single unified interface with greeting + contextual summary + action chips + chat stream. Only "Run Daily Briefing" wired this phase; other chips are placeholders.
- **D-02:** HubCenterPanel replaces stacked BriefingPanel+HubChat with a single scrollable component. Briefing cards render inline in the chat stream.
- **D-03:** No auto-fire on hub load. User sees greeting + contextual summary + action chips. Briefing generates only on "Run Daily Briefing" click.
- **D-04:** Contextual summary driven by computed scoring engine. LLM narrates 1-2 sentences of flavor text from scored data. Math is source of truth; LLM is copywriter.
- **D-05:** New `scoring.rs` module in Rust. Computes: item tags (overdue, approaching-deadline, blocked, on-track, recently-completed), project priority ranking (deadline-driven), busy score, structured priority list.
- **D-06:** Project priority determined by deadlines. Chat-driven priority adjustment deferred.
- **D-07:** Briefing output is a stack of project cards ranked by priority. Each card has blockers, deadlines, wins subsections.
- **D-08:** LLM-narrated summary card sits above project cards.
- **D-09:** Cards interactive: clicking navigates to project. Sections collapsible.
- **D-10:** Briefing and hub chat are one interface with shared conversation context.
- **D-11:** Regenerating replaces previous briefing in-place. One briefing visible at a time. Chat history preserved.
- **D-12:** LLM returns structured JSON (not markdown). Schema: `{ summary, projects: [{ name, blockers[], deadlines[], wins[] }] }`. No regex/heading parsing.
- **D-13:** Scoring module produces ranked data and tags; LLM adds narrative flavor within JSON structure.

### Claude's Discretion
- Architecture of scoring module internals (queries, tag computation logic)
- Specific JSON schema field names and nesting
- Card component design (reuse existing Card or create BriefingCard variant)
- How "back to top" button is implemented
- How action chip UI is structured

### Deferred Ideas (OUT OF SCOPE)
- "Organize Calendar" action chip wiring
- "Organize Goals" action chip wiring
- Additional action chips
- Chat-driven priority adjustment (D-06 captures decision; full implementation deferred)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRIEF-01 | User sees a "Generate Briefing" button instead of auto-generated briefing on hub load | ActionChipBar component with "Run Daily Briefing" chip replaces auto-fire useEffect. Remove stale-check auto-trigger from BriefingPanel. |
| BRIEF-02 | Generated briefing displays structured sections (summary, deadlines, blockers, wins) | Scoring engine produces tagged, ranked project data. LLM returns BriefingJSON with summary + per-project sections. Frontend renders distinct card components. |
| BRIEF-03 | Briefing sections render as visually distinct cards with clear hierarchy | BriefingSummaryCard + BriefingProjectCard + BriefingCardSection components using existing shadcn Card/Badge. Priority ordering from scoring engine drives card stack order. |
| BRIEF-04 | Briefing and hub chat consolidated into one interface with shared context | Unified HubCenterPanel replaces stacked BriefingPanel+HubChat. Briefing cards injected into chat message stream. Both share useHubChatStore. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | (existing) | Frontend framework | Already in project |
| Zustand | (existing) | State management | Already used for briefing + chat stores |
| Tauri | (existing) | Desktop framework + Rust backend | Already in project |
| shadcn/ui | (existing) | UI component library | Card, Badge, Button, ScrollArea all already available |
| lucide-react | (existing) | Icons | Sparkles, Calendar, Target, ChevronRight, ChevronUp, Loader2 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chrono | (existing in Cargo) | Date/time computation in scoring engine | Tag computation, deadline proximity |
| serde_json | (existing in Cargo) | JSON serialization for scoring output | Scoring engine output to LLM, LLM response parsing |
| ReactMarkdown + remarkGfm | (existing) | Markdown rendering inside card item text | Individual blocker/deadline/win descriptions may contain inline markdown |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom collapsible | shadcn Collapsible | shadcn Collapsible exists but is heavier than needed; a simple `useState` toggle with CSS `hidden` is sufficient and matches existing patterns |
| Streaming JSON parser library | Manual incremental parse | LLM JSON output is small and arrives as complete-ish chunks; a try-parse-on-each-chunk approach is simpler than adding a streaming JSON dependency |

**Installation:** No new dependencies required. Everything needed is already in the project.

## Architecture Patterns

### Recommended Project Structure

```
src-tauri/src/
├── models/
│   ├── scoring.rs          # NEW: scoring engine (tags, ranking, busy score)
│   └── manifest.rs         # MODIFIED: calls scoring module, passes scored data to briefing
├── commands/
│   └── manifest_commands.rs # MODIFIED: new system prompt for JSON output, scoring data in user message

src/
├── components/hub/
│   ├── HubCenterPanel.tsx   # REWRITTEN: unified greeting + chips + chat stream
│   ├── BriefingSummaryCard.tsx  # NEW: LLM summary card
│   ├── BriefingProjectCard.tsx  # NEW: per-project card with collapsible sections
│   ├── BriefingCardSection.tsx  # NEW: collapsible section (blockers/deadlines/wins)
│   ├── ActionChipBar.tsx        # NEW: action chip row
│   ├── HubChat.tsx              # MODIFIED: briefing cards coexist in message stream
│   └── BriefingGreeting.tsx     # MODIFIED: greeting + contextual summary below
├── stores/
│   └── useBriefingStore.ts  # MODIFIED: structured BriefingJSON instead of raw markdown
├── hooks/
│   └── useBriefingStream.ts # MODIFIED: parse JSON chunks instead of raw text
└── types/
    └── briefing.ts          # NEW: BriefingJSON, BriefingProject, BriefingTag types
```

### Pattern 1: Scoring Engine as Pure Computation Module

**What:** `scoring.rs` is a pure function module -- takes DB reference, returns structured data. No Tauri state, no async, no side effects.
**When to use:** Always -- this is the core intelligence layer.
**Example:**

```rust
// src-tauri/src/models/scoring.rs

use chrono::{Local, NaiveDate};
use serde::{Deserialize, Serialize};
use crate::db::connection::Database;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProjectTag {
    Overdue,
    ApproachingDeadline,
    Blocked,
    OnTrack,
    RecentlyCompleted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoredProject {
    pub project_id: String,
    pub name: String,
    pub priority_score: f64,        // higher = more urgent
    pub tags: Vec<ProjectTag>,
    pub blockers: Vec<String>,      // task titles that are blocked
    pub deadlines: Vec<String>,     // "Task X due in 2 days"
    pub wins: Vec<String>,          // "Completed Task Y"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoringResult {
    pub projects: Vec<ScoredProject>,  // sorted by priority_score desc
    pub busy_score: f64,               // 0.0-1.0, % of day committed
    pub total_meetings: i32,
    pub total_tasks_due: i32,
}

pub fn compute_scores(db: &Database) -> Result<ScoringResult, String> {
    // Query all active projects, their tasks, due dates, statuses
    // Compute tags per project based on task states
    // Rank by deadline proximity (soonest deadline = highest priority)
    // Calculate busy score from scheduled_blocks + calendar_events
    todo!()
}
```

### Pattern 2: Briefing Cards as Chat Stream Entries

**What:** Briefing cards are a special message type in the chat stream, not a separate panel.
**When to use:** When rendering briefing output in the unified hub center.
**Key design:** The chat message store needs a discriminated union -- messages can be either text chat or briefing card data.

```typescript
// Extended chat message type
type HubStreamEntry =
  | { type: "chat"; message: ChatMessage }
  | { type: "briefing"; data: BriefingJSON; timestamp: number };
```

This allows briefing cards to be rendered inline in the scrollable chat area while chat messages continue below.

### Pattern 3: Incremental JSON Parsing for Streaming

**What:** LLM streams JSON output in chunks. Frontend accumulates chunks and attempts to parse the full JSON on each chunk arrival.
**When to use:** During briefing generation streaming.
**Key insight:** Do NOT try to parse partial JSON. Accumulate the full string and `JSON.parse()` on `briefing-complete`. During streaming, show a skeleton/loading state for cards. This avoids the complexity of incremental JSON parsing.

Alternative: If card-by-card streaming appearance is desired, the Rust side can parse the completed JSON and emit individual card events. This is simpler than frontend partial JSON parsing.

### Anti-Patterns to Avoid
- **Parsing markdown headings to extract sections:** D-12 explicitly forbids this. Use structured JSON.
- **Auto-firing briefing on mount:** D-03 explicitly requires user-triggered generation only.
- **Separate briefing and chat panels:** D-02/D-10 require a single unified interface.
- **Returning new object refs from Zustand selectors:** Per project memory, use module-level EMPTY constants for default arrays/objects.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible sections | Custom accordion from scratch | Simple `useState` boolean + conditional render | Existing pattern in codebase; shadcn Collapsible is overkill for this |
| Card components | Custom card HTML | shadcn `Card`/`CardHeader`/`CardTitle`/`CardContent` | Already styled, accessible, and used throughout the app |
| Tag badges | Custom colored spans | shadcn `Badge` with variant prop | Already has destructive/secondary/outline variants matching the tag design |
| Scroll management | Custom scroll listener | shadcn `ScrollArea` | Already used in HubChat; consistent behavior |
| Priority computation | LLM-computed priorities | Deterministic Rust scoring engine | D-04: "Math is source of truth; LLM is copywriter" |

**Key insight:** The scoring engine is the only truly new code. Everything else is composition of existing components and patterns.

## Common Pitfalls

### Pitfall 1: Zustand Selector Stability
**What goes wrong:** Creating new object/array references in selectors causes infinite re-renders.
**Why it happens:** `useBriefingStore((s) => ({ data: s.briefingData, status: s.briefingStatus }))` creates a new object every time.
**How to avoid:** Select individual primitives: `useBriefingStore((s) => s.briefingData)` and `useBriefingStore((s) => s.briefingStatus)` as separate calls. Use module-level `const EMPTY_PROJECTS: BriefingProject[] = []` for default array values.
**Warning signs:** Components re-rendering on every store update even when their data hasn't changed.

### Pitfall 2: JSON Parse Failure on Streaming Chunks
**What goes wrong:** Attempting `JSON.parse()` on partial JSON during streaming throws errors that pollute the console or break the UI.
**Why it happens:** LLM streams tokens, not complete JSON objects.
**How to avoid:** Only parse on `briefing-complete` event. During streaming, show a loading/skeleton state. Alternatively, have the Rust backend accumulate the full response and emit a single `briefing-data` event with parsed JSON.
**Warning signs:** Console errors during briefing generation, broken card rendering mid-stream.

### Pitfall 3: Briefing Replacement Race Condition
**What goes wrong:** Clicking "Run Daily Briefing" while a previous generation is streaming creates duplicate or garbled output.
**Why it happens:** Two concurrent streams writing to the same store.
**How to avoid:** Disable the action chip during streaming (D-01 UI spec already requires this). Also guard in the store: if `briefingStatus === "streaming"`, reject new `requestBriefing()` calls.
**Warning signs:** Multiple briefing card sets appearing, or interleaved content.

### Pitfall 4: LLM Returning Invalid JSON
**What goes wrong:** LLM outputs malformed JSON, JSON wrapped in markdown code fences, or extra text before/after the JSON.
**Why it happens:** LLMs are not reliable JSON generators without strong prompting.
**How to avoid:** (1) System prompt must explicitly say "Output ONLY valid JSON, no markdown fences, no extra text." (2) Backend should strip common wrappers (```json ... ```) before parsing. (3) Have a fallback: if JSON parse fails, show an error card with a "Try again" button rather than crashing.
**Warning signs:** Briefing generation "completes" but no cards render.

### Pitfall 5: Scoring Engine SQL Performance
**What goes wrong:** Scoring query does N+1 database calls (one per project, then per task).
**Why it happens:** Naive implementation queries projects then tasks per project.
**How to avoid:** Use a single JOIN query to get all active tasks with project info, due dates, and statuses. Group in Rust, not SQL. The manifest builder already uses this pattern with `list_tasks` per project, but scoring should batch.
**Warning signs:** Noticeable delay between clicking "Run Daily Briefing" and the first card appearing.

### Pitfall 6: Chat History Destroyed on Briefing Regeneration
**What goes wrong:** Replacing the briefing in-place accidentally clears chat messages below it.
**Why it happens:** Naive implementation treats briefing as regular messages and clears all.
**How to avoid:** The briefing entry in the chat stream must be a distinct type (not a regular ChatMessage). Regeneration replaces only the briefing entry, leaving all ChatMessage entries intact.
**Warning signs:** Chat history disappearing when user regenerates briefing.

## Code Examples

### Scoring Engine Tag Computation (Rust)

```rust
// Determine tags for a project based on its tasks
fn compute_project_tags(tasks: &[TaskRow], today: NaiveDate) -> Vec<ProjectTag> {
    let mut tags = Vec::new();
    let has_overdue = tasks.iter().any(|t| {
        t.due_date.map(|d| d < today).unwrap_or(false) && t.status != "complete"
    });
    let has_approaching = tasks.iter().any(|t| {
        t.due_date.map(|d| {
            let days = (d - today).num_days();
            days >= 0 && days <= 3
        }).unwrap_or(false) && t.status != "complete"
    });
    let has_blocked = tasks.iter().any(|t| t.status == "blocked");
    let has_recent_completions = tasks.iter().any(|t| {
        t.status == "complete" && is_recently_completed(&t.updated_at, today)
    });

    if has_overdue { tags.push(ProjectTag::Overdue); }
    if has_approaching { tags.push(ProjectTag::ApproachingDeadline); }
    if has_blocked { tags.push(ProjectTag::Blocked); }
    if has_recent_completions { tags.push(ProjectTag::RecentlyCompleted); }
    if tags.is_empty() { tags.push(ProjectTag::OnTrack); }

    tags
}
```

### Modified System Prompt for JSON Output (Rust)

```rust
fn build_briefing_system_prompt_json() -> String {
    format!(
        "You are an executive briefing assistant.\n\
        \n\
        You will receive scored project data with tags, priorities, and metrics.\n\
        Your job is to narrate this data as a concise briefing.\n\
        \n\
        Output ONLY valid JSON matching this schema (no markdown fences, no extra text):\n\
        {{\n\
          \"summary\": \"1-2 sentence overview of the day\",\n\
          \"projects\": [\n\
            {{\n\
              \"name\": \"Project Name\",\n\
              \"projectId\": \"uuid-string\",\n\
              \"tags\": [\"overdue\", \"blocked\"],\n\
              \"blockers\": [\"Description of blocker\"],\n\
              \"deadlines\": [\"Task X due tomorrow\"],\n\
              \"wins\": [\"Completed Task Y yesterday\"]\n\
            }}\n\
          ]\n\
        }}\n\
        \n\
        Rules:\n\
        - Keep the summary to 1-2 sentences. Tone: concise executive brief.\n\
        - Projects are already ranked by priority. Preserve the order.\n\
        - Each description should be a single readable sentence.\n\
        - Omit empty sections (if no blockers, omit the blockers array or leave empty).\n\
        - Do NOT add projects not present in the input data.\n\
        - Do NOT include markdown formatting in any field."
    )
}
```

### BriefingProjectCard Component (React)

```typescript
// src/components/hub/BriefingProjectCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BriefingCardSection } from "./BriefingCardSection";
import { AlertTriangle, Clock, Trophy } from "lucide-react";
import type { BriefingProject, BriefingTag } from "@/types/briefing";

const TAG_VARIANTS: Record<BriefingTag, { variant: string; className?: string }> = {
  overdue: { variant: "destructive" },
  "approaching-deadline": { variant: "outline", className: "text-chart-4" },
  blocked: { variant: "destructive" },
  "on-track": { variant: "secondary" },
  "recently-completed": { variant: "secondary", className: "text-chart-2" },
};

interface Props {
  project: BriefingProject;
  onNavigate: (projectId: string) => void;
}

export function BriefingProjectCard({ project, onNavigate }: Props) {
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardHeader
        className="cursor-pointer"
        onClick={() => project.projectId && onNavigate(project.projectId)}
      >
        <div className="flex items-center justify-between">
          <CardTitle>{project.name}</CardTitle>
          <div className="flex gap-1">
            {project.tags.map((tag) => (
              <Badge key={tag} variant={TAG_VARIANTS[tag]?.variant as any} className={TAG_VARIANTS[tag]?.className}>
                {tag.replace("-", " ")}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {project.blockers.length > 0 && (
          <BriefingCardSection title="Blockers" icon={AlertTriangle} items={project.blockers} defaultOpen />
        )}
        {project.deadlines.length > 0 && (
          <BriefingCardSection title="Deadlines" icon={Clock} items={project.deadlines} defaultOpen />
        )}
        {project.wins.length > 0 && (
          <BriefingCardSection title="Wins" icon={Trophy} items={project.wins} />
        )}
      </CardContent>
    </Card>
  );
}
```

### Unified Hub Center Stream Entry Pattern

```typescript
// In useBriefingStore or a new unified store
interface BriefingStoreState {
  briefingData: BriefingJSON | null;
  briefingStatus: BriefingStatus;
  briefingError: string | null;
  contextSummary: string | null;   // LLM-narrated greeting summary from scoring
  lastRefreshedAt: number | null;

  requestBriefing: () => void;
  setBriefingData: (data: BriefingJSON) => void;
  completeBriefing: () => void;
  failBriefing: (error: string) => void;
  setContextSummary: (summary: string) => void;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auto-fire briefing on mount | User-triggered "Run Daily Briefing" | This phase | Removes the loading wall on hub open |
| Markdown output from LLM | Structured JSON output | This phase | Eliminates regex parsing, enables card-based UI |
| Separate briefing + chat panels | Unified chat stream with briefing cards | This phase | Single scrollable interface |
| LLM decides priorities | Deterministic scoring engine + LLM narration | This phase | Math is source of truth |

**Deprecated/outdated after this phase:**
- `BriefingPanel` component (replaced by unified HubCenterPanel)
- `BriefingContent` component (markdown rendering replaced by card rendering)
- `BriefingSkeleton` component (replaced by card-level loading states)
- `BriefingRefreshButton` component (replaced by action chip)
- `DailyPlanSection` component (schedule data folded into scoring engine)
- `DueDateSuggestion` component (replaced by deadline items in project cards)
- Current markdown-based system prompt in `build_briefing_system_prompt()`

## Open Questions

1. **Contextual summary on load (D-04)**
   - What we know: The greeting area shows a 1-2 sentence LLM-narrated summary driven by scoring data. This appears on hub load (before the user clicks "Run Daily Briefing").
   - What's unclear: Should this initial summary call the full scoring engine + LLM on every hub load, or should it be cached/precomputed? Running a full scoring + LLM call just for the greeting adds latency.
   - Recommendation: Run scoring on load (fast, pure Rust), cache the scoring result, and use it for the contextual summary via a lightweight LLM call or a template-based approach. The full briefing (with project cards) only triggers on chip click. Alternatively, compute the contextual summary text entirely from scoring data without LLM (e.g., template: "Packed day -- {N} meetings, {M} tasks due").

2. **Streaming vs batch JSON delivery**
   - What we know: Current briefing uses token-by-token streaming. JSON output cannot be incrementally parsed.
   - What's unclear: Should the frontend show a loading skeleton until full JSON arrives, or should the Rust backend parse the complete JSON and emit structured events?
   - Recommendation: Backend accumulates the full LLM response, parses JSON, then emits a single `briefing-data` Tauri event with the parsed `BriefingJSON`. This is simpler and more reliable than frontend JSON accumulation. Keep the `briefing-chunk` events for a text progress indicator if desired.

3. **Project ID format in BriefingJSON**
   - What we know: Projects use UUID strings as IDs in the database. The scoring engine can include `project_id` in each scored project. The LLM receives this data and should pass it through.
   - What's unclear: Can the LLM reliably echo back UUIDs in JSON?
   - Recommendation: The Rust backend should build the final BriefingJSON by merging LLM narrative text with scoring engine data (including project IDs). Do NOT rely on the LLM to echo back UUIDs. The backend owns the structure; the LLM only provides `summary` text and item descriptions.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest + @testing-library/react |
| Config file | vite.config.ts (test block) |
| Quick run command | `npm run test -- --reporter=verbose` |
| Full suite command | `npm run test` |
| Rust tests | `cd src-tauri && cargo test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRIEF-01 | No auto-fire; briefing triggered by "Run Daily Briefing" click | unit (React) | `npx vitest run src/components/hub/__tests__/HubCenterPanel.test.tsx -x` | Wave 0 |
| BRIEF-02 | Structured sections rendered from BriefingJSON | unit (React) | `npx vitest run src/components/hub/__tests__/BriefingProjectCard.test.tsx -x` | Wave 0 |
| BRIEF-03 | Each section renders as a visually distinct card | unit (React) | `npx vitest run src/components/hub/__tests__/BriefingSummaryCard.test.tsx -x` | Wave 0 |
| BRIEF-04 | Briefing + chat consolidated in one interface | unit (React) | `npx vitest run src/components/hub/__tests__/HubCenterPanel.test.tsx -x` | Wave 0 |
| D-05 | Scoring engine computes correct tags and ranking | unit (Rust) | `cd src-tauri && cargo test scoring` | Wave 0 |
| D-12 | LLM JSON parsing and fallback on invalid JSON | unit (Rust) | `cd src-tauri && cargo test briefing_json` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --reporter=verbose && cd src-tauri && cargo test`
- **Per wave merge:** Full suite (same)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/hub/__tests__/HubCenterPanel.test.tsx` -- covers BRIEF-01, BRIEF-04
- [ ] `src/components/hub/__tests__/BriefingProjectCard.test.tsx` -- covers BRIEF-02, BRIEF-03
- [ ] `src/components/hub/__tests__/BriefingSummaryCard.test.tsx` -- covers BRIEF-03
- [ ] `src/components/hub/__tests__/ActionChipBar.test.tsx` -- covers BRIEF-01 chip behavior
- [ ] `src-tauri/src/models/scoring.rs` tests inline -- covers D-05 tag computation
- [ ] `src-tauri/src/commands/manifest_commands.rs` tests for JSON parsing -- covers D-12

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files listed in canonical_refs (manifest_commands.rs, manifest.rs, BriefingPanel.tsx, HubCenterPanel.tsx, HubChat.tsx, useBriefingStore.ts, useBriefingStream.ts, useHubChatStore.ts, card.tsx, BriefingGreeting.tsx, BriefingContent.tsx)
- Database schema from SQL migration files (001_initial.sql, 005_plugins_credentials_calendar.sql, 006_ai_scheduling.sql)
- AI provider trait and types (provider.rs, types.rs)
- Heartbeat risk assessment types and logic (heartbeat/types.rs, heartbeat/risk.rs)
- Scheduling engine types and queries (scheduling_commands.rs)
- UI-SPEC contract (33-UI-SPEC.md) -- verified component inventory, layout, and interaction contracts

### Secondary (MEDIUM confidence)
- Scoring engine architecture recommendations based on existing patterns in heartbeat/risk.rs and manifest.rs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- patterns directly derived from existing codebase (streaming, stores, cards)
- Scoring engine: HIGH -- follows exact same DB query patterns as heartbeat risk assessor
- Pitfalls: HIGH -- derived from direct code inspection and project memory (Zustand selector stability)
- JSON streaming: MEDIUM -- recommendation to batch rather than stream is architectural judgment

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable -- no external dependency changes)
