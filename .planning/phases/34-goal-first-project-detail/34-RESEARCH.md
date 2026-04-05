# Phase 34: Goal-First Project Detail - Research

**Researched:** 2026-04-04
**Domain:** Tauri + React UI restructure, SQLite schema migration, Zustand state management
**Confidence:** HIGH

## Summary

Phase 34 restructures the `ProjectDetail.tsx` component to lead with the project goal rather than name/description/progress. The work spans three layers: (1) a SQLite migration adding a `goal` TEXT column to the `projects` table, with corresponding Rust model and Tauri command updates; (2) a frontend layout restructure replacing the current top-down layout with name row (compact progress + tier badge) -> goal hero card -> workspace button row -> phases -> details accordion; (3) consolidating the `OpenAiButton` + `DirectoryLink` pair into a single `WorkspaceButton` that opens the file tree and focuses the terminal drawer in one action.

The codebase has established patterns for every piece of this work: SQLite migrations via `user_version` pragma bumps, inline editing via `Input` + onBlur save, auto-save via 800ms debounce timers, and shadcn/ui components (`Card`, `Accordion`, `Badge`, `Button`). The Accordion component is already installed using `@base-ui/react/accordion` (not radix). The workspace store already exposes `openTerminal()`, `setProjectCenterTab()`, and `startFileWatcher()` for the workspace entry flow.

**Primary recommendation:** This is a straightforward restructure using established patterns. The main risk is the number of moving parts in `ProjectDetail.tsx` (579 lines) -- the layout change touches nearly every section. Plan as: migration first, then new components (`GoalHeroCard`, `WorkspaceButton`), then `ProjectDetail` restructure, then test updates.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Add `goal` TEXT column to `projects` table via SQLite migration. Keep `description` separate.
- D-02: Update Rust `Project` model, create/update SQL, and Tauri commands for `goal` field.
- D-03: Display goal as bordered card with Target icon and inline edit pencil above phases.
- D-04: Empty state shows "Set a project goal..." prompt inside the same card chrome.
- D-05: Replace OpenAiButton + DirectoryLink row with single "Open Workspace" button (directory + terminal in one action).
- D-06: Show directory path as label next to workspace button. If no directory linked, button becomes "Link Directory".
- D-07: Layout order: Name (tier badge + compact progress) -> Goal hero card -> Workspace button row -> Phases -> Details accordion.
- D-08: Description textarea moves into collapsible "Details" accordion below phases.
- D-09: Progress bar and metadata move into Details accordion or become compact inline indicators on name row.
- D-10: Remove standalone "Change plan" button; tier selection via tier badge click or Details accordion.

### Claude's Discretion
- Goal card border styling, icon choice (Target vs Flag), and edit interaction details
- Exact compact progress indicator format (e.g., "3/5" text vs tiny inline bar)
- Accordion implementation details (reuse existing patterns from TaskDetail)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROJ-01 | User sees the project goal prominently displayed as a hero card above phases | D-03/D-04: GoalHeroCard component using shadcn Card with Target icon. Layout position per D-07. |
| PROJ-02 | User can set and edit the project goal directly in the project detail UI | D-01/D-02: goal column + Tauri API. Edit pattern matches existing name Input onBlur + 800ms debounce. |
| PROJ-03 | Project detail provides streamlined workspace entry (goal -> directory + AI terminal -> work) | D-05/D-06: WorkspaceButton combining openTerminal() + startFileWatcher(). Two clicks: open project -> click button. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Already in project |
| Zustand | 5.x | State management | Already in project, all stores use it |
| @base-ui/react | latest | Accordion primitive | Already installed, used by shadcn accordion component |
| shadcn/ui | N/A (copy-paste) | Card, Badge, Button, Input, Accordion | Already in project at `src/components/ui/` |
| lucide-react | latest | Icons (Target, Pencil, FolderOpen) | Already in project |
| rusqlite | workspace | SQLite from Rust | Already in project |
| tauri | 2.x | IPC bridge | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | latest | Toast notifications | Error feedback on save failures |
| @tauri-apps/plugin-dialog | latest | OS file picker | "Link Directory" flow in WorkspaceButton |

No new dependencies needed. Everything required is already installed.

## Architecture Patterns

### Migration Pattern (from existing codebase)

New SQL file: `src-tauri/src/db/sql/012_project_goal.sql`
```sql
ALTER TABLE projects ADD COLUMN goal TEXT NOT NULL DEFAULT '';
```

Update `migrations.rs` to add version 12 block:
```rust
if version < 12 {
    conn.execute_batch(include_str!("sql/012_project_goal.sql"))?;
    conn.pragma_update(None, "user_version", 12)?;
}
```

**Confidence:** HIGH -- this is the exact pattern used 11 times already (001 through 011).

### Rust Model Update Pattern

The `Project` struct in `src-tauri/src/models/project.rs` needs:
1. Add `pub goal: String` field
2. Update ALL SELECT queries to include `goal` column (there are 3: `list_projects`, `get_project`, and `update_project` return)
3. Update `create_project` INSERT to include goal (default empty string)
4. Update `update_project` to accept and save goal
5. Update ALL `|row|` closures to read the new column index

**Critical detail:** The current `update_project` signature is `(id, name, description)`. Per D-02, it needs to become `(id, name, description, goal)`. This cascades to:
- Tauri command `update_project` in `project_commands.rs` (add `goal: String` parameter)
- Frontend `api.updateProject()` in `src/lib/tauri.ts` (add goal parameter)
- Frontend `Project` type in `src/lib/types.ts` (add `goal: string` field)
- All callers of `apiUpdateProject()` in `ProjectDetail.tsx`

### Inline Edit Pattern (from existing codebase)

The project name uses Input + onBlur save. The description uses Textarea + 800ms debounce. The goal should follow the same pattern:

```typescript
// Local state
const [goal, setGoal] = useState("");
const [isEditingGoal, setIsEditingGoal] = useState(false);
const goalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

// Sync from project
useEffect(() => {
  if (project) {
    setGoal(project.goal);
  }
}, [project?.id]);

// Save handler (same 800ms debounce as description)
const handleGoalChange = (value: string) => {
  setGoal(value);
  if (goalTimer.current) clearTimeout(goalTimer.current);
  goalTimer.current = setTimeout(() => {
    apiUpdateProject(project.id, project.name, project.description, value);
  }, 800);
};
```

### Workspace Entry Pattern

The workspace store already has the primitives needed:
```typescript
// From useWorkspaceStore:
openTerminal()         // sets drawerOpen: true, activeDrawerTab: "terminal"
setProjectCenterTab()  // switches center panel tab

// From useTerminalSessionStore:
createSession()        // creates terminal session if none exists

// From api:
startFileWatcher()     // starts watching directory for file changes
```

The WorkspaceButton action combines these:
1. Call `api.startFileWatcher(directoryPath)` to populate file tree
2. Call `useWorkspaceStore.getState().setProjectCenterTab(projectId, "files")` to show file tree
3. Call `useWorkspaceStore.getState().openTerminal()` to open terminal drawer

### Accordion Pattern (from shadcn component)

The Accordion is built on `@base-ui/react/accordion` (NOT radix). The API:
```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

<Accordion>
  <AccordionItem>
    <AccordionTrigger>Details</AccordionTrigger>
    <AccordionContent>
      {/* Description textarea, metadata, tier change */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

Note: The Accordion component does NOT use `type="single"` or `collapsible` props the way radix does. It uses `@base-ui/react/accordion` which has its own API. The existing component file shows it wraps `AccordionPrimitive.Root`, `.Item`, `.Trigger`, `.Header`, and `.Panel`.

**Important:** TaskDetail.tsx does NOT currently use an Accordion. The UI-SPEC says to "reuse existing patterns from TaskDetail" for the accordion, but what it actually means is reusing the existing shadcn Accordion component (which is installed but not yet used in TaskDetail).

### Anti-Patterns to Avoid
- **Returning new objects from Zustand selectors:** Use module-level constants for empty states (project memory: `feedback_zustand_selector_stability.md`)
- **Mutating the `apiUpdateProject` signature without updating all callers:** There are at least 3 call sites in ProjectDetail.tsx
- **Forgetting column index shift in rusqlite row closures:** Adding `goal` between existing columns shifts all subsequent `row.get(N)` indices

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible section | Custom show/hide toggle | shadcn Accordion (`src/components/ui/accordion.tsx`) | Handles animation, a11y, keyboard nav |
| Hero card styling | Custom div with borders | shadcn Card (`src/components/ui/card.tsx`) | Consistent with design system |
| Inline edit with auto-save | Custom focus/blur logic | Follow existing Input + onBlur + debounce pattern from ProjectDetail | Battle-tested in production |
| Directory picker | Custom file input | `@tauri-apps/plugin-dialog` open() | OS-native, already used in DirectoryLink |

## Common Pitfalls

### Pitfall 1: SQLite Column Index Shift
**What goes wrong:** Adding `goal` to the projects table changes the column order in SELECT statements. All `row.get(N)` calls in Rust need updating.
**Why it happens:** rusqlite uses positional indexing, not named columns.
**How to avoid:** Update ALL three query methods (`list_projects`, `get_project`, `update_project` return) and their row closures simultaneously. Add goal AFTER the existing columns to minimize shift (e.g., after `planning_tier`, before `created_at`, or at the end).
**Warning signs:** Runtime panics with "column index out of range" or wrong data in wrong fields.

### Pitfall 2: apiUpdateProject Cascade
**What goes wrong:** The `apiUpdateProject` helper in ProjectDetail.tsx calls `api.updateProject(id, name, description)`. After adding goal, all callers must pass goal too, or goal will be silently cleared.
**Why it happens:** The Rust update_project overwrites ALL fields including goal.
**How to avoid:** Option A: Add goal to updateProject signature. Option B: Create a separate `updateProjectGoal(id, goal)` Tauri command that only updates the goal column. Option B is safer -- prevents goal from being overwritten by name/description saves.
**Warning signs:** Goal disappears after editing name or description.

### Pitfall 3: Accordion Base-UI vs Radix API Confusion
**What goes wrong:** Using radix Accordion props (`type="single"`, `collapsible`) on the base-ui Accordion component.
**Why it happens:** The UI-SPEC references shadcn Accordion patterns, but the actual implementation uses `@base-ui/react/accordion` not `@radix-ui/react-accordion`.
**How to avoid:** Check the actual `src/components/ui/accordion.tsx` wrapper -- use its props, not radix docs.
**Warning signs:** TypeScript errors on Accordion props.

### Pitfall 4: File Watcher Race Condition
**What goes wrong:** Calling `startFileWatcher` before the directory state is confirmed can throw if `directoryPath` is null.
**Why it happens:** The WorkspaceButton may be clicked before directory is linked.
**How to avoid:** Guard WorkspaceButton action with `if (!project.directoryPath)` check; show "Link Directory" variant instead.
**Warning signs:** Tauri error toast on workspace button click.

### Pitfall 5: OpenAiButton Removal Breaking Empty State
**What goes wrong:** The current empty phases state renders `<OpenAiButton>` as the primary CTA. Removing OpenAiButton breaks this.
**Why it happens:** The empty state card in ProjectDetail uses OpenAiButton as inline component.
**How to avoid:** Update the empty phases state to reference the goal or use a different CTA pattern. Per UI-SPEC copywriting: "Set a goal above, then use AI to plan your project or add phases manually."
**Warning signs:** Missing CTA in empty project state.

## Code Examples

### GoalHeroCard Component Structure
```tsx
// src/components/center/GoalHeroCard.tsx
import { useState, useRef } from "react";
import { Target, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GoalHeroCardProps {
  goal: string;
  onGoalChange: (goal: string) => void;
}

export function GoalHeroCard({ goal, onGoalChange }: GoalHeroCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localGoal, setLocalGoal] = useState(goal);

  // Edit mode: Input with auto-focus, save on blur/Enter, cancel on Escape
  // Display mode: Target icon + goal text + pencil on hover
  // Empty state: "Set a project goal..." placeholder, click enters edit
}
```

### WorkspaceButton Component Structure
```tsx
// src/components/center/WorkspaceButton.tsx
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { api } from "@/lib/tauri";
import { open } from "@tauri-apps/plugin-dialog";

interface WorkspaceButtonProps {
  projectId: string;
  directoryPath: string | null;
  onLink: (path: string) => void;
}

export function WorkspaceButton({ projectId, directoryPath, onLink }: WorkspaceButtonProps) {
  const openTerminal = useWorkspaceStore((s) => s.openTerminal);

  const handleOpenWorkspace = async () => {
    if (!directoryPath) return;
    await api.startFileWatcher(directoryPath);
    useWorkspaceStore.getState().setProjectCenterTab(projectId, "files");
    openTerminal();
  };

  const handleLinkDirectory = async () => {
    const selected = await open({ directory: true, multiple: false, title: "Select project directory" });
    if (typeof selected === "string") onLink(selected);
  };

  // Render "Open Workspace" if directoryPath exists, "Link Directory" otherwise
}
```

### Migration SQL
```sql
-- src-tauri/src/db/sql/012_project_goal.sql
ALTER TABLE projects ADD COLUMN goal TEXT NOT NULL DEFAULT '';
```

### Separate Goal Update Command (recommended to avoid Pitfall 2)
```rust
// In project.rs model
pub fn update_project_goal(&self, id: &str, goal: &str) -> Result<Project, rusqlite::Error> {
    let now = chrono::Utc::now().to_rfc3339();
    self.conn().execute(
        "UPDATE projects SET goal = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![goal, now, id],
    )?;
    self.get_project(id)
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (via package.json) |
| Config file | vite.config.ts (vitest configured inline) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-01 | Goal hero card renders above phases | unit | `npx vitest run src/components/center/__tests__/ProjectDetail.test.tsx` | Yes (needs update) |
| PROJ-02 | Goal edit via inline input + save | unit | `npx vitest run src/components/center/__tests__/GoalHeroCard.test.tsx` | No -- Wave 0 |
| PROJ-03 | Workspace button opens file tree + terminal | unit | `npx vitest run src/components/center/__tests__/WorkspaceButton.test.tsx` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/center/__tests__/GoalHeroCard.test.tsx` -- covers PROJ-01, PROJ-02
- [ ] `src/components/center/__tests__/WorkspaceButton.test.tsx` -- covers PROJ-03
- [ ] Update `src/components/center/__tests__/ProjectDetail.test.tsx` -- existing test needs layout restructure assertions

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radix Accordion | Base-UI Accordion | shadcn v2 (2025) | Different API -- no `type` or `collapsible` props |
| Separate AI + Directory buttons | Unified workspace entry | This phase | Reduces cognitive load, meets 2-click requirement |

## Open Questions

1. **Separate `updateProjectGoal` command vs extended `updateProject`**
   - What we know: Extended `updateProject` requires all callers to pass goal, risking silent data loss. Separate command is safer.
   - What's unclear: Whether the user prefers API simplicity (one update) or safety (separate commands).
   - Recommendation: Create a separate `updateProjectGoal(id, goal)` Tauri command AND also add goal to the main `updateProject` for completeness. The GoalHeroCard should use the dedicated command.

2. **WorkspaceButton interaction with existing OpenAiButton flows**
   - What we know: OpenAiButton handles complex logic (tier dialog, agent delegation, plan watchers, CLI validation). WorkspaceButton is simpler (just open files + terminal).
   - What's unclear: Whether the "Plan Project" / "Check Progress" flows from OpenAiButton should be preserved somewhere.
   - Recommendation: WorkspaceButton replaces OpenAiButton in the main layout only. The empty-phases state and TierSelectionDialog keep their existing AI planning triggers. The OpenAiButton component file can remain in codebase for reuse elsewhere if needed.

3. **Base-UI Accordion collapsible behavior**
   - What we know: The component is installed but never used in the app yet.
   - What's unclear: Whether `@base-ui/react/accordion` defaults to collapsible or requires explicit prop.
   - Recommendation: Test the accordion behavior during implementation; base-ui accordion items are collapsible by default.

## Sources

### Primary (HIGH confidence)
- `src/components/center/ProjectDetail.tsx` -- full current implementation (579 lines)
- `src-tauri/src/models/project.rs` -- Rust model with all SQL queries
- `src-tauri/src/commands/project_commands.rs` -- Tauri command signatures
- `src-tauri/src/db/migrations.rs` -- migration system (11 existing migrations)
- `src/lib/tauri.ts` -- frontend API wrapper
- `src/lib/types.ts` -- TypeScript types
- `src/stores/useWorkspaceStore.ts` -- workspace state management
- `src/components/ui/accordion.tsx` -- base-ui Accordion wrapper
- `src/components/ui/card.tsx` -- Card component
- `34-CONTEXT.md` -- locked decisions D-01 through D-10
- `34-UI-SPEC.md` -- visual and interaction contract

### Secondary (MEDIUM confidence)
- `src/components/center/OpenAiButton.tsx` -- complex AI button being replaced
- `src/components/center/DirectoryLink.tsx` -- directory picker being consolidated

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new deps
- Architecture: HIGH -- all patterns directly observable in existing codebase
- Pitfalls: HIGH -- identified from actual code analysis (column indexing, API cascade, component API mismatch)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable -- internal restructure, no external API dependencies)
