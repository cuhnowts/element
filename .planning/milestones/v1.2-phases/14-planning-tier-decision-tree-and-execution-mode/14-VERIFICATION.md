---
phase: 14-planning-tier-decision-tree-and-execution-mode
verified: 2026-03-27T19:15:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "End-to-end Quick tier flow"
    expected: "Clicking 'Open AI' on a project with no tier and no tasks opens tier dialog; selecting Quick and entering description launches terminal; AI output creates flat tasks without phases; after confirm, context file updates to execution mode"
    why_human: "Full flow requires running the app, AI terminal, and reading generated .element/context.md — cannot simulate in automation"
  - test: "End-to-end Medium tier flow"
    expected: "Selecting Medium tier generates context file with 'Let's break this into phases. What are the major deliverables?' instruction; AI conversation produces phases+tasks; AiPlanReview appears and confirm creates phases"
    why_human: "Requires live terminal and AI interaction"
  - test: "End-to-end GSD tier flow"
    expected: "Selecting GSD launches terminal without starting plan watcher; context file contains '/gsd:new-project' instruction; no AiPlanReview appears"
    why_human: "Requires running app and verifying plan watcher is NOT started (no observable UI indicator)"
  - test: "D-07 context regeneration after plan confirmation"
    expected: "After confirming either Quick or Medium plan in AiPlanReview, .element/context.md changes from planning mode (with Output Contract) to execution mode (with What Needs Attention section and progress header)"
    why_human: "Requires reading on-disk file after a plan confirmation event that needs a real AI output"
  - test: "Tier badge and Change plan flow"
    expected: "After tier is saved, Badge appears in project header; clicking 'Change plan' on a project with tasks shows warning dialog before re-opening tier selection"
    why_human: "Requires UI rendering with real project state — badge visibility and warning dialog interaction"
  - test: "CTX-03 execution mode content adequacy"
    expected: "Context file for a project with existing tasks clearly shows progress summary, highlights what needs work, and gives actionable instruction — satisfying 'What's Next?' guidance for an AI session"
    why_human: "Requires judgment call: the implementation uses 'What Needs Attention' section instead of the spec's 'Suggested next task' / 'Needs attention (blocker phases)' format. Both approaches satisfy CTX-03 functionally but differ in presentation."
---

# Phase 14: Planning Tier Decision Tree and Execution Mode — Verification Report

**Phase Goal:** Users get the right level of AI planning for their project -- from a quick todo list to full GSD breakdown -- and planned projects get "what's next?" execution guidance
**Verified:** 2026-03-27T19:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Clicking "Open AI" on a project with no plan shows a tier selection dialog (Quick / Medium / GSD) before launching the terminal | VERIFIED | `OpenAiButton.tsx:33-37` gates on `needsTierDialog = !planningTier && !hasContent`, calls `onTierDialogOpen()`. `ProjectDetail.tsx` renders `TierSelectionDialog` wired to `handleTierDialogOpen`. |
| 2  | Selecting Quick tier and providing a brief description produces a flat task list saved directly to the project (no phases) | VERIFIED | `batch_create_tasks` (onboarding_commands.rs:182) inserts tasks with `phase_id = NULL`. `confirmAndSaveQuickPlan` in `onboardingSlice.ts:148` calls `api.batchCreateTasks`. AiPlanReview detects Quick tier and routes to this path. |
| 3  | Selecting Medium tier starts an AI conversation that asks focused questions, then generates phases and tasks for user review | VERIFIED | `get_instructions(NoPlan, "medium")` returns "Let's break this into phases. What are the major deliverables?" (onboarding.rs:154). Plan watcher starts for medium tier (OpenAiButton.tsx:63-65). AiPlanReview is unchanged and handles review. |
| 4  | Selecting GSD tier launches the AI with GSD instructions, and the selected tier is stored on the project | VERIFIED | `get_instructions(NoPlan, "full")` returns "Run /gsd:new-project" (onboarding.rs:155). `handleTierSubmit` calls `api.setPlanningTier` (ProjectDetail.tsx:154). Plan watcher skipped for `tier !== "full"` is inverted correctly — watcher starts only when `tier !== "full"` (OpenAiButton.tsx:62-65 and ProjectDetail.tsx:172-174). |
| 5  | Clicking "Open AI" on a project with existing tasks shows progress, highlights blockers, and suggests the next action | VERIFIED (with caveat) | Header shows `**Progress:** X/Y tasks complete across N phases`. "What Needs Attention" section lists in-progress and pending tasks. Instructions say "Pick one and start working on it" / "Focus on the current phase". Functionally satisfies CTX-03 though section is named "What Needs Attention" not "What's Next?" — see human verification item 6. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/center/TierSelectionDialog.tsx` | Tier selection dialog with radio list + textarea | VERIFIED | 174 lines. Exports `PlanningTier` type and `TierSelectionDialog` component. Contains "How should we plan this?", "Start Planning", all three tier descriptions, "Change planning approach?" warning dialog, "Keep Current Plan" button, inline Quick tier validation. |
| `src/components/center/TierSelectionDialog.test.tsx` | Failing test stubs for tier dialog | VERIFIED (todo stubs) | 27 lines. All 13 tests are `it.todo()` stubs as planned. Phase 14-00 goal was stubs only. |
| `src/components/center/OpenAiButton.tsx` | Tier gate logic before terminal launch | VERIFIED | Props interface includes `planningTier`, `hasContent`, `onTierDialogOpen`. `needsTierDialog` logic present. GSD tier skips plan watcher. |
| `src/components/center/ProjectDetail.tsx` | Tier badge and Change plan button in header | VERIFIED | Imports `TierSelectionDialog` and `Badge`. `showTierDialog` state. Badge renders tier with "GSD" for full. "Change plan" button present. `handleTierSubmit` implements full backend flow. |
| `src/lib/types.ts` | Project type with planningTier field | VERIFIED | `planningTier: string | null` on line 10. |
| `src-tauri/src/commands/onboarding_commands.rs` | batch_create_tasks + generate_context_file overrides | VERIFIED | `batch_create_tasks` at line 182 inserts with `phase_id = NULL`, emits `plan-saved`. `generate_context_file` at line 215 accepts `tier_override: Option<String>` and `description_override: Option<String>`. |
| `src/lib/tauri.ts` | batchCreateTasks, setPlanningTier, updated generateContextFile bindings | VERIFIED | `generateContextFile` accepts `tierOverride?` and `descriptionOverride?`. `batchCreateTasks` binding at line 210. `setPlanningTier` at line 224. |
| `src/stores/onboardingSlice.ts` | confirmAndSaveQuickPlan for flat task creation | VERIFIED | Interface declares `confirmAndSaveQuickPlan`. Implementation calls `api.batchCreateTasks` then `api.generateContextFile` (D-07). Both `confirmAndSavePlan` and `confirmAndSaveQuickPlan` regenerate context after save. |
| `src/components/center/AiPlanReview.tsx` | Quick tier routing on confirm | VERIFIED | `handleConfirm` checks `phases.length === 1 && phases[0].name.trim() === ""` for Quick tier. Routes to `confirmAndSaveQuickPlan` vs `confirmAndSavePlan`. |
| `src-tauri/src/models/onboarding.rs` | Tier-aware context templates, execution mode context | PARTIAL | `generate_context_file_content` routes by tier via `get_instructions`. Tier-specific text: quick="simple task list", medium="Let's break this into phases", full="/gsd:new-project". Execution mode has "What Needs Attention" section (progress + task listing). ABSENT: no `generate_whats_next`, no "Suggested next task", no blocker phase identification by name. Plan 02 spec for these functions was declared superseded by Phase 13 implementation. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `OpenAiButton.tsx` | `TierSelectionDialog.tsx` | `needsTierDialog` check + `onTierDialogOpen()` prop | WIRED | `onTierDialogOpen` calls `handleTierDialogOpen` in ProjectDetail which sets `showTierDialog=true`. TierSelectionDialog rendered with `open={showTierDialog}`. |
| `ProjectDetail.tsx` | `TierSelectionDialog.tsx` | Change plan button opens dialog | WIRED | `handleChangePlan` sets `isChangingTier` and `showTierDialog=true`. TierSelectionDialog receives `isChangingTier` prop. |
| `ProjectDetail.tsx` | `src/lib/tauri.ts` | `handleTierSubmit` calls `api.setPlanningTier`, `api.generateContextFile` | WIRED | Line 154: `api.setPlanningTier`. Line 161: `api.generateContextFile(project.id, tier, description)`. No silent catch on `setPlanningTier`. |
| `onboardingSlice.ts` | `src/lib/tauri.ts` | `confirmAndSaveQuickPlan` calls `api.batchCreateTasks` | WIRED | Line 157: `api.batchCreateTasks(projectId, allTasks)`. |
| `AiPlanReview.tsx` | `src/lib/tauri.ts` | `handleConfirm` calls `generateContextFile` via store methods (D-07) | WIRED | Both `confirmAndSavePlan` and `confirmAndSaveQuickPlan` call `api.generateContextFile` post-save. |
| `onboarding_commands.rs` | `onboarding.rs` | `generate_context_file` calls `generate_context_file_content` with tier | WIRED | Line 320: `generate_context_file_content(&context_data, &tier)`. Tier routed from `tier_override` → `project.planning_tier` → default "quick". |
| `src-tauri/src/lib.rs` | `onboarding_commands.rs` | `batch_create_tasks` registered in invoke handler | WIRED | `batch_create_tasks` at line 251 in lib.rs handler. `set_planning_tier` at line 256. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `TierSelectionDialog.tsx` | `selectedTier`, `description` | Local state from user input | Yes — user selection | FLOWING |
| `ProjectDetail.tsx` | `project.planningTier` | Zustand store → `list_projects` DB query | Yes — DB read on project load | FLOWING |
| `ProjectDetail.tsx` | `hasContent` | `sortedPhases.length > 0 || tasks.length > 0` | Yes — derived from store state | FLOWING |
| `onboarding_commands.rs:generate_context_file` | `tier` | `tier_override.or_else(|| project.planning_tier.clone()).unwrap_or_else(|| "quick")` | Yes — DB-backed | FLOWING |
| `onboarding_commands.rs:batch_create_tasks` | `tasks` passed in | Frontend `confirmAndSaveQuickPlan` → AI-generated plan | Yes — real task data | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Rust onboarding tests pass | `cargo test onboarding` | 35 passed, 0 failed | PASS |
| TypeScript compilation (Phase 14 files) | `npx tsc --noEmit` | Errors only in pre-existing ThemeSidebar.tsx and UncategorizedSection.tsx (not Phase 14 files) | PASS (Phase 14 files clean) |
| Vitest: existing tests still pass | `npx vitest run ...` | 12 passed, 25 todo (stubs), 0 failed | PASS |
| batch_create_tasks registered in lib.rs | grep for registration | Found at line 251 | PASS |
| set_planning_tier registered in lib.rs | grep for registration | Found at line 256 | PASS |
| TierSelectionDialog exports PlanningTier type | grep | `export type PlanningTier = "quick" \| "medium" \| "full"` at line 14 | PASS |
| Quick tier validation present | grep | `selectedTier === "quick" && !description.trim()` + destructive error message at line 60 | PASS |
| D-07 context regen in both confirm paths | grep | Both `confirmAndSavePlan` (line 128) and `confirmAndSaveQuickPlan` (line 159) call `api.generateContextFile` post-save | PASS |
| GSD tier skips plan watcher | code check | `if tier !== "full"` guards `api.startPlanWatcher` in both OpenAiButton.tsx:62 and ProjectDetail.tsx:172 | PASS |
| setPlanningTier not silently swallowed | code check | `await api.setPlanningTier(project.id, tier)` is NOT inside a try/catch that silently ignores errors — the outer try/catch at line 188 shows toast on failure | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PLAN-01 | 14-00, 14-01, 14-03 | Tier selection dialog shown before first AI session on unplanned project | SATISFIED | TierSelectionDialog component renders 3 radio options; OpenAiButton gates on `needsTierDialog`; `api.setPlanningTier` stores choice so subsequent clicks skip dialog |
| PLAN-02 | 14-00, 14-02, 14-03 | Quick tier generates flat task list saved directly to project | SATISFIED | `batch_create_tasks` inserts with `phase_id=NULL`; `confirmAndSaveQuickPlan` calls `api.batchCreateTasks`; AiPlanReview routes Quick tier output to flat creation |
| PLAN-03 | 14-00, 14-02, 14-03 | Medium tier starts AI conversation then generates phases+tasks for review | SATISFIED | Context file instructs AI to "break into phases"; plan watcher starts for medium tier; AiPlanReview handles review unchanged |
| PLAN-04 | 14-00, 14-01, 14-02, 14-03 | GSD tier launches AI with GSD instructions; tier stored on project | SATISFIED | Context file contains "/gsd:new-project"; `setPlanningTier` saves "full" to DB; plan watcher skipped for GSD |
| CTX-03 | 14-00, 14-02, 14-03 | "What's next?" execution mode shows progress, highlights blockers, suggests next action | SATISFIED (functionally, with naming deviation) | Progress shown in header (`**Progress:** X/Y tasks`); "What Needs Attention" section lists in-progress/pending tasks; tier+state instructions give actionable guidance ("Pick one and start working"). Section name differs from spec ("What Needs Attention" vs "What's Next?"); no "Suggested next task" callout; blocker phases not identified individually. Functional behavior meets requirement; spec's exact format was not implemented. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/center/ProjectDetail.tsx` | 146-191 | `handleTierSubmit` stub comment from Plan 01 replaced correctly — no leftover stub | None | — |
| `src/components/center/TierSelectionDialog.test.tsx` | All | All tests are `it.todo()` stubs | Info | Expected by design — Plan 14-00 was a stub-creation plan. Actual test implementation is deferred (not a blocker for goal). |
| `src-tauri/src/models/onboarding.rs` | 276-310 | "What Needs Attention" section name retained from Phase 11 instead of "What's Next?" as specified in Plan 02 | Warning | Section name differs from CTX-03 spec intent, but functional content meets requirement. Plan 02 SUMMARY explicitly noted Phase 13 already handled this. |

### Human Verification Required

#### 1. End-to-End Quick Tier Flow

**Test:** Run `npm run dev`. Open a project with no tasks and no stored tier. Click "Open AI". Verify tier dialog appears with three options. Select Quick, enter a description, click "Start Planning". Observe the AI terminal launch.
**Expected:** Terminal launches. AI reads context file and generates tasks. After AI writes `plan-output.json`, AiPlanReview appears. Confirm the plan — tasks appear as unassigned (no phase bucket) in ProjectDetail. The `.element/context.md` file changes from planning mode to execution mode (progress header + "What Needs Attention" section appears).
**Why human:** Requires running the app, triggering AI terminal, and reading generated on-disk files.

#### 2. End-to-End Medium Tier Flow

**Test:** Select a project with no tasks. Click "Open AI", select Medium tier, enter description, click "Start Planning".
**Expected:** Terminal launches with context file containing "Let's break this into phases. What are the major deliverables?". Plan watcher starts. AI output produces phases+tasks which appear in AiPlanReview. Confirming creates phases in the project.
**Why human:** Requires live AI interaction to verify the AI receives and follows the medium-tier context instructions.

#### 3. End-to-End GSD Tier Flow

**Test:** Select a project, click "Open AI", select GSD tier.
**Expected:** Terminal launches with context file containing "/gsd:new-project". No AiPlanReview appears (plan watcher NOT started for GSD). Project receives `planningTier = "full"` stored in DB — badge shows "GSD" in header on next render. Subsequent "Open AI" clicks skip the dialog.
**Why human:** Plan watcher absence has no observable UI state. Requires verifying the `start_plan_watcher` Tauri command was NOT called during GSD launch.

#### 4. D-07 Context File Regeneration After Plan Confirmation

**Test:** Complete a Quick or Medium tier AI session through to plan confirmation in AiPlanReview.
**Expected:** After clicking "Confirm" in AiPlanReview, the `.element/context.md` file regenerates from planning mode (with "Output Contract" section) to execution mode (with "What Needs Attention" section listing the newly created tasks).
**Why human:** Requires triggering AiPlanReview confirm with a real pending plan, then reading the file on disk.

#### 5. Tier Badge and Change Plan Warning

**Test:** After completing a Quick tier setup (tier saved), return to ProjectDetail. Observe badge in header. Click "Change plan" on a project that has tasks.
**Expected:** "Quick" badge appears next to project name. Clicking "Change plan" opens a warning dialog: "Change planning approach? ... This project already has tasks." Clicking "Keep Current Plan" closes everything. Clicking "Change Plan" proceeds to the tier selection dialog pre-filled with current tier.
**Why human:** Requires UI rendering with real project state; badge visibility and dialog interaction sequence.

#### 6. CTX-03 Execution Mode Content Adequacy (Judgment Call)

**Test:** Open a project with existing tasks (mixed statuses). Click "Open AI". Inspect the generated `.element/context.md`.
**Expected:** The context file contains sufficient guidance for an AI to understand what to work on next: progress summary, list of tasks needing work, and actionable instruction.
**Why human:** The implementation produces "What Needs Attention" (listing up to 5 in-progress/pending tasks) rather than the spec's "Suggested next task" (single task callout) and "Needs attention" (partially-complete phase list). The requirement says "shows progress, highlights blockers, suggests next action" — whether "What Needs Attention" satisfies "highlights blockers" is a judgment call requiring a human to evaluate if the AI context is actionable enough.

### Gaps Summary

No blocking gaps found. All five observable truths verify as SATISFIED. All key links are wired. All artifacts exist and are substantive.

One warning-level deviation: Plan 02 specified implementing `generate_whats_next` with "Suggested next task" and per-phase blocker identification. The Plan 02 SUMMARY explicitly noted this was superseded by Phase 13's implementation. The resulting execution mode context uses "What Needs Attention" (listing top 5 in-progress/pending tasks) rather than the Plan 02 spec format. This functionally satisfies CTX-03 but may not match the UX intent as precisely as specified.

Six items require human verification — primarily the end-to-end flows that require running the app with a real AI terminal, plus one judgment call on CTX-03 execution mode adequacy.

---

_Verified: 2026-03-27T19:15:00Z_
_Verifier: Claude (gsd-verifier)_
