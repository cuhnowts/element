# Phase 14: Planning Tier Decision Tree and Execution Mode - Research

**Researched:** 2026-03-27
**Domain:** React dialog UI, Rust context file generation, Zustand state management
**Confidence:** HIGH

## Summary

Phase 14 adds a tier selection dialog to the "Open AI" flow, implements three distinct planning paths (Quick/Medium/GSD), and adds "What's next?" execution mode to the context file. The phase builds on infrastructure from Phase 12 (planning_tier column, set_planning_tier command, configurable CLI) and Phase 13 (adaptive context builder with tier-aware templates and state detection).

The implementation is largely wiring work. The tier selection dialog is a new React component using existing shadcn parts. The OpenAiButton gets a conditional gate. The context file generation in Rust gains tier-specific planning templates and execution-mode content. AiPlanReview is reused as-is for Quick and Medium tier output. No new libraries or infrastructure are needed.

**Primary recommendation:** Implement in three waves: (1) TierSelectionDialog component + OpenAiButton gate, (2) Rust context file templates for each tier's planning mode, (3) "What's next?" execution mode content in context file + tier badge in ProjectDetail header.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Simple radio list inside a Dialog (not cards, not wizard). Three options: Quick, Medium, GSD -- each with a one-line description.
- **D-02:** Dialog appears only on first "Open AI" click when project has no plan and no stored tier. After choosing, tier is saved per-project and subsequent clicks skip the dialog.
- **D-03:** Dialog collects both tier selection AND a brief project description (text area: "What are you building?"). Quick tier needs this to generate tasks; Medium uses it to start the conversation.
- **D-04:** Users can change tier later via a "Change plan" button in the project detail header. Re-opens the tier dialog. Warn before overwriting existing tasks/phases.
- **D-05:** Quick tier launches the terminal with a context file instructing the AI to generate a flat task list as plan-output.json. Reuses existing plan watcher + AiPlanReview infrastructure.
- **D-06:** Quick tier always produces flat tasks -- no phases. This is the key differentiator from Medium tier.
- **D-07:** After tasks are confirmed in AiPlanReview, terminal stays open. Context file updates to "What's next?" execution mode so user can start working immediately.
- **D-08:** Medium tier reuses the existing plan watcher + AiPlanReview flow entirely. Context file instructs AI to ask 3-5 focused questions, then output phases + tasks as plan-output.json. No new infrastructure needed.
- **D-09:** GSD tier launches the terminal with context file containing GSD instructions (e.g., "Run /gsd:new-project to start"). Element gets out of the way -- no file watching or sync in this phase.
- **D-10:** No .planning/ detection or sync in Phase 14. That's Phase 15's responsibility.
- **D-11:** Context file is a one-time seed -- project brief + status snapshot -- generated on "Open AI" click. No mid-session regeneration.
- **D-12:** "What's next?" lives in the context file only. No new UI widget needed.
- **D-13:** Next-action logic uses task ordering + status. First incomplete task in earliest phase = suggested next. "Blocker" = phase with mixed complete/incomplete progress. No explicit dependency graph.
- **D-14:** Context file includes state + light guidance. Progress summary, suggested next task, and a brief "Workflow" section.

### Claude's Discretion
- Implementation details of the radio list styling and layout within the Dialog
- Exact wording of tier descriptions and context file templates
- How the "Change plan" warning dialog is worded
- Error handling for edge cases (e.g., plan watcher fails, AI doesn't output expected format)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAN-01 | User sees a tier selection dialog when clicking "Open AI" on a project with no plan (Quick / Medium / GSD) | TierSelectionDialog component with radio group, gated by OpenAiButton conditional logic |
| PLAN-02 | Quick tier generates a flat task list from a brief user description, saved directly to project | Quick tier context template instructs AI to output flat plan-output.json (single phase wrapper); AiPlanReview handles save |
| PLAN-03 | Medium tier asks focused questions via AI conversation, then generates phases and tasks for review | Medium tier context template with questioning instructions; existing plan watcher + AiPlanReview flow |
| PLAN-04 | GSD tier instructs the AI to run GSD commands for full planning, and stores the selected tier on the project | GSD context template with /gsd:new-project instruction; set_planning_tier command from Phase 12 |
| CTX-03 | "What's next?" execution mode shows progress, highlights blockers, and suggests the next action | Rust context file generation extended with execution mode section for projects with existing tasks |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component framework | Already in project |
| Zustand | 4.x | State management | Already in project, all slices follow this pattern |
| shadcn/ui | latest | Dialog, Button, Textarea, Label, Badge components | Already installed, UI-SPEC mandates these |
| Tauri | 2.x | Backend commands, IPC | Already in project |
| Rust (std) | n/a | Context file generation | All backend logic in Rust |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | latest | Toast notifications | Error handling (already used throughout) |
| lucide-react | latest | Icons | Already in project |

### Alternatives Considered
None. This phase uses entirely existing infrastructure. No new dependencies needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    center/
      TierSelectionDialog.tsx    # NEW - Tier radio dialog
      OpenAiButton.tsx           # MODIFIED - Conditional tier gate
      ProjectDetail.tsx          # MODIFIED - Tier badge + Change plan button
      AiPlanReview.tsx           # UNCHANGED - Reused for Quick + Medium
src-tauri/
  src/
    models/
      onboarding.rs             # MODIFIED - Tier-aware context templates + execution mode
    commands/
      onboarding_commands.rs    # MODIFIED - Pass tier + description to context generation
```

### Pattern 1: Conditional Dialog Gate in OpenAiButton
**What:** OpenAiButton checks project state before launching. If no tier and no tasks, opens TierSelectionDialog instead of directly launching the terminal.
**When to use:** This is the core entry point modification.
**Example:**
```typescript
// In OpenAiButton.tsx
const handleOpenAi = async () => {
  if (!directoryPath) { toast.error(...); return; }

  // Phase 14: Check if tier dialog needed
  const needsTierDialog = !project.planningTier && tasks.length === 0 && phases.length === 0;
  if (needsTierDialog) {
    setShowTierDialog(true);
    return;
  }

  // Existing flow: generate context + launch terminal
  await launchWithTier(project.planningTier ?? "quick");
};
```

### Pattern 2: Quick Tier Flat Task Handling
**What:** Quick tier outputs plan-output.json with tasks wrapped in a single unnamed phase. AiPlanReview already handles this. On save, tasks go to the project without phase assignment.
**When to use:** Quick tier plan output.
**Critical detail:** The existing `PlanOutput` schema requires `phases[]` wrapper. Quick tier should output a single phase with empty/generic name. The `confirmAndSavePlan` logic in the onboarding slice can be extended to detect single-phase Quick tier output and skip phase creation, assigning tasks directly to the project with `phaseId: null`. Alternatively, the Rust `batch_create_plan` can accept a flag. The simpler approach: keep the existing flow but let the AI output `{"phases": [{"name": "", "tasks": [...]}]}` -- the review UI already shows phases with tasks, and a single phase with tasks is a valid degenerate case.

### Pattern 3: Passing Tier + Description Through Context File Generation
**What:** The tier selection dialog collects tier + description. These must flow to the Rust backend to generate the appropriate context file.
**When to use:** On tier dialog submission.
**Implementation:** Extend `generate_context_file` command to accept optional `tier` and `description` parameters. Or: save tier via `set_planning_tier` first (Phase 12 command), save description via `update_project`, then call existing `generate_context_file` which reads from DB. The DB-first approach is cleaner -- it ensures tier is persisted before generating content.

### Pattern 4: Execution Mode in Context File
**What:** For projects with existing tasks, the context file includes a "What's Next?" section with: progress summary, suggested next task (first incomplete in earliest phase), blockers (phases with mixed progress), and workflow guidance.
**When to use:** When `generate_context_file` is called for a project that already has tasks.
**Implementation:** This lives in Rust's `generate_populated_project_context`. Phase 13 already restructures this function with state detection. Phase 14 adds the specific "What's Next?" suggested-action logic per D-13.

### Anti-Patterns to Avoid
- **Don't create a new plan output format for Quick tier.** Reuse the existing `PlanOutput` JSON schema. Quick tier just outputs a single phase with tasks.
- **Don't add mid-session context regeneration.** Context file is a one-time seed (D-11). The terminal stays open; next "Open AI" click generates a fresh snapshot.
- **Don't build .planning/ detection or sync.** That is Phase 15's responsibility (D-10).
- **Don't add a new UI widget for "What's Next?"** It lives exclusively in the context file (D-12).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tier persistence | Custom state manager | Phase 12's `set_planning_tier` Tauri command + DB column | Already planned and built upstream |
| Plan review UI | New review screen for Quick tier | Existing `AiPlanReview` component | Already supports phases+tasks with DnD, editing, confirm/discard |
| Plan file watching | New file watcher | Existing `startPlanWatcher`/`stopPlanWatcher` | Already watches `.element/plan-output.json` and emits Tauri events |
| Dialog component | Custom modal | shadcn `Dialog` + `DialogContent` + `DialogHeader` + `DialogFooter` | Already installed, used throughout the app |
| Radio selection | Custom radio group | Native radio inputs with Tailwind styling (per UI-SPEC) | UI-SPEC specifies radio option styling explicitly |

## Common Pitfalls

### Pitfall 1: Quick Tier Phase Leakage
**What goes wrong:** Quick tier output creates an unwanted phase in the DB because `batch_create_plan` always creates phases.
**Why it happens:** The `PlanOutput` schema wraps tasks in phases. If Quick tier outputs `{"phases": [{"name": "Tasks", "tasks": [...]}]}`, it creates a phase called "Tasks".
**How to avoid:** Two options: (a) Modify `batch_create_plan` or add a new command that creates tasks without phases (assigns `phaseId: null`). (b) Have the Quick tier AI output tasks in a single phase, and the frontend strips the phase wrapper before calling a task-only batch create. Option (a) is cleaner.
**Warning signs:** After Quick tier confirm, project shows a phase section instead of flat unassigned tasks.

### Pitfall 2: OpenAiButton Needs Project Data It Doesn't Have
**What goes wrong:** The tier gate check requires `project.planningTier`, `tasks.length`, and `phases.length`, but OpenAiButton currently only receives `projectId` and `directoryPath`.
**Why it happens:** OpenAiButton is a thin wrapper that doesn't access store state for phases/tasks.
**How to avoid:** Either (a) lift the tier check to ProjectDetail and pass a callback/flag down, or (b) expand OpenAiButton to consume store state (tasks, phases, project). Option (a) is better because ProjectDetail already has all this state.
**Warning signs:** Unnecessary re-renders or prop drilling.

### Pitfall 3: Race Between Tier Save and Context Generation
**What goes wrong:** Context file generates before tier is persisted to DB, producing a context file without tier-specific instructions.
**Why it happens:** `set_planning_tier` and `generate_context_file` are separate async calls.
**How to avoid:** Await `set_planning_tier` completion before calling `generate_context_file`. Sequential calls in the handler.
**Warning signs:** Context file shows wrong tier instructions on first use.

### Pitfall 4: Description Not Reaching Context File
**What goes wrong:** User types a description in the tier dialog, but it doesn't appear in the generated context file.
**Why it happens:** The description from the tier dialog is ephemeral UI state. `generate_context_file` reads `project.description` from DB. If the dialog description isn't saved to the project, it won't appear.
**How to avoid:** On tier dialog submit: (1) `update_project` with the description, (2) `set_planning_tier`, (3) `generate_context_file`. Or extend `generate_context_file` to accept an additional description parameter.
**Warning signs:** AI sees empty or stale project description in context file.

### Pitfall 5: "What's Next?" Logic for Unassigned Tasks
**What goes wrong:** Projects with only unassigned tasks (no phases) have no "earliest phase" to determine suggested next task.
**Why it happens:** D-13 says "first incomplete task in earliest phase", but Quick tier projects may have no phases.
**How to avoid:** Fallback logic: if no phases, suggest first incomplete unassigned task by creation order.
**Warning signs:** "What's Next?" section is empty for Quick tier projects with unassigned tasks.

## Code Examples

### TierSelectionDialog Component Structure
```typescript
// src/components/center/TierSelectionDialog.tsx
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type PlanningTier = "quick" | "medium" | "full";

interface TierSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tier: PlanningTier, description: string) => Promise<void>;
  defaultTier?: PlanningTier;
}

const TIERS = [
  { value: "quick" as const, label: "Quick", description: "A simple task list. Best for small projects or quick todos." },
  { value: "medium" as const, label: "Medium", description: "AI asks a few questions, then builds phases and tasks for your review." },
  { value: "full" as const, label: "GSD", description: "Full GSD workflow with phases, plans, and .planning/ directory." },
];
```

**Note:** The DB stores `full` (per Phase 12 D-10) but the UI displays "GSD" (per UI-SPEC copywriting contract).

### OpenAiButton Tier Gate Logic
```typescript
// Modified handleOpenAi in OpenAiButton.tsx (or lifted to ProjectDetail)
const needsTierDialog = !project.planningTier
  && tasks.length === 0
  && phases.length === 0;

if (needsTierDialog) {
  setShowTierDialog(true);
  return;
}

// For projects with tasks but no tier (pre-Phase 14 data), treat as Quick
const effectiveTier = project.planningTier ?? "quick";
```

### Rust Execution Mode - Suggested Next Task
```rust
// In onboarding.rs - "What's Next?" section
fn generate_whats_next(data: &ProjectContextData) -> String {
    let mut out = String::new();
    out.push_str("## What's Next?\n\n");

    // Find first incomplete task in earliest phase
    let suggested = data.phases.iter()
        .flat_map(|p| p.tasks.iter())
        .chain(data.unassigned_tasks.iter())
        .find(|t| t.status != "complete");

    if let Some(task) = suggested {
        out.push_str(&format!("**Suggested:** {}\n\n", task.title));
    }

    // Identify blockers: phases with mixed progress
    let blockers: Vec<&str> = data.phases.iter()
        .filter(|p| p.completed > 0 && p.completed < p.total)
        .map(|p| p.name.as_str())
        .collect();

    if !blockers.is_empty() {
        out.push_str("**Needs attention:**\n");
        for b in blockers.iter().take(3) {
            out.push_str(&format!("- {} (partially complete)\n", b));
        }
        out.push('\n');
    }

    out.push_str("**Workflow:** Work on the suggested task. When complete, mark it done in Element.\n\n");
    out
}
```

### Quick Tier Batch Create Without Phases
```rust
// New command or modification to batch_create_plan for flat task creation
#[tauri::command]
pub async fn batch_create_tasks(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
    project_id: String,
    tasks: Vec<PendingTaskInput>,
) -> Result<BatchCreateResult, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let tx = db.conn().unchecked_transaction().map_err(|e| e.to_string())?;

    let mut task_count = 0i32;
    for task in &tasks {
        let task_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        tx.execute(
            "INSERT INTO tasks (id, project_id, phase_id, title, description, created_at, updated_at) VALUES (?1, ?2, NULL, ?3, ?4, ?5, ?6)",
            params![task_id, project_id, task.title, task.description.as_deref().unwrap_or(""), now, now],
        ).map_err(|e| e.to_string())?;
        task_count += 1;
    }

    tx.commit().map_err(|e| e.to_string())?;
    let _ = app.emit("plan-saved", &project_id);
    Ok(BatchCreateResult { phase_count: 0, task_count })
}
```

## Dependencies on Prior Phases

Phase 14 assumes Phase 12 and Phase 13 are complete. Key dependencies:

| Dependency | Phase | What Phase 14 Needs |
|------------|-------|---------------------|
| `planning_tier` column on projects | Phase 12 | DB column exists, Project struct includes it, frontend type includes `planningTier` |
| `set_planning_tier` Tauri command | Phase 12 | Command exists and is callable from frontend |
| Configurable CLI command/args | Phase 12 | OpenAiButton reads CLI settings instead of hardcoding `claude` |
| Adaptive context builder | Phase 13 | `generate_context_file_content` already has state detection and tier-aware sections |
| Token budget / phase rollup | Phase 13 | Large projects summarize correctly in context file |
| Default tier = Quick | Phase 13 (D-09) | Projects without a tier get Quick-style context |

**If Phase 12/13 are incomplete:** Phase 14 cannot be implemented. The tier dialog would have nowhere to persist the selection, and the context file would not have tier-aware templates.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single onboarding flow (scope+goals form) | Context file generation from project data | Phase 11 (v1.1) | Removed ScopeInputForm, added OpenAiButton + context file |
| Hardcoded `claude` CLI | Configurable CLI tool | Phase 12 (v1.2) | OpenAiButton reads from settings |
| Single context template | State-aware + tier-aware templates | Phase 13 (v1.2) | Context builder detects project state and tier |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (via vite.config.ts) |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-01 | Tier dialog opens when "Open AI" clicked on unplanned project | unit | `npx vitest run src/components/center/TierSelectionDialog.test.tsx -x` | Wave 0 |
| PLAN-01 | Dialog skipped when project has stored tier | unit | `npx vitest run src/components/center/OpenAiButton.test.tsx -x` | Exists (needs update) |
| PLAN-02 | Quick tier generates flat task list (no phases) | unit | `npx vitest run src/components/center/TierSelectionDialog.test.tsx -x` | Wave 0 |
| PLAN-03 | Medium tier triggers plan watcher + AiPlanReview flow | unit | `npx vitest run src/components/center/OpenAiButton.test.tsx -x` | Exists (needs update) |
| PLAN-04 | GSD tier launches terminal with GSD instructions | unit | `npx vitest run src/components/center/OpenAiButton.test.tsx -x` | Exists (needs update) |
| PLAN-04 | Tier stored on project after selection | unit | `npx vitest run src/components/center/TierSelectionDialog.test.tsx -x` | Wave 0 |
| CTX-03 | "What's next?" section in context file | unit (Rust) | `cd src-tauri && cargo test onboarding -- --nocapture` | Exists (needs extension) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && cd src-tauri && cargo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/center/TierSelectionDialog.test.tsx` -- covers PLAN-01, PLAN-02, PLAN-04
- [ ] Update `src/components/center/OpenAiButton.test.tsx` -- update for tier gate logic
- [ ] Update `src/components/center/__tests__/ProjectDetail.test.tsx` -- tier badge + "Change plan" button
- [ ] Rust tests in `onboarding.rs` -- extend for execution mode "What's Next?" content

## Open Questions

1. **Quick tier task creation without phases**
   - What we know: Existing `batch_create_plan` always creates phases. Quick tier should produce flat tasks (D-06).
   - What's unclear: Whether to add a new `batch_create_tasks` command or modify the existing one with a `skip_phases` flag.
   - Recommendation: Add a new `batch_create_tasks` command. Cleaner separation, doesn't risk breaking existing Medium tier flow.

2. **Description flow from dialog to context file**
   - What we know: The tier dialog collects a description (D-03). `generate_context_file` reads description from DB.
   - What's unclear: Should the dialog update `project.description` or pass description as an ephemeral parameter?
   - Recommendation: Update `project.description` via `update_project` before generating context. This way the description persists and is visible in ProjectDetail. If the project already has a description, the dialog textarea should be pre-filled with it.

3. **Plan watcher behavior for GSD tier**
   - What we know: GSD tier should not use plan watcher (D-09, D-10).
   - What's unclear: Should `startPlanWatcher` be skipped entirely for GSD, or started but ignored?
   - Recommendation: Skip `startPlanWatcher` for GSD tier. The GSD flow manages its own planning via `.planning/` directory.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified -- this phase is code/config changes to existing Tauri+React app).

## Sources

### Primary (HIGH confidence)
- Project source code: `OpenAiButton.tsx`, `AiPlanReview.tsx`, `ProjectDetail.tsx`, `onboarding.rs`, `onboarding_commands.rs` -- direct code inspection
- Phase 14 CONTEXT.md -- locked decisions from user discussion
- Phase 14 UI-SPEC.md -- visual and interaction contract
- Phase 12 CONTEXT.md -- upstream dependency: planning_tier column, set_planning_tier command
- Phase 13 CONTEXT.md -- upstream dependency: adaptive context builder, tier-aware templates

### Secondary (MEDIUM confidence)
- None needed -- all findings from direct code inspection.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new deps
- Architecture: HIGH -- direct inspection of all integration points, clear patterns established
- Pitfalls: HIGH -- identified from concrete code analysis of existing data flow

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- internal project, no external API changes)
