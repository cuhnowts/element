# Pitfalls Research

**Domain:** Adding project management, embedded terminal, file explorer, and AI-driven features to existing Tauri 2.x + React 19 desktop app
**Researched:** 2026-03-22
**Confidence:** MEDIUM-HIGH (verified against existing codebase, Tauri docs, community reports)

## Critical Pitfalls

### Pitfall 1: Embedded Terminal PTY Lifecycle Mismanagement

**What goes wrong:**
PTY (pseudo-terminal) processes leak when terminal tabs are closed, windows are hidden, or the app is quit without explicit cleanup. On macOS this leaves orphaned shell processes consuming resources. On Windows, ConPTY handles are not released, eventually exhausting system resources. Users see ghost processes in Activity Monitor, and after extended use the app becomes sluggish or the system runs out of file descriptors.

**Why it happens:**
`portable-pty` spawns real OS processes. Unlike DOM elements, these do not get garbage-collected when a React component unmounts. Developers wire up xterm.js to the PTY read stream but forget the teardown path: killing the child process, closing the master PTY fd, and removing the Tauri event listener -- all three must happen in sequence. The Tauri IPC boundary makes this worse because the Rust side owns the PTY but the React side controls component lifecycle.

**How to avoid:**
- Store all active PTY handles in a `HashMap<String, TerminalSession>` behind `Arc<Mutex<>>` on the Rust side, keyed by a session UUID.
- Expose explicit `terminal_spawn` and `terminal_kill` Tauri commands. Never let the frontend implicitly control PTY lifetime.
- Implement `Drop` on a `TerminalSession` struct that kills the child process, not just closes the fd.
- On app shutdown (`tauri::RunEvent::ExitRequested`), iterate all sessions and kill them.
- In React, call `terminal_kill` in `useEffect` cleanup -- but treat it as a hint, not the sole cleanup mechanism. The Rust side must also handle orphan detection.
- PTY reads are blocking; use `tokio::task::spawn_blocking` for the read loop, not the tokio runtime directly (this would starve async tasks).

**Warning signs:**
- `ps aux | grep bash` shows growing process count during development
- Terminal output stops but the component still renders
- App quit takes >2 seconds (hanging on process cleanup)
- `tokio` tasks backing up or timing out after terminal use

**Phase to address:**
Project workspace phase (embedded terminal implementation)

---

### Pitfall 2: File Explorer IPC Serialization Bottleneck

**What goes wrong:**
Reading a project directory with 10,000+ files (common in `node_modules`, `.git`, build artifacts) causes the UI to freeze for 5-15 seconds. Memory spikes to 500MB+. The app feels broken despite Rust reading the filesystem in milliseconds.

**Why it happens:**
The bottleneck is not filesystem I/O -- it is Tauri's IPC serialization. Every file entry (name, size, type, modified date) gets serialized to JSON in Rust, sent over the IPC bridge, deserialized in JavaScript, then rendered as React components. Sending 10K entries in a single IPC call creates a massive JSON payload. Sending them one-by-one creates 10K IPC round trips. Both approaches fail. Additionally, React re-renders the entire tree for each expansion, compounding the problem. This has been documented in Tauri issues (e.g., tauri-apps/tauri#1817).

**How to avoid:**
- Implement lazy loading: only read one directory level at a time. When user expands a folder, fetch that folder's immediate children only.
- Add server-side filtering in Rust: exclude `.git`, `node_modules`, `target`, `build` directories by default (configurable `.elementignore`).
- Use pagination for flat directories: cap at 200 entries per IPC call, load more on scroll.
- Virtualize the tree in React with `@tanstack/react-virtual` -- do not render 10K DOM nodes.
- Return minimal data per entry: `{name, is_dir, size}` -- fetch full metadata on demand (hover/select).

**Warning signs:**
- File tree works on small demo projects but freezes on real codebases
- Memory profiler shows large JSON strings in IPC layer
- Expanding a folder takes >500ms

**Phase to address:**
Project workspace phase (file explorer implementation)

---

### Pitfall 3: Theme/Category Hierarchy Schema Rigidity

**What goes wrong:**
The initial schema locks in a fixed hierarchy (Theme > Project > Task) using foreign keys and cascading deletes. Later, users want: tasks that exist without a project, projects without themes, reordering themes, or moving a project between themes. Every schema change requires a migration, and existing data must be carefully migrated. The rigid structure becomes a maintenance burden that blocks feature development.

**Why it happens:**
Developers model the hierarchy as it appears in the UI -- a tree -- using strict NOT NULL parent_id foreign keys. This works for initial demos but does not accommodate evolution. The current schema already has this problem: `tasks.project_id NOT NULL REFERENCES projects(id)` means every task MUST belong to a project. But v1.1 requires standalone tasks within themes (no project). Changing this column to nullable requires migrating every existing task row.

**How to avoid:**
- Make `project_id` nullable in migration 007 NOW, before building theme features on top. Retrofit is harder than upfront design.
- Add a `themes` table with `id, name, color, icon, sort_order`.
- Add `theme_id TEXT REFERENCES themes(id)` (nullable) to both `projects` and `tasks` tables.
- Support four valid states: task-in-project-in-theme, task-in-project-no-theme, standalone-task-in-theme, standalone-task-no-theme.
- Add `sort_order INTEGER` columns on themes, projects, and tasks for user-defined ordering.
- Do NOT use nested sets or materialized paths -- adjacency list with nullable parents is the right model for this depth (max 3 levels: theme > project > task). SQLite recursive CTEs handle queries efficiently at this scale.

**Warning signs:**
- Schema migration count grows faster than feature count
- Frontend has special-case logic for "standalone tasks" vs "project tasks"
- Moving a task between projects requires delete + re-insert instead of update

**Phase to address:**
Theme system / data model phase (MUST be the first phase of v1.1 -- everything else builds on this schema)

---

### Pitfall 4: AI Onboarding Conversation State Explosion

**What goes wrong:**
AI-driven project onboarding starts a multi-turn conversation (user provides scope, AI asks clarifying questions, generates phases/tasks). The conversation state grows unbounded. If the user closes the app mid-conversation, progress is lost. If they go back and edit an early answer, the AI's subsequent questions and generated phases become inconsistent. The feature works in demos but frustrates real users.

**Why it happens:**
LLM conversations are stateless per-call -- the app must reconstruct context from stored messages. Developers store messages as a flat array and replay them, but this does not handle: branching (user edits answer #2 but keeps answer #5), partial completion (app crash at step 3 of 6), or context window limits (onboarding for a large project generates 8K+ tokens of context). The existing AI module (`src-tauri/src/ai/`) handles single-shot completions and streaming but has no conversation persistence layer.

**How to avoid:**
- Design onboarding as a finite state machine, not a free-form conversation. States: `scope_entry -> ai_questions -> user_answers -> phase_generation -> review -> confirm`.
- Persist state machine position and accumulated data to SQLite after each step. Recovery = reload state machine position + data, not replay messages.
- Use structured prompts, not chat history replay. Each AI call gets a fresh prompt constructed from the current state machine data, not a growing message array.
- Set a maximum of 3-5 AI question rounds. More rounds does not improve output quality but does increase failure modes.
- Generate phases/tasks as a draft that users edit in the existing task UI, not a final output. This reduces the pressure on AI accuracy.

**Warning signs:**
- Onboarding works for simple projects but fails or produces inconsistent results for complex ones
- Users report "AI forgot what I said earlier"
- Token costs per onboarding session are unpredictable (varies 5x between users)
- No way to resume an interrupted onboarding

**Phase to address:**
AI-driven project onboarding phase

---

### Pitfall 5: Per-Project AI Mode Adds Multiplicative Complexity

**What goes wrong:**
Three AI modes (Track+Suggest, Track+Auto-execute, On-demand) seem like a simple enum, but they create a 3x multiplier on every AI-adjacent feature. Task creation, status updates, scheduling, progress tracking -- each must handle all three modes. The codebase fills with `if (mode === 'auto') { ... } else if (mode === 'suggest') { ... }` branches. Testing becomes combinatorial. Bugs appear in one mode but not others.

**Why it happens:**
The modes are designed from the user's perspective (how involved should AI be?) but implemented as feature flags that affect cross-cutting behavior. "Auto-execute" means the AI can create tasks, modify schedules, and trigger workflows without user confirmation -- this touches permissions, undo/redo, audit trails, and error handling. "Suggest" means the same AI logic runs but presents results in a different UI. The branching compounds with each new feature.

**How to avoid:**
- Implement a single AI pipeline that always produces "suggestions." The mode only controls the final step: auto-apply vs. present-for-approval vs. do-nothing.
- Use a `SuggestionQueue` pattern: AI writes suggestions to a queue table in SQLite. In auto mode, a consumer auto-applies them. In suggest mode, a UI component renders them for approval. In on-demand mode, the queue is only populated when the user explicitly triggers it.
- Never branch on mode inside feature logic. The mode is a delivery mechanism, not a behavior modifier.
- Start with On-demand only. Add Suggest second. Add Auto-execute last and only after an undo system exists.

**Warning signs:**
- Switch statements on AI mode appearing in multiple files
- "Works in suggest mode but not auto mode" bug reports
- AI mode logic leaking into task CRUD operations

**Phase to address:**
Per-project AI mode phase (MUST come AFTER basic AI onboarding works, not simultaneously)

---

### Pitfall 6: Tauri Permission Scope Drift with File/Shell Access

**What goes wrong:**
Adding a file explorer and embedded terminal requires broad filesystem and shell access permissions. Developers start with restrictive scopes, hit permission errors during development, and progressively widen scopes until `capabilities/default.json` grants near-unrestricted access. The app ships with permissions that allow any frontend JavaScript to read arbitrary files or execute shell commands. This is particularly dangerous given the existing plugin system -- a malicious plugin's frontend code could access the terminal or filesystem.

**Why it happens:**
Tauri 2.x has a fine-grained permission model, but the developer experience during rapid iteration pushes toward "just allow everything." The current `default.json` is appropriately minimal (only core, events, global-shortcut). Adding file system and shell permissions requires understanding scope syntax, path patterns, and deny-overrides-allow semantics. The existing Tauri shell plugin has had a scope validation vulnerability (GHSA-c9pr-q8gx-3mgp), showing this is a real attack surface.

**How to avoid:**
- Create separate capability files: `workspace.json` for file explorer permissions (scoped to project directories only), `terminal.json` for shell permissions.
- Use Tauri's runtime scope API to dynamically grant per-project directory access when a project is opened, rather than static allow-all patterns.
- Never grant `fs:allow-read` or `shell:allow-execute` without path scope restrictions.
- The file explorer should ONLY access the directory linked to the current project. Path traversal outside that directory should be architecturally impossible (Rust-side validation), not just permission-blocked.
- Audit `default.json` before each release. Any new permission needs a comment explaining why.

**Warning signs:**
- `capabilities/default.json` grows to 50+ permissions without organization
- Permission errors during development are "fixed" by adding broader allows
- File explorer can navigate to `~/.ssh` or `/etc/passwd`

**Phase to address:**
Project workspace phase (file explorer + terminal). Must be addressed at implementation time, not retrofitted.

---

### Pitfall 7: Context Switching That Destroys In-Flight Work

**What goes wrong:**
User is working on Project A with terminal running a build, file explorer open to `src/`, and AI suggestions pending. They switch to Project B. When they switch back to Project A: terminal session is gone (build was killed), file explorer resets to root, AI suggestions were discarded. The "context switching support" feature becomes the opposite of helpful -- it destroys context instead of preserving it.

**Why it happens:**
React unmounts components when switching views. Without explicit state preservation, all component-local state (terminal connections, scroll positions, expanded tree nodes) is lost. Zustand state persists across navigations, but the current store design (`src/stores/index.ts`) has no concept of per-project state -- it stores a single active project's data. Switching projects overwrites the store with new data, and there is nowhere for the old state to go.

**How to avoid:**
- Design per-project session state from the start: `Map<projectId, ProjectSession>` where `ProjectSession` includes terminal session IDs, expanded tree paths, scroll positions, pending AI suggestions.
- Terminal sessions should be backgrounded (PTY keeps running), not killed, when switching projects. Display a "processes running" indicator on backgrounded projects.
- Persist session state to SQLite on project switch, restore on project open. This survives app restarts too.
- Use React `key` props or conditional rendering that hides (not unmounts) workspace components for recently-visited projects (keep last 2-3 in memory).

**Warning signs:**
- Switching projects takes >1 second (full teardown + rebuild)
- Users avoid switching projects because they lose work
- Terminal processes die unexpectedly when navigating

**Phase to address:**
Context switching phase (should be designed during workspace phase architecture, implemented after workspace basics work)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single monolithic Zustand store | Simpler setup, shared state access | Render cascades as store grows; every slice update triggers selectors across all 8+ slices | Already at 8 slices -- add per-project stores for workspace state rather than more slices |
| Storing terminal output in React state | Quick xterm.js integration | Memory leak as terminal scrollback grows unbounded in JS heap | Never -- xterm.js manages its own buffer; pipe PTY output directly to xterm, not through React |
| Using `fs.readDir` recursively for file tree | Shows full tree immediately | Freezes on real projects, OOM on `node_modules` | Never -- always lazy-load one level |
| Nullable columns instead of join tables for theme/project/task relationships | Simpler queries, fewer migrations | Query complexity grows, NULL semantics cause bugs | Acceptable for v1.1 if limited to `theme_id` and `project_id` on tasks; revisit if adding sub-themes |
| Hardcoded `.gitignore` patterns for file filtering | Quick win for filtering | Users cannot customize; misses project-specific patterns | MVP only -- add `.elementignore` support before release |
| Reusing v1.0 AI streaming for onboarding conversations | No new infrastructure needed | No persistence, no state machine, no recovery from interruption | Never -- onboarding needs its own conversation model |
| Single project context in Zustand | Simpler state shape | Destroys context on project switch; no background session support | MVP only -- must add `Map<projectId, session>` before context switching feature |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| xterm.js + Tauri IPC | Sending terminal data as Tauri events (string serialization overhead on every keystroke) | Use Tauri's streaming `Channel` API for binary data; batch terminal output with 16ms debounce |
| portable-pty + tokio | Calling blocking PTY read on the tokio runtime, starving async tasks | Use `tokio::task::spawn_blocking` for PTY read loop; pipe results back via `tokio::sync::mpsc` channel |
| File watcher (notify crate) + file tree UI | Watching entire project directory recursively, generating thousands of events on build | Watch only expanded directories; debounce events (already have `notify-debouncer-mini` in deps); batch UI updates |
| AI streaming + React rendering | Re-rendering component on every SSE token (60+ renders/second during streaming) | Buffer tokens, flush to state every 100ms; use `requestAnimationFrame` for rendering updates |
| SQLite migrations + new entity types | Adding themes/projects/tasks tables without considering existing data migration path | Write UP migration with explicit data transformation; handle the existing `tasks.project_id NOT NULL` constraint as first migration |
| Zustand slices + Tauri command responses | Each slice independently calls Tauri commands, creating race conditions on overlapping data | Centralize Tauri IPC in a service layer; slices dispatch actions, services handle IPC sequencing |
| xterm.js + terminal resize | Not sending SIGWINCH to PTY when xterm.js container resizes | Use xterm.js `fit` addon; forward resize events from React to PTY via `terminal_resize` Tauri command |
| File explorer + project directory symlinks | Following symlinks creates infinite loops or accesses outside project scope | Detect symlinks in Rust (`fs::symlink_metadata`); show as symlinks in UI; do not follow symlinks outside project root |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unvirtualized file tree | UI jank when scrolling directories with 500+ files | Use virtualized tree component (`@tanstack/react-virtual`) | >200 visible nodes |
| Unbounded terminal scrollback | Memory grows 1MB+ per hour of active terminal use | Set xterm.js `scrollback` to 5000 lines (configurable) | >10K lines in buffer |
| Full conversation replay for AI context | Each AI call includes all prior messages; latency grows linearly | Structured state machine; fresh prompts from accumulated data | >5 conversation turns |
| Watching all project files for changes | CPU spike when project has 50K+ files (node_modules) | Watch only user-visible directories; respect ignore patterns | >5K watched paths |
| Rendering all themes/projects in sidebar | Sidebar re-renders on any store update | Memoize with `React.memo` + specific Zustand selectors (shallow compare) | >20 themes with projects |
| Synchronous SQLite queries for hierarchy data | UI blocks while fetching theme > project > task tree | Single recursive CTE query; load lazily as user expands nodes | >500 total entities |
| Multiple active terminal sessions | Each PTY + read loop consumes a thread and memory | Limit concurrent terminals (3-5); background inactive ones with paused read loops | >5 simultaneous terminals |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Terminal shell access without project scoping | Frontend JS (or malicious plugin) can execute arbitrary commands system-wide | Scope terminal to project directory; spawn shell with `cwd` set to project root; consider restricting PATH |
| File explorer path traversal | User navigates to sensitive directories (`~/.ssh`, credential files) | Validate all paths server-side in Rust; reject paths outside project root; use Tauri scope API for dynamic per-project access |
| AI prompt injection via project metadata | User-controlled project names/descriptions injected into AI prompts could manipulate AI behavior or extract system prompts | Sanitize user input in prompt templates; separate user data from system instructions using structured prompt format |
| Storing AI conversation history with credentials | AI conversations might contain API keys or passwords the user pasted during onboarding | Scrub patterns matching API key formats before persistence; warn user about sensitive input in AI chat |
| Over-permissioned Tauri capabilities | Broad fs/shell permissions create attack surface if frontend has XSS via plugin | Separate capabilities per feature; scope to project directories; review `default.json` before every release |
| PTY output containing escape sequences | Malicious terminal output could inject control characters | xterm.js handles this by default; do NOT render raw PTY output outside of xterm.js (e.g., in logs or notifications) |
| File watcher exposing file change events to frontend | Plugins could monitor filesystem changes in real-time | Scope file watcher events to the active project; do not broadcast raw filesystem events to the plugin API |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| AI onboarding asks too many questions | Users abandon onboarding after question 3; feels like a survey not a tool | Cap at 3 AI questions; let user skip to generation; refine generated plan manually after |
| Terminal opens in wrong directory | User must manually `cd` to project root every time | Always spawn terminal with `cwd` set to project's linked directory; show project name in terminal title |
| File explorer shows ALL files including hidden/build | Overwhelming noise; user cannot find source files | Default to smart filtering (hide dotfiles, `.git`, `node_modules`, build artifacts); toggle to show all |
| Theme/category setup required before creating tasks | Forced organization before user has anything to organize | Allow creating tasks without themes; suggest themes after 10+ tasks exist |
| Context switch loses terminal state | User switches projects, terminal session is destroyed, loses in-progress commands | Background terminal sessions per project; show "running" indicator; restore on project re-open |
| File explorer and terminal fight for space in workspace panel | Workspace panel is too cramped when both are visible | Collapsible panels with remembered sizes; allow terminal-only or explorer-only views; resizable split |
| AI generates too many phases/tasks during onboarding | User feels overwhelmed by AI output; doesn't know where to start | Generate 3-5 phases max initially; let user request more detail per phase; show as editable draft, not final plan |
| Project directory selection is confusing | User doesn't understand why a project needs a directory; picks wrong folder | Explain purpose clearly ("where your code lives"); show directory preview before confirming; allow changing later |

## "Looks Done But Isn't" Checklist

- [ ] **Embedded terminal:** Often missing PTY cleanup on unmount -- verify no orphaned processes after closing 10 terminal tabs in sequence
- [ ] **Embedded terminal:** Often missing resize handling -- verify terminal re-flows text when panel is resized (xterm.js `fit` addon + PTY SIGWINCH)
- [ ] **Embedded terminal:** Often missing Windows ConPTY support -- verify terminal works on Windows, not just macOS PTY
- [ ] **File explorer:** Often missing symlink handling -- verify symlinks don't cause infinite loops or crash the tree walker
- [ ] **File explorer:** Often missing permission errors -- verify graceful handling when a directory is unreadable (no crash, shows lock icon)
- [ ] **File explorer:** Often missing real-time updates -- verify new/deleted files appear without manual refresh (file watcher integration)
- [ ] **AI onboarding:** Often missing error recovery -- verify app recovers gracefully when AI API returns error mid-conversation
- [ ] **AI onboarding:** Often missing rate limiting -- verify rapid "regenerate" clicks don't spawn parallel AI calls
- [ ] **Theme system:** Often missing empty state -- verify themes with no projects and projects with no tasks render usable UI
- [ ] **Theme system:** Often missing reordering persistence -- verify drag-reorder of themes/projects persists across app restart
- [ ] **Context switching:** Often missing unsaved state -- verify switching projects warns if terminal has running process
- [ ] **Per-project AI mode:** Often missing migration path -- verify changing AI mode on existing project doesn't break in-flight suggestions
- [ ] **Schema migration:** Often missing backwards compatibility -- verify v1.0 databases upgrade cleanly to v1.1 schema without data loss

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| PTY process leaks | LOW | Add process cleanup sweep on app startup; kill processes whose parent PID matches Element |
| Rigid schema hierarchy | MEDIUM | Write migration to make `project_id` nullable; add `theme_id` column; update all queries and tests |
| Over-broad permissions | LOW | Audit `default.json`; split into scoped capability files; test each feature with minimal permissions |
| Zustand store bloat / render cascades | MEDIUM | Already using slices; add shallow selectors; consider per-project `useWorkspaceStore` separate from main store |
| AI conversation state loss | LOW | Add auto-save after each step; state machine makes recovery trivial (resume from last completed state) |
| File explorer OOM on large directory | MEDIUM | Requires refactoring tree to lazy-load; add virtual scrolling; harder to retrofit than build correctly |
| Context switch destroys terminal sessions | HIGH | Requires architectural change to background PTY sessions; store session map keyed by project; expensive if not planned upfront |
| Permission scope drift | LOW | Audit and tighten capability files; add CI lint that checks for over-broad permissions |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Schema rigidity (theme/project/task hierarchy) | Data model phase (FIRST phase of v1.1) | Schema supports: standalone tasks, tasks in projects, projects in themes, projects without themes; existing v1.0 data migrates cleanly |
| PTY lifecycle mismanagement | Workspace: Terminal | Automated test: spawn 10 sessions, close all, verify process count returns to baseline |
| File explorer IPC bottleneck | Workspace: File Explorer | Manual test: open file tree on project with 10K+ files (e.g., a node project), verify <500ms folder expansion |
| AI conversation state explosion | AI Onboarding | Test: close app mid-onboarding, reopen, verify resumption from last completed step |
| Per-project AI mode complexity | AI Mode (after onboarding works) | Code review: zero switch/if-else on AI mode outside the SuggestionQueue consumer |
| Permission scope drift | Workspace (terminal + explorer) | CI check: capability files have no `allow-*` without explicit path scope |
| Context switching destroys work | Context switching (design during workspace, implement after) | Test: start build in Project A terminal, switch to B, switch back to A; build output is preserved |
| Zustand store bloat | Data model phase (before adding new slices) | Performance test: 50 projects, 500 tasks; sidebar interaction remains <16ms frame time |
| Terminal output in React state | Workspace: Terminal | Code review: no terminal output stored in Zustand or React state; xterm.js manages own buffer |

## Sources

- [Tauri File System Plugin Docs](https://v2.tauri.app/plugin/file-system/) - Permission scoping, path traversal prevention
- [Tauri Permissions](https://v2.tauri.app/security/permissions/) - Capability and scope architecture
- [Tauri Command Scopes](https://v2.tauri.app/security/scope/) - Runtime scope management
- [tauri-plugin-pty on crates.io](https://crates.io/crates/tauri-plugin-pty) - PTY integration pattern for Tauri
- [portable-pty docs](https://docs.rs/portable-pty) - Cross-platform PTY handling
- [tauri-terminal example project](https://github.com/marc2332/tauri-terminal) - Reference implementation of xterm.js + portable-pty + Tauri
- [xterm.js Security Guide](https://xtermjs.org/docs/guides/security/) - Terminal security in webview contexts
- [Shell plugin security advisory GHSA-c9pr-q8gx-3mgp](https://github.com/tauri-apps/plugins-workspace/security/advisories/GHSA-c9pr-q8gx-3mgp) - Scope validation vulnerability in Tauri shell plugin
- [conaticus/FileExplorer](https://github.com/conaticus/FileExplorer) - Tauri-based file explorer performance patterns
- [Tauri file reading performance issue #1817](https://github.com/tauri-apps/tauri/issues/1817) - IPC serialization bottleneck documentation
- [Tauri memory leak issue #9190](https://github.com/tauri-apps/tauri/issues/9190) - Memory issues when reading files
- [SQLite hierarchical data strategies](https://moldstud.com/articles/p-strategies-for-managing-hierarchical-data-structures-in-sqlite) - Adjacency list, nested sets, closure table tradeoffs
- [Hierarchical data in SQL](https://lars.yencken.org/hierarchy-in-sql/) - Three approaches compared
- [Resilient LLM Streams](https://upstash.com/blog/resumable-llm-streams) - Surviving reconnects and crashes in streaming AI
- [AI Context Management patterns](https://medium.com/@ravikhurana_38440/the-art-of-llm-context-management-optimizing-ai-agents-for-app-development-e5ef9fcf8f75) - Conversation state optimization
- [Tauri performance under pressure](https://medium.com/@srish5945/tauri-rust-speed-but-heres-where-it-breaks-under-pressure-fef3e8e2dcb3) - Known bottlenecks
- Existing codebase analysis: `src-tauri/Cargo.toml`, `src/stores/index.ts`, `src-tauri/capabilities/default.json`, `src-tauri/src/db/sql/001_initial.sql`

---
*Pitfalls research for: Element v1.1 Project Manager milestone*
*Researched: 2026-03-22*
