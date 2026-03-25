---
phase: 11-workspace-integration-and-ai-context
verified: 2026-03-25T03:51:45Z
status: gaps_found
score: 9/11 must-haves verified
gaps:
  - truth: "Switching projects restores the drawer open/closed state and active drawer tab for that project"
    status: failed
    reason: "handleTabChange in OutputDrawer.tsx contains setProjectDrawerState but is never called — the actual tab bar lives in AppLayout.tsx and calls setActiveDrawerTab directly, bypassing per-project state saving. TypeScript reports TS6133: 'handleTabChange is declared but its value is never read.'"
    artifacts:
      - path: "src/components/layout/OutputDrawer.tsx"
        issue: "handleTabChange (line 43) with setProjectDrawerState call is dead code — never wired to any UI event"
      - path: "src/components/layout/AppLayout.tsx"
        issue: "handleTabClick (line 42) calls setActiveDrawerTab directly, not the per-project-aware handleTabChange"
    missing:
      - "Wire setProjectDrawerState into AppLayout.tsx handleTabClick, or move the tab bar into OutputDrawer.tsx where handleTabChange is defined"
  - truth: "If no CLI tool is configured, a toast says 'No AI tool configured' with navigation to Settings"
    status: failed
    reason: "User-approved deviation: CLI tool was hardcoded to 'claude --dangerously-skip-permissions'. The getAppSetting guard and toast were intentionally removed. Documented in 11-03-SUMMARY.md as a key-decision. The must_have truth is now obsolete, but it is still present in the plan frontmatter and not matched by implementation."
    artifacts:
      - path: "src/components/center/OpenAiButton.tsx"
        issue: "No getAppSetting call, no 'No AI tool configured' toast — hardcoded claude invocation instead"
    missing:
      - "Either: (a) update plan 03 must_haves to remove this truth and reflect the hardcoded approach, or (b) add a configurable CLI tool path setting so the guard is meaningful. This is a documentation gap more than a code gap — the user approved the deviation."
---

# Phase 11: Workspace Integration and AI Context Verification Report

**Phase Goal:** Users can click an "Open AI" button that seeds full project context into the embedded terminal, giving the AI immediate awareness of project state
**Verified:** 2026-03-25T03:51:45Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Calling generate_context_file with a project ID produces a .element/context.md file in the project directory | VERIFIED | Command in onboarding_commands.rs:182 — queries DB, builds context data, writes to `{directory_path}/.element/context.md`, returns path |
| 2 | Context file contains project name, all phases with tasks (name, status), progress metrics, and next steps | VERIFIED | generate_populated_project_context (onboarding.rs:122) — generates Overview, Phases, What Needs Attention, Output Contract sections |
| 3 | For empty projects (no phases/tasks), context file contains onboarding instructions and output contract | VERIFIED | generate_empty_project_context (onboarding.rs:201) — generates onboarding Your Task section with output contract |
| 4 | Context file includes the plan-output.json contract so AI can generate structured plans | VERIFIED | output_contract_section() (onboarding.rs:240) — included in both populated and empty paths |
| 5 | Per-project workspace state (center tab, drawer open/closed, drawer tab) is stored in a session-only Zustand map keyed by project ID | VERIFIED | useWorkspaceStore.ts — projectStates: Record<string, ProjectWorkspaceState>, excluded from partialize (line 142) |
| 6 | Switching projects restores the last-active center tab for that project | VERIFIED | CenterPanel.tsx:35-48 — useEffect on selectedProjectId calls saveCurrentProjectState, restoreProjectState, setActiveProjectTab |
| 7 | Switching projects restores the drawer open/closed state and active drawer tab for that project | FAILED | handleTabChange in OutputDrawer.tsx contains setProjectDrawerState but is never wired to the tab bar (dead code). Actual tab changes go through AppLayout.tsx which calls setActiveDrawerTab directly. |
| 8 | useTerminal supports an optional initialCommand that runs a specified command instead of the default shell | VERIFIED | useTerminal.ts:12-74 — initialCommand param, falls back to /bin/zsh if null |
| 9 | Workspace store exposes a terminalSessionKey and launchTerminalCommand action for kill/respawn flow | VERIFIED | useWorkspaceStore.ts:37,115 — terminalSessionKey incremented by launchTerminalCommand, triggers TerminalTab remount |
| 10 | User sees an "Open AI" button in the ProjectDetail header area | VERIFIED | ProjectDetail.tsx:24,276,346 — OpenAiButton rendered both in header and empty state card |
| 11 | Clicking "Open AI" writes .element/context.md, opens drawer to Terminal, and spawns the configured CLI tool in the visible PTY terminal | VERIFIED | OpenAiButton.tsx:26-35 — generateContextFile, startPlanWatcher, launchTerminalCommand("claude", ["--dangerously-skip-permissions", contextPath]) |
| 12 | If no CLI tool is configured, a toast says "No AI tool configured" with navigation to Settings | FAILED | User-approved deviation: CLI hardcoded to claude, getAppSetting guard removed. This must_have truth is obsolete. |
| 13 | ScopeInputForm and OnboardingWaitingCard are removed from ProjectDetail flow | VERIFIED | No matches for ScopeInputForm or OnboardingWaitingCard in ProjectDetail.tsx |

**Score:** 9/11 truths verified (11 distinct; truth #12 is a superseded plan requirement per user-approved deviation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/src/models/onboarding.rs` | generate_context_file_content function | VERIFIED | pub fn generate_context_file_content at line 114, full implementation with populated/empty branches |
| `src-tauri/src/commands/onboarding_commands.rs` | generate_context_file Tauri command | VERIFIED | pub async fn generate_context_file at line 182, full DB query + file write |
| `src/lib/tauri.ts` | generateContextFile API binding | VERIFIED | generateContextFile at line 200 |
| `src/stores/useWorkspaceStore.ts` | Per-project state map, accessors, and terminal session key | VERIFIED | projectStates map, getProjectState, terminalSessionKey, launchTerminalCommand all present |
| `src/components/layout/CenterPanel.tsx` | Per-project tab restore on project switch | VERIFIED | getProjectState used at line 40, save/restore on project switch |
| `src/components/layout/OutputDrawer.tsx` | Per-project drawer restore on project switch | PARTIAL | getProjectState NOT used; handleTabChange with setProjectDrawerState defined but never called |
| `src/hooks/useTerminal.ts` | Terminal hook with optional initialCommand support | VERIFIED | initialCommand param at line 12, fallback to /bin/zsh when null |
| `src/stores/useWorkspaceStore.test.ts` | Behavioral tests for per-project state restore | VERIFIED | 5 tests, all pass |
| `src/components/center/OpenAiButton.tsx` | Open AI button component | VERIFIED | export function OpenAiButton with full flow |
| `src/components/center/OpenAiButton.test.tsx` | Behavioral tests for guard conditions | VERIFIED | 3 tests pass (no directory, happy path, error handling) |
| `src/components/center/ProjectDetail.tsx` | Integrated Open AI button, removed old onboarding | VERIFIED | OpenAiButton at lines 276, 346; ScopeInputForm/OnboardingWaitingCard absent |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src-tauri/src/commands/onboarding_commands.rs` | `src-tauri/src/models/onboarding.rs` | generate_context_file_content call | VERIFIED | Line 279: `crate::models::onboarding::generate_context_file_content(&context_data)` |
| `src/lib/tauri.ts` | `src-tauri/src/commands/onboarding_commands.rs` | Tauri invoke | VERIFIED | Line 200: `invoke<string>("generate_context_file", { projectId })` |
| `src/components/layout/CenterPanel.tsx` | `src/stores/useWorkspaceStore.ts` | getProjectState/setProjectState calls | VERIFIED | Lines 22-49: getProjectState, saveCurrentProjectState, restoreProjectState all called |
| `src/components/layout/OutputDrawer.tsx` | `src/stores/useWorkspaceStore.ts` | getProjectState/setProjectState calls | NOT_WIRED | handleTabChange containing setProjectDrawerState is defined but never called in render |
| `src/components/output/TerminalTab.tsx` | `src/stores/useWorkspaceStore.ts` | terminalSessionKey in key prop | VERIFIED | Line 107: `key={terminal-${selectedProjectId}-${directoryPath}-${terminalSessionKey}}` |
| `src/components/center/OpenAiButton.tsx` | `src/lib/tauri.ts` | api.generateContextFile call | VERIFIED | Line 26: `await api.generateContextFile(projectId)` |
| `src/components/center/OpenAiButton.tsx` | `src/stores/useWorkspaceStore.ts` | launchTerminalCommand call | VERIFIED | Line 15,32: launchTerminalCommand("claude", [...]) |
| `src/components/center/ProjectDetail.tsx` | `src/components/center/OpenAiButton.tsx` | import and render | VERIFIED | Line 24 import, lines 276, 346 render |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `OpenAiButton.tsx` | contextPath | api.generateContextFile → generate_context_file command → DB query | Yes — live DB query of project/phases/tasks | FLOWING |
| `OutputDrawer.tsx` | terminalInitialCommand | useWorkspaceStore (set by launchTerminalCommand) | Yes — set from OpenAiButton click | FLOWING |
| `TerminalTab.tsx` | initialCommand prop | terminalInitialCommand from store | Yes — see above | FLOWING |
| `CenterPanel.tsx` | projectState.centerTab | useWorkspaceStore.projectStates | Yes — written by setProjectCenterTab | FLOWING |
| `OutputDrawer.tsx` drawer tab state | activeDrawerTab | projectStates[projectId].drawerTab | Partial — restored on project switch but not saved on tab click (dead handleTabChange) | HOLLOW_PROP |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Rust unit tests for context file generation | `cargo test context_file -- --nocapture` | 3 tests pass (populated, empty, no-unassigned) | PASS |
| Workspace store Vitest tests | `npx vitest run src/stores/useWorkspaceStore.test.ts` | 5 tests pass | PASS |
| OpenAiButton Vitest tests | `npx vitest run src/components/center/OpenAiButton.test.tsx` | 3 tests pass | PASS |
| TypeScript compilation | `npx tsc --noEmit` | 4 errors: 1 phase-11-introduced (TS6133 handleTabChange), 3 pre-existing (ThemeSidebar, UncategorizedSection) | FAIL (1 new) |
| generate_context_file registered in Tauri | `grep generate_context_file src-tauri/src/lib.rs` | Line 251 confirms registration | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AIAS-02 | 11-01, 11-02, 11-03 | User can click "Open AI" button and project context (phases, tasks, progress, what's next) is seeded into the embedded terminal | SATISFIED | OpenAiButton generates context file, launchTerminalCommand spawns claude with context path in visible PTY |
| AIAS-03 | 11-02, 11-03 | Manual terminal usage (without clicking AI button) remains context-free; per-project workspace state restores on project switch | PARTIAL | Manual terminal uses null initialCommand (context-free verified). Per-project CENTER TAB restore verified. Per-project DRAWER TAB restore broken (handleTabChange dead code). |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/layout/OutputDrawer.tsx` | 43 | `handleTabChange` defined but never called; `setProjectDrawerState` call is dead code | Blocker | Per-project drawer tab state is never saved, so restoring drawer tab on project switch always returns the global store default, not the last tab the user chose for that project |
| `src/components/layout/OutputDrawer.tsx` | 43 | TypeScript TS6133 error: 'handleTabChange' is declared but its value is never read | Warning | Introduced by phase 11; pre-existing TS errors in ThemeSidebar/UncategorizedSection are from phases 6-7 |

### Human Verification Required

#### 1. End-to-End Open AI Button Flow

**Test:** In the running app, select a project with a linked directory and some phases/tasks. Click "Open AI" button.
**Expected:** Drawer opens to Terminal tab, claude CLI spawns in the visible terminal with `--dangerously-skip-permissions` and the context file path. Old PTY session is killed. Check `.element/context.md` exists in the project directory with project content.
**Why human:** PTY lifecycle (kill/respawn) and claude CLI invocation cannot be verified statically; requires a live app instance.

#### 2. Empty Project Onboarding Path

**Test:** Select a project with no phases and no tasks. Click "Open AI".
**Expected:** Context file is generated with onboarding instructions (not a phases dump), and claude launches with that file.
**Why human:** Requires verifying actual file content written to disk and terminal behavior.

#### 3. Per-Project Center Tab Restore

**Test:** Open Project A, switch to Files tab. Switch to Project B (should show Detail tab). Switch back to Project A.
**Expected:** Project A restores to Files tab.
**Why human:** Requires live app interaction with multiple projects.

#### 4. Drawer Tab Restore (Known Gap — Verify Exact Behavior)

**Test:** Open Project A, click Terminal drawer tab. Switch to Project B, then back to Project A.
**Expected (current behavior):** Drawer tab does NOT restore to Terminal — it returns to whatever the global default is (Logs). The per-project save is broken.
**Expected (intended behavior):** Should restore to Terminal.
**Why human:** Confirms the gap identified in automated verification — helps prioritize the fix.

### Gaps Summary

**Gap 1 — Drawer tab state saving is dead code (Blocker)**

`OutputDrawer.tsx` defines a `handleTabChange` function that calls `setProjectDrawerState` to save per-project drawer tab state. However, this function is never wired to any UI event handler. The actual tab bar lives in `AppLayout.tsx` and uses a separate `handleTabClick` function that calls `setActiveDrawerTab` directly. The per-project drawer tab state is therefore never written on tab change, and restoration on project switch returns the store default ("logs") regardless of what tab the user had open.

Fix: In `AppLayout.tsx:handleTabClick`, add a call to `setProjectDrawerState` after `setActiveDrawerTab`. Or move the tab bar into `OutputDrawer.tsx` and connect it to `handleTabChange`.

**Gap 2 — "No AI tool configured" plan must_have is stale (Documentation Gap)**

Plan 03 must_haves still contains the truth "If no CLI tool is configured, a toast says 'No AI tool configured' with navigation to Settings". This guard was intentionally removed (user-approved deviation, documented in SUMMARY), and the CLI was hardcoded to `claude --dangerously-skip-permissions`. The plan must_have is now a documentation artifact that doesn't match the implementation. This is not a code correctness gap but a plan accuracy gap — no action required if future phases will add configurable CLI tool settings.

---

_Verified: 2026-03-25T03:51:45Z_
_Verifier: Claude (gsd-verifier)_
