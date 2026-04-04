# Phase 17: Tech Debt Cleanup - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix accumulated tech debt so the codebase is clean and navigation is reliable before adding new state complexity in v1.3. Three specific issues: TypeScript errors, orphaned files, and a navigation bug in the Open AI button.

</domain>

<decisions>
## Implementation Decisions

### Navigation Bug (DEBT-03)
- **D-01:** Root cause is unknown -- Claude must reproduce and diagnose during execution. The symptom is that clicking "Open AI" without proper state navigates to the home screen instead of staying on ProjectDetail.
- **D-02:** Expected fix behavior: show an error toast describing what's wrong AND keep the user on ProjectDetail. No navigation away under any error condition.
- **D-03:** The current OpenAiButton.tsx already handles missing directory (toast) and missing CLI tool (toast). The bug likely involves launchTerminalCommand side effects or a state race. Diagnosis is part of execution.

### TypeScript Errors (DEBT-01)
- **D-04:** Fix with proper type alignment -- update type definitions or interfaces so types genuinely match. Do not use type assertions or `as` casts to silence errors.
- **D-05:** Three known errors: ThemeSidebar.tsx:52 (DraggableAttributes type mismatch), ThemeSidebar.tsx:91 (missing Task type reference), UncategorizedSection.tsx:165 (Theme type missing sortOrder/createdAt/updatedAt fields).

### Orphaned Files (DEBT-02)
- **D-06:** ScopeInputForm.tsx and OnboardingWaitingCard.tsx are already deleted from the source tree. Verify no stale imports or references remain.
- **D-07:** Perform a light sweep for other obviously dead code (zero importers) while cleaning up. Not an exhaustive dead code audit -- just catch obvious orphans.

### Claude's Discretion
- Navigation bug diagnosis approach (which files to trace, how to reproduce)
- Specific type fixes for each TS error (as long as they're proper alignment, not casts)
- Scope of "light sweep" for dead code -- use judgment on what's obviously dead vs potentially used

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### TypeScript Errors
- `src/components/sidebar/ThemeSidebar.tsx` -- Lines 52 and 91 have TS errors (DraggableAttributes, missing Task type)
- `src/components/sidebar/UncategorizedSection.tsx` -- Line 165 has TS error (Theme type missing fields)

### Navigation Bug
- `src/components/center/OpenAiButton.tsx` -- Current Open AI button with error handling
- `src/components/center/ProjectDetail.tsx` -- Parent view that must remain visible on error
- `src/stores/useWorkspaceStore.ts` -- Contains launchTerminalCommand (likely involved in navigation side effect)

### AI Settings
- `src/components/settings/AiSettings.tsx` -- References "Open AI" terminology

No external specs -- requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `toast` from sonner -- already used in OpenAiButton for error notifications
- Existing error handling pattern in OpenAiButton (early return + toast) should be extended to cover the navigation bug case

### Established Patterns
- Error handling: toast.error() with descriptive messages, early return from async handlers
- Type definitions: Theme type in database layer, DragHandleProps interface for drag-and-drop
- Component structure: Button components wrap lucide icons with gap-1.5 styling

### Integration Points
- `useWorkspaceStore.launchTerminalCommand` -- the function that may cause unwanted navigation
- TypeScript compiler (tsc --noEmit) -- zero errors is the success criterion

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. The key constraint is that fixes should be proper (type alignment, not casts) and the navigation bug must be diagnosed from scratch since the root cause is unknown.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 17-tech-debt-cleanup*
*Context gathered: 2026-03-29*
