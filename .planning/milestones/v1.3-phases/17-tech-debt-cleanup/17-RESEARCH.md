# Phase 17: Tech Debt Cleanup - Research

**Researched:** 2026-03-29
**Domain:** TypeScript type errors, dead code removal, navigation bug diagnosis
**Confidence:** HIGH

## Summary

Phase 17 addresses three specific tech debt items: 3 TypeScript compiler errors, orphaned files, and a navigation bug in the Open AI button. All three are well-scoped with clear success criteria. The TypeScript errors have straightforward fixes involving type alignment (not casts). The orphaned files (ScopeInputForm.tsx, OnboardingWaitingCard.tsx) are already deleted from the source tree; verification confirms zero remaining references. One additional orphan was discovered: PlanWithAiButton.tsx (zero importers).

The navigation bug is the most complex item. The symptom is that clicking "Open AI" without proper state navigates to the home screen (TodayView). Analysis of the codebase reveals the home screen renders when `selectedProjectId` is null. There are exactly 3 code paths that set `selectedProjectId` to null: project deletion, task selection (selectTask with non-null ID), and theme selection. The bug diagnosis must trace which of these fires during the Open AI flow.

**Primary recommendation:** Fix TypeScript errors first (pure type changes, zero risk), verify orphans second, then diagnose and fix the navigation bug with a test that reproduces the failure condition.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Root cause is unknown -- Claude must reproduce and diagnose during execution. The symptom is that clicking "Open AI" without proper state navigates to the home screen instead of staying on ProjectDetail.
- **D-02:** Expected fix behavior: show an error toast describing what's wrong AND keep the user on ProjectDetail. No navigation away under any error condition.
- **D-03:** The current OpenAiButton.tsx already handles missing directory (toast) and missing CLI tool (toast). The bug likely involves launchTerminalCommand side effects or a state race. Diagnosis is part of execution.
- **D-04:** Fix with proper type alignment -- update type definitions or interfaces so types genuinely match. Do not use type assertions or `as` casts to silence errors.
- **D-05:** Three known errors: ThemeSidebar.tsx:52 (DraggableAttributes type mismatch), ThemeSidebar.tsx:91 (missing Task type reference), UncategorizedSection.tsx:165 (Theme type missing sortOrder/createdAt/updatedAt fields).
- **D-06:** ScopeInputForm.tsx and OnboardingWaitingCard.tsx are already deleted from the source tree. Verify no stale imports or references remain.
- **D-07:** Perform a light sweep for other obviously dead code (zero importers) while cleaning up. Not an exhaustive dead code audit -- just catch obvious orphans.

### Claude's Discretion
- Navigation bug diagnosis approach (which files to trace, how to reproduce)
- Specific type fixes for each TS error (as long as they're proper alignment, not casts)
- Scope of "light sweep" for dead code -- use judgment on what's obviously dead vs potentially used

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEBT-01 | Fix 3 pre-existing TypeScript errors in ThemeSidebar.tsx and UncategorizedSection.tsx | All 3 errors reproduced and root causes identified -- see Architecture Patterns section |
| DEBT-02 | Delete orphaned ScopeInputForm.tsx and OnboardingWaitingCard.tsx (zero importers) | Files already deleted, zero references confirmed. One additional orphan found: PlanWithAiButton.tsx |
| DEBT-03 | Fix "Open AI" navigation bug -- clicking Open AI without proper state navigates to home screen instead of showing error toast | Navigation flow fully traced, 3 code paths that null selectedProjectId identified -- see Common Pitfalls section |
</phase_requirements>

## Architecture Patterns

### TypeScript Error Analysis

**Error 1: ThemeSidebar.tsx:52 -- DraggableAttributes type mismatch**

```
Type '{ attributes: DraggableAttributes; listeners: SyntheticListenerMap | undefined; }'
is not assignable to type 'DragHandleProps'.
  Types of property 'attributes' are incompatible.
    Type 'DraggableAttributes' is not assignable to type 'Record<string, unknown>'.
```

**Root cause:** The local `DragHandleProps` type (line 23-26) defines `attributes: Record<string, unknown>` but `useSortable()` returns `DraggableAttributes` which is a concrete interface with specific properties (role, tabIndex, aria-disabled, aria-pressed, aria-roledescription, aria-describedby). TypeScript's index signature check prevents assigning a concrete interface to `Record<string, unknown>`.

**Fix:** Import `DraggableAttributes` from `@dnd-kit/core` and use it in the `DragHandleProps` type. Also import `SyntheticListenerMap` for the listeners type (currently typed as `Record<string, unknown> | undefined`).

```typescript
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};
```

Note: `SyntheticListenerMap` may not be in the public exports of `@dnd-kit/core`. Alternative approach: import only `DraggableAttributes` from `@dnd-kit/core` and keep listeners as the return type from `useSortable`. Check if `@dnd-kit/core` exports `SyntheticListenerMap` at the top level; if not, use the type directly from useSortable's return type or `DraggableSyntheticListeners` which IS exported.

```typescript
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";

type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
};
```

**Confidence:** HIGH -- verified against @dnd-kit/core@6.3.1 type definitions on disk.

---

**Error 2: ThemeSidebar.tsx:91 -- Cannot find name 'Task'**

```
error TS2304: Cannot find name 'Task'.
```

**Root cause:** Line 91 uses `Task[]` in the type annotation for the `themedTasks` map but `Task` is not imported. Only `Theme` is imported from `@/lib/types`.

**Fix:** Add `Task` to the import from `@/lib/types` on line 21.

```typescript
import type { Theme, Task } from "@/lib/types";
```

**Confidence:** HIGH -- trivially verified.

---

**Error 3: UncategorizedSection.tsx:165 -- Theme type missing fields**

```
Type '{ id: string; name: string; color: string; }[]' is not assignable to type 'Theme[]'.
  Type '{ id: string; name: string; color: string; }' is missing the following properties
  from type 'Theme': sortOrder, createdAt, updatedAt
```

**Root cause:** The `UncategorizedProjectRow` component (line 108-179) declares its `themes` prop inline as `{ id: string; name: string; color: string }[]` instead of using the full `Theme` type. The `MoveToThemeMenu` component expects `Theme[]`. The caller passes store `themes` (full `Theme[]`) into UncategorizedProjectRow, which narrows the type, then passes it to MoveToThemeMenu which expects the full type.

**Fix:** Change the inline type annotation for `themes` in UncategorizedProjectRow's props (line 123) to use `Theme[]`:

```typescript
// Line 123, change from:
themes: { id: string; name: string; color: string }[];
// To:
themes: Theme[];
```

The `Theme` type is already imported at line 12: `import type { Project, Task } from "@/lib/types"` -- but `Theme` is NOT imported there. Need to add it:

```typescript
import type { Project, Task, Theme } from "@/lib/types";
```

Wait -- checking again. `Theme` IS NOT imported in UncategorizedSection.tsx. The current import on line 12 is `import type { Project, Task } from "@/lib/types"`. The fix needs to add Theme to that import AND change the inline prop type.

**Confidence:** HIGH -- verified against source code.

### Navigation Flow Analysis (DEBT-03)

The app uses Zustand stores for navigation state (no React Router). The "home screen" is `TodayView`, rendered by `CenterPanel` when `selectedProjectId` is null.

**Code paths that set selectedProjectId to null:**

1. **projectSlice.ts:42** -- When the currently selected project is deleted
2. **taskSlice.ts:79** -- When `selectTask(taskId)` is called with a non-null ID: `set({ selectedTaskId: taskId, selectedProjectId: null, selectedThemeId: null })`
3. **themeSlice.ts:30** -- When `selectTheme(themeId)` is called: `set({ selectedThemeId: themeId, selectedProjectId: null, selectedTaskId: null })`

**The Open AI button flow (OpenAiButton.tsx):**

1. Check directoryPath -- toast + early return if null
2. Check tier dialog needed -- open dialog + early return if needed
3. Read CLI settings (async)
4. Check CLI configured -- toast + early return if null
5. Validate CLI tool exists -- toast + early return if invalid
6. Generate context file (async)
7. Start plan watcher (async, for non-full tiers)
8. Build args, call `launchTerminalCommand(command, fullArgs)`
9. Catch: `toast.error()`
10. Finally: `setIsLaunching(false)`

**`launchTerminalCommand`** (useWorkspaceStore.ts:115-122) is synchronous -- it does `set()` to update `terminalInitialCommand`, increment `terminalSessionKey`, open drawer to terminal tab. It does NOT modify `selectedProjectId`.

**Hypothesis for the bug:** The bug likely does NOT involve `launchTerminalCommand` directly setting `selectedProjectId` to null. More likely scenarios:

- **State race with async operations:** An async operation (generateContextFile, startPlanWatcher) rejects, and during the error handling a re-render or listener fires that deselects the project.
- **Terminal component mounting:** When the terminal tab opens, the terminal component mounts. If terminal mounting triggers any store action that calls selectTask or selectTheme, that would null out selectedProjectId.
- **Event listener side effect:** The `listen()` calls in ProjectDetail (plan-output-detected, plan-output-error) could fire during the flow and trigger state changes.
- **The "without proper state" qualifier:** The bug may only manifest when specific conditions are not met (e.g., no directory linked but somehow bypassing the early return, or when the terminal kill/respawn cycle causes a brief unmount of CenterPanel that loses state).

**Diagnosis strategy:** The executor should:
1. Add console.log/breakpoints to all 3 `selectedProjectId = null` code paths
2. Reproduce the "without proper state" condition (which conditions trigger it)
3. Trace which code path fires and what triggered it
4. Fix the root cause (likely guard a store action or prevent a side effect)

### Anti-Patterns to Avoid
- **Type assertion casts (`as`):** D-04 explicitly forbids this. Fix types at their definitions, not at usage sites.
- **Suppressing errors with `// @ts-ignore` or `// @ts-expect-error`:** Not acceptable for this phase.
- **Swallowing errors in catch blocks:** The navigation bug fix must show a toast AND prevent navigation, not just one or the other.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DnD type definitions | Custom Record<string, unknown> approximations | Import actual types from @dnd-kit/core | Types drift from library updates |
| Dead code detection | Manual file-by-file grep | `tsc --noEmit` for type errors + grep for zero-importer files | Compiler catches what manual review misses |

## Common Pitfalls

### Pitfall 1: Fixing the Wrong Navigation Bug
**What goes wrong:** The fix addresses a hypothetical cause without reproducing the actual bug first.
**Why it happens:** The root cause is explicitly unknown (D-01). Multiple plausible theories exist.
**How to avoid:** The plan MUST include a diagnosis step before the fix step. Reproduce the bug, identify the exact code path, then fix it.
**Warning signs:** A fix that "should work" but was never tested against the actual reproduction steps.

### Pitfall 2: DraggableAttributes Import Path
**What goes wrong:** Importing from internal module paths (e.g., `@dnd-kit/core/dist/hooks/utilities`) which may break on upgrades.
**Why it happens:** `SyntheticListenerMap` is not in the top-level exports of @dnd-kit/core.
**How to avoid:** Use `DraggableSyntheticListeners` which IS exported from `@dnd-kit/core`'s top-level index. Verified in `node_modules/@dnd-kit/core/dist/index.d.ts`.
**Warning signs:** Import paths that include `dist/` or internal module structure.

### Pitfall 3: Orphan Sweep Too Aggressive
**What goes wrong:** Deleting a file that appears orphaned but is dynamically imported or used via barrel exports.
**Why it happens:** Grep-based import search misses dynamic imports, re-exports, and string-based references.
**How to avoid:** Only delete files with zero static importers AND no dynamic import patterns. For borderline cases, leave them.
**Warning signs:** Files that are exported from index.ts barrel files but not directly imported elsewhere.

### Pitfall 4: Missing the "Finally" Block Interaction
**What goes wrong:** The navigation bug fix introduces a new state inconsistency because the `finally` block in OpenAiButton resets `isLaunching` after the fix has already modified state.
**Why it happens:** Async error handling with finally blocks can cause unexpected state sequences.
**How to avoid:** Ensure the fix accounts for the full try/catch/finally flow, not just the error path.

## Code Examples

### Fix for ThemeSidebar.tsx DragHandleProps type (Error 1 + Error 2)

```typescript
// Before (lines 1-26):
import type { Theme } from "@/lib/types";

type DragHandleProps = {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
};

// After:
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import type { Theme, Task } from "@/lib/types";

type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
};
```

### Fix for UncategorizedSection.tsx Theme type (Error 3)

```typescript
// Before (line 12):
import type { Project, Task } from "@/lib/types";

// After:
import type { Project, Task, Theme } from "@/lib/types";

// Before (line 123 in UncategorizedProjectRow props):
themes: { id: string; name: string; color: string }[];

// After:
themes: Theme[];
```

### Navigation bug fix pattern (conceptual -- actual fix depends on diagnosis)

```typescript
// If the bug is in the catch path, wrap with navigation guard:
try {
  // ... existing flow
} catch (e) {
  // Ensure we don't lose project selection on error
  toast.error(`Failed to launch AI: ${e}`);
  // Do NOT call any function that might set selectedProjectId to null
}
```

## Dead Code Findings

### Confirmed Orphans (zero importers)
| File | Evidence | Action |
|------|----------|--------|
| `ScopeInputForm.tsx` | Already deleted from source tree | Verify no references (DONE -- zero found) |
| `OnboardingWaitingCard.tsx` | Already deleted from source tree | Verify no references (DONE -- zero found) |
| `PlanWithAiButton.tsx` | Only self-references, zero importers anywhere in `src/` | Delete |

### Not Orphans (confirmed in use)
| File | Importer |
|------|----------|
| `ThemeDetail.tsx` | `CenterPanel.tsx` |
| `ExecutionHistory.tsx` | `OutputDrawer.tsx` |
| `PromoteButton.tsx` | `TaskHeader.tsx`, `TaskDetail.tsx` |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | Inline in package.json (scripts: "test": "vitest run") |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEBT-01 | Zero TypeScript errors | compiler | `npx tsc --noEmit` | N/A (compiler check) |
| DEBT-02 | No orphaned file references | grep | `grep -r "ScopeInputForm\|OnboardingWaitingCard" src/` | N/A (grep check) |
| DEBT-03 | Open AI error shows toast, stays on ProjectDetail | unit | `npx vitest run src/components/center/OpenAiButton.test.tsx` | Exists -- needs new test case |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit && npm test -- --run`
- **Per wave merge:** `npx tsc --noEmit && npm test`
- **Phase gate:** Full suite green + zero tsc errors before verification

### Wave 0 Gaps
- [ ] New test case in `OpenAiButton.test.tsx` -- covers DEBT-03 navigation bug (toast shown + no project deselection)

## Sources

### Primary (HIGH confidence)
- Direct source code analysis of ThemeSidebar.tsx, UncategorizedSection.tsx, OpenAiButton.tsx, ProjectDetail.tsx, CenterPanel.tsx, projectSlice.ts, taskSlice.ts, themeSlice.ts, useWorkspaceStore.ts
- `npx tsc --noEmit` output -- confirmed exactly 3 errors matching D-05
- `@dnd-kit/core@6.3.1` type definitions on disk (node_modules/@dnd-kit/core/dist/hooks/useDraggable.d.ts)
- `grep` verification of zero references to deleted orphan files
- `grep` verification of PlanWithAiButton.tsx as zero-importer orphan

### Secondary (MEDIUM confidence)
- Navigation bug hypothesis based on code path analysis (root cause unconfirmed per D-01)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all fixes are in existing code
- Architecture: HIGH -- all error sources identified and verified against compiler output
- Pitfalls: MEDIUM -- navigation bug root cause is hypothetical until reproduced

**Research date:** 2026-03-29
**Valid until:** Indefinite (tech debt fixes against specific known errors)
