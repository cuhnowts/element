---
phase: 03-workflows-and-automation
plan: 04
subsystem: ui
tags: [react, codemirror, workflow-builder, zustand, shadcn]

requires:
  - phase: 03-workflows-and-automation/03-03
    provides: "Workflow types, Zustand store, Tauri commands"
  - phase: 03-workflows-and-automation/03-02
    provides: "Backend workflow CRUD, execution engine, scheduler"
provides:
  - "WorkflowBuilder component with insert-anywhere step editing"
  - "StepEditor with shell/HTTP/manual type-specific editors"
  - "ShellEditor with CodeMirror shell syntax highlighting"
  - "HttpStepForm with method/URL/headers/body structured form"
  - "WorkflowExecutorPicker dropdown for step types"
  - "PromoteButton for task-to-workflow promotion"
  - "WorkflowDetail view in CenterPanel"
affects: [03-workflows-and-automation/03-05, 05-ai-and-smart-scheduling]

tech-stack:
  added: ["@codemirror/lang-json"]
  patterns: ["Single-expand accordion pattern for step editing", "Insert-anywhere button pattern between list items"]

key-files:
  created:
    - src/components/center/ShellEditor.tsx
    - src/components/center/HttpStepForm.tsx
    - src/components/center/WorkflowExecutorPicker.tsx
    - src/components/center/StepInsertButton.tsx
    - src/components/center/StepEditor.tsx
    - src/components/center/WorkflowBuilder.tsx
    - src/components/center/PromoteButton.tsx
  modified:
    - src/components/center/WorkflowDetail.tsx
    - src/components/layout/CenterPanel.tsx
    - src/components/center/TaskDetail.tsx
    - src/components/center/TaskHeader.tsx

key-decisions:
  - "Used @codemirror/lang-json instead of @codemirror/lang-javascript json() export for HTTP body editor"
  - "Added PromoteButton to TaskDetail inline rather than TaskHeader since TaskDetail does not use TaskHeader component"
  - "Merged WorkflowDetail with Plan 05 CronScheduler integration (concurrent execution)"

patterns-established:
  - "Single-expand accordion: only one StepEditor expanded at a time via expandedIndex state"
  - "Insert-anywhere: StepInsertButton between every step and at top of list"
  - "Type-switching reset: changing step type via WorkflowExecutorPicker resets config to defaults"

requirements-completed: [TASK-05, TASK-06, AUTO-02]

duration: 6min
completed: 2026-03-17
---

# Phase 03 Plan 04: Workflow Builder UI Summary

**WorkflowBuilder with insert-anywhere step editing, CodeMirror shell/JSON editors, HTTP step form, and task-to-workflow promotion via PromoteButton**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-17T02:50:50Z
- **Completed:** 2026-03-17T02:57:45Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Workflow builder UI with editable step list, single-expand accordion, insert-anywhere buttons
- Type-specific step editors: ShellEditor (CodeMirror shell highlighting), HttpStepForm (method/URL/headers/body), manual Textarea
- WorkflowDetail view in CenterPanel with Run Now, Delete workflow, keyboard shortcuts
- Task-to-workflow promotion via Automate PromoteButton in TaskDetail and TaskHeader

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ShellEditor, HttpStepForm, WorkflowExecutorPicker, StepInsertButton** - `bf3c298` (feat)
2. **Task 2: WorkflowBuilder, StepEditor, and PromoteButton** - `3560d93` (feat)
3. **Task 3: WorkflowDetail view and CenterPanel integration** - `6aa9b8c` (feat)

## Files Created/Modified
- `src/components/center/ShellEditor.tsx` - CodeMirror shell command editor with syntax highlighting
- `src/components/center/HttpStepForm.tsx` - Structured HTTP request form with method/URL/headers/body
- `src/components/center/WorkflowExecutorPicker.tsx` - Step type dropdown (shell/HTTP/manual)
- `src/components/center/StepInsertButton.tsx` - Insert-anywhere "+" button between steps
- `src/components/center/StepEditor.tsx` - Expandable step config with type-specific editors and actions
- `src/components/center/WorkflowBuilder.tsx` - Full step list with insert/move/duplicate/delete/save
- `src/components/center/PromoteButton.tsx` - Task-to-workflow promotion with Automate label
- `src/components/center/WorkflowDetail.tsx` - Workflow detail view with builder, scheduler, execution
- `src/components/layout/CenterPanel.tsx` - Added WorkflowDetail routing on selectedWorkflowId
- `src/components/center/TaskDetail.tsx` - Added PromoteButton to title row
- `src/components/center/TaskHeader.tsx` - Added PromoteButton to header actions

## Decisions Made
- Used @codemirror/lang-json (separate package install) for HTTP body editor since @codemirror/lang-javascript does not export json()
- Added PromoteButton directly to TaskDetail's title row because TaskDetail does not use the TaskHeader component (was rewritten in Phase 2.1)
- Merged WorkflowDetail update with Plan 05's CronScheduler integration since both modified the same file concurrently

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @codemirror/lang-json dependency**
- **Found during:** Task 1 (HttpStepForm creation)
- **Issue:** Plan specified `import { json } from "@codemirror/lang-javascript"` but that module has no json export
- **Fix:** Installed @codemirror/lang-json and imported json() from it
- **Files modified:** package.json, package-lock.json, src/components/center/HttpStepForm.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** bf3c298 (Task 1 commit)

**2. [Rule 3 - Blocking] Skipped shadcn UI primitive creation (already exist)**
- **Found during:** Task 1
- **Issue:** Plan specified creating select, input, textarea, dropdown-menu, separator, dialog -- all already exist from prior phases
- **Fix:** Skipped creation, used existing components directly
- **Files modified:** None (already existed)
- **Verification:** All imports resolve, TypeScript compiles clean

**3. [Rule 3 - Blocking] Added PromoteButton to TaskDetail instead of only TaskHeader**
- **Found during:** Task 3
- **Issue:** Plan specified adding to TaskHeader, but TaskDetail does not render TaskHeader (was rewritten)
- **Fix:** Added PromoteButton to both TaskDetail inline and TaskHeader for future use
- **Files modified:** src/components/center/TaskDetail.tsx, src/components/center/TaskHeader.tsx
- **Verification:** TypeScript compiles, PromoteButton appears in both components

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the deviations noted above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Workflow builder UI complete, ready for Plan 05 (CronScheduler refinements, if any)
- All workflow CRUD operations wired through Zustand store to Tauri backend
- PromoteButton enables seamless task-to-workflow conversion flow

## Self-Check: PASSED

All 8 created files verified on disk. All 3 task commits verified in git log.

---
*Phase: 03-workflows-and-automation*
*Completed: 2026-03-17*
