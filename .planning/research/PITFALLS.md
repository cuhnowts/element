# Pitfalls Research

**Domain:** Adding tiered AI planning, bidirectional .planning/ folder sync, and context-adaptive AI execution guidance to existing Tauri 2.x + React 19 + SQLite desktop app
**Researched:** 2026-03-25
**Confidence:** MEDIUM-HIGH (verified against existing codebase patterns, file watcher implementation, sync engineering literature)

## Critical Pitfalls

### Pitfall 1: Bidirectional Sync Infinite Loop

**What goes wrong:**
The app writes to a .planning/ markdown file (e.g., updating ROADMAP.md after a task status change in the UI). The file watcher detects the change. The watcher triggers a database update. The database update triggers a re-write of the markdown file. The watcher fires again. This creates an infinite event loop that locks the mutex, spins the CPU, and can corrupt data if writes overlap.

**Why it happens:**
The existing `PlanWatcherState` in `onboarding_commands.rs` uses `notify_debouncer_mini` with a 500ms debounce -- but debouncing only collapses rapid-fire events, it does not distinguish between "external edit" and "our own write." Every bidirectional sync system that uses two one-way pipes hits this. The naive assumption is "I'll just ignore events right after I write" but timing is unreliable across file systems (especially on macOS where FSEvents can batch and delay).

**How to avoid:**
- Implement a write guard: before writing a file, register its path + a nonce (hash of content about to be written) in a shared `HashSet<PathBuf>` behind `Arc<Mutex<>>`. When the watcher fires, check if the changed file is in the guard set AND the content hash matches. If so, remove from guard and skip processing. If content differs (external edit happened between our write and the event), process it.
- Never use timestamp-based suppression (e.g., "ignore events within 1s of our write"). File system event delivery timing varies wildly between macOS FSEvents, Linux inotify, and Windows ReadDirectoryChangesW.
- Use a single-direction-at-a-time lock: when the app is writing to disk, queue incoming file events. When processing file events, queue outgoing writes. Process the queue after the current direction completes.

**Warning signs:**
- CPU spikes when changing a task status in the UI
- SQLite "database is locked" errors in logs
- File content oscillating between two states when viewed in an external editor
- Watcher events logged in rapid succession with identical paths

**Phase to address:**
Phase 1 (sync architecture). This MUST be solved in the foundational sync layer before any feature code touches it.

---

### Pitfall 2: Context File Exceeds AI Token Budget

**What goes wrong:**
The context.md file grows unboundedly as projects accumulate phases and tasks. A project with 8 phases and 40 tasks already produces ~3-4KB of markdown. Add task descriptions, "What Needs Attention" sections, and the output contract, and it easily hits 8-10KB (roughly 2,500+ tokens). When the planning tier adds GSD-style research summaries, architecture notes, and roadmap data from .planning/, the context file balloons to 20-50KB (6,000-15,000 tokens). Claude Code's effective working context gets crowded, reducing response quality and increasing cost.

**Why it happens:**
The current `generate_context_file_content` in `onboarding.rs` concatenates everything: all phases, all tasks with statuses, descriptions, attention items, AND the output contract. This was fine for v1.1's single-purpose "plan this project" flow, but v1.2 adds multiple modes (planning vs execution) and multiple tiers (quick/medium/GSD). Each mode needs different context, but the temptation is to "just add more sections" to the same file. The output contract section alone is ~250 tokens of boilerplate repeated every time.

**How to avoid:**
- Cap the context file at a token budget (target: 2,000 tokens for quick tier, 4,000 for medium, 8,000 for GSD). Calculate approximate tokens as `content.len() / 4`.
- Make context generation mode-aware: planning mode includes project description + current state summary + output contract. Execution mode includes only current phase detail + next 3 incomplete tasks + blockers. Never dump the full task list.
- For completed phases, collapse to a single summary line ("Phase 1: Setup [3/3 complete]") instead of listing every completed task.
- Move the output contract to a separate file (.element/contracts/plan-output.md) and reference it with "See .element/contracts/plan-output.md for the output format" -- Claude Code can read it on demand.
- Add a hard ceiling check: if generated content exceeds the budget, truncate older/completed phase details first, then task descriptions, then task titles for completed items.

**Warning signs:**
- Context file exceeds 5KB for a medium-complexity project
- AI responses start ignoring instructions at the bottom of the context file (the "lost in the middle" effect)
- AI asks questions that are answered in the context file (it didn't process the whole thing)
- Token costs spike for routine "what's next?" queries

**Phase to address:**
Phase 1 (context file generation). Token budget enforcement should be a core constraint from day one, not bolted on after bloat appears.

---

### Pitfall 3: ROADMAP.md Parse Fragility

**What goes wrong:**
The sync system parses ROADMAP.md (or other .planning/ markdown files) expecting a specific structure. GSD updates the file with slightly different formatting -- an extra blank line, a different heading level, a task with special characters in the title, or a markdown table instead of a list. The parser breaks silently, either skipping phases/tasks or creating duplicates. The database diverges from the file. User edits the file manually and the parser fails entirely.

**Why it happens:**
Markdown is not a structured data format. There is no schema. GSD's output format can vary between versions, and users can (and will) hand-edit .planning/ files. Regex-based or line-by-line markdown parsers are inherently brittle. The current `parse_plan_output_file` uses JSON (serde_json) which is reliable, but .planning/ files are markdown -- a fundamentally different parsing challenge.

**How to avoid:**
- Parse with a proper markdown AST library (pulldown-cmark for Rust). Walk the AST looking for heading nodes and list items rather than string matching. This handles formatting variations, extra whitespace, and nested structures.
- Define a minimal expected structure with generous tolerance: "H2 headings are phases, checkbox list items under them are tasks, anything else is ignored." Do not fail on unexpected content -- skip it and log a warning.
- Include a machine-readable frontmatter block (YAML between `---` fences) in every .planning/ file that the app manages. Use frontmatter for IDs and metadata, markdown body for human-readable content. When syncing, prefer frontmatter data over parsed markdown.
- Never delete content from a .planning/ file that the parser didn't understand. Preserve unknown sections verbatim on write-back.
- Add a validation step that compares parsed result against current database state and shows the user a diff before applying, rather than auto-applying blindly.

**Warning signs:**
- Task counts in the database don't match what's visible in ROADMAP.md
- Phase names have leading/trailing whitespace or duplicate entries
- Manual edits to .planning/ files are "lost" after the app processes them
- Parse errors in logs after GSD runs (different GSD version, different formatting)

**Phase to address:**
Phase 1 (sync architecture) for the parser, Phase 2 (planning tiers) for GSD-specific format handling.

---

### Pitfall 4: GSD CLI Not Installed or Wrong Version

**What goes wrong:**
The app invokes `claude --dangerously-skip-permissions` (or a configured CLI command) and it either: (a) isn't installed, (b) is installed but the `--dangerously-skip-permissions` flag is broken in the user's version (reported broken in versions after v2.1.77), (c) requires authentication the user hasn't set up, or (d) the GSD framework (`/gsd:new-project` etc.) isn't configured in the user's Claude Code installation. The terminal shows an error, the user sees a broken experience, and the app has no fallback.

**Why it happens:**
The current code in `OpenAiButton.tsx` hardcodes `claude --dangerously-skip-permissions` with no validation. There is no pre-flight check. The app assumes the CLI exists at a known path, that the flag works, and that GSD commands are available. Claude Code's `--dangerously-skip-permissions` flag has had breaking changes across versions. GSD is a separate framework installed into the user's Claude Code config, not bundled with Element.

**How to avoid:**
- Add a pre-flight validation command before launching: run `which claude` (or the configured CLI path) and parse the output. If not found, show a helpful error with install instructions instead of a terminal error.
- Check the CLI version: run `claude --version` and parse the semver. Warn if the version is known-incompatible.
- Degrade gracefully across tiers: if GSD is unavailable, the GSD tier should be disabled (greyed out with tooltip "Requires GSD framework"). Quick and Medium tiers should work with just Claude Code (no GSD dependency). Only the full GSD tier needs the GSD framework.
- Store the CLI tool path in `app_settings` (the table already exists from migration 009) and expose it in Settings UI. Default to "claude" but let users override with full path.
- Never assume `--dangerously-skip-permissions` is the only way. Support `--permission-mode bypassPermissions` as an alternative flag. Better yet, let the user configure the full flag set.
- Handle the case where the terminal command starts but the CLI prompts for authentication (API key). Detect "authentication required" or "API key" in terminal output and surface guidance.

**Warning signs:**
- "command not found" errors in the terminal after clicking "Open AI"
- Terminal hangs with no output (CLI waiting for interactive auth)
- GSD tier produces planning output but it doesn't match the expected .planning/ structure
- Users report "it works on my machine but not on my other machine"

**Phase to address:**
Phase 1 (configurable CLI tool in Settings). Pre-flight checks should gate all AI features.

---

### Pitfall 5: Planning Tier Decision Tree Becomes Unmaintainable

**What goes wrong:**
The tier selection logic (Quick/Medium/GSD) starts simple but accumulates special cases: "if project has existing phases but no tasks, treat as Medium," "if description is >500 chars, suggest GSD," "if user previously used GSD, default to GSD." The decision tree becomes a nested if/else chain that no one can reason about. Adding a new tier or modifying behavior requires touching 5+ code paths. The UI surface for selecting tiers diverges from the actual behavior.

**Why it happens:**
Tier selection is a classification problem being implemented as imperative branching. Each tier affects: (1) the context file content, (2) the terminal command/flags, (3) the output contract (JSON plan vs .planning/ folder), (4) the post-processing pipeline (parse JSON vs parse markdown vs watch folder). Without a clean abstraction, each of these 4 concerns implements its own tier check independently.

**How to avoid:**
- Model tiers as a discriminated union / enum with exhaustive matching. In Rust: `enum PlanningTier { Quick, Medium, Gsd }` with methods for `context_template()`, `command_args()`, `output_contract()`, `post_processor()`. In TypeScript: `type PlanningTier = 'quick' | 'medium' | 'gsd'` with a tier config object.
- Use a strategy pattern: each tier is a struct implementing a `PlanningStrategy` trait with methods for each concern. Adding a new tier means adding one struct, not modifying existing code.
- Keep tier detection (the "which tier?" decision) separate from tier execution (the "do the tier" behavior). Detection is a pure function of project state. Execution is the strategy.
- Limit auto-detection to 3 clear signals: (1) has existing .planning/ folder with ROADMAP.md = suggest GSD, (2) has phases/tasks in database = suggest execution mode, (3) empty project = ask user. Don't over-engineer detection heuristics.

**Warning signs:**
- The word "tier" or "mode" appears in more than 3 files outside the planning module
- Adding a new tier requires changes to >3 files
- Tier behavior is inconsistent between context generation and terminal command construction
- Users report "I selected Quick but it asked GSD-level questions"

**Phase to address:**
Phase 2 (planning tier implementation). Define the abstraction before implementing any tier.

---

### Pitfall 6: File Watcher Resource Exhaustion on Large Project Directories

**What goes wrong:**
The current file watcher watches `.element/` for `plan-output.json`. The new sync feature needs to watch `.planning/` for ROADMAP.md and other files. If implemented naively with `RecursiveMode::Recursive` on a large project root (to catch both `.element/` and `.planning/`), the watcher consumes a file descriptor for every file in the tree. A typical Node.js project with node_modules has 100K+ files. macOS has a default ulimit of 256 open files. The watcher silently stops working or the app crashes.

**Why it happens:**
The existing `start_plan_watcher` already uses `NonRecursive` on `.element/` which is correct. But extending to `.planning/` requires watching a second directory. The temptation is to watch the project root recursively "to catch everything." On Linux, inotify has a per-user watch limit (default 8192). On macOS, FSEvents is more efficient but `notify` crate's default backend may use kqueue which has the same fd problem.

**How to avoid:**
- Watch specific directories, never the project root. Create separate watchers for `.element/` and `.planning/` with `NonRecursive` mode.
- If .planning/ has subdirectories that need watching (e.g., .planning/phases/), use one watcher per known subdirectory, not recursive mode on .planning/.
- On macOS, explicitly use the FSEvents backend via `notify::RecommendedWatcher` (which already does this) but verify it handles `NonRecursive` correctly -- FSEvents is inherently recursive and `notify` simulates non-recursive by filtering events.
- Store all watcher instances in a single managed state (extend `PlanWatcherState` or create a new `SyncWatcherState`) so they can be cleaned up on project switch or app shutdown.
- When the user switches projects, stop all watchers for the old project before starting watchers for the new one. Never accumulate watchers across project switches.

**Warning signs:**
- "Too many open files" errors after switching projects multiple times
- File changes in .planning/ not detected after the app has been running for a while
- High file descriptor count visible in `lsof -p <pid> | wc -l`
- Watcher works on small test projects but fails on real codebases

**Phase to address:**
Phase 1 (sync architecture). Watcher management must be designed before adding new watched paths.

---

### Pitfall 7: Database Lock Contention During Sync Operations

**What goes wrong:**
The app uses `Arc<Mutex<Database>>` for SQLite access. The sync operation (parsing .planning/ files and updating the database) acquires the mutex. While it holds the lock, a user interaction (clicking a task checkbox, dragging a phase) also needs the mutex. The UI freezes for the duration of the sync parse + write. For large ROADMAP.md files with many phases/tasks, this can be 100-500ms -- noticeable and frustrating.

**Why it happens:**
SQLite is single-writer. The `Arc<Mutex<>>` pattern serializes all database access. This was acceptable when writes were small (single task update, single phase create) but sync operations are batch writes (potentially dozens of inserts/updates in a transaction). The current `batch_create_plan` already does this -- it holds the mutex for the entire batch insert loop. Sync will be even larger because it needs to diff existing data, delete removed items, update changed items, and insert new items.

**How to avoid:**
- Move sync operations to `spawn_blocking` with their own mutex acquisition, but keep the critical section minimal: read current state, release lock, compute diff in-memory, re-acquire lock, apply only the changes.
- Use SQLite WAL (Write-Ahead Logging) mode if not already enabled -- it allows concurrent reads while a write is in progress. Check if the connection is opened with `PRAGMA journal_mode=WAL`.
- Break batch sync into smaller transactions: one transaction per phase rather than one for the entire roadmap. This reduces lock hold time per acquisition.
- Add a sync debounce at the application level (not just the file watcher level): if 3 .planning/ files change within 2 seconds, batch them into one sync operation rather than 3 separate lock acquisitions.
- Expose sync status to the UI so users see "Syncing..." rather than unexplained lag.

**Warning signs:**
- UI interactions (checkbox, drag) feel sluggish after .planning/ files change
- "database is locked" errors in Rust logs
- Sync operations appear as jank in the React profiler
- Tasks briefly show stale state after a sync completes

**Phase to address:**
Phase 1 (sync architecture). Lock strategy must be decided before implementing sync operations.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding tier behavior in if/else chains | Fast to implement first tier | Every new tier or mode requires touching all branches; risk of inconsistent behavior | Never -- use strategy pattern from the start |
| Parsing markdown with regex instead of AST | No new dependency, quick to write | Breaks on formatting variations, impossible to round-trip (preserve unknown content on write-back) | Prototype only, must replace before sync goes live |
| Writing full database state to .planning/ on every change | Simple implementation, always consistent | Destroys external edits, creates large diffs in git, wastes I/O | Only during initial .planning/ folder creation, not on incremental updates |
| Ignoring watcher events for 1s after writing | Prevents sync loop quickly | Misses legitimate external edits that happen within the window; timing varies by OS | Never -- use content-hash guard instead |
| Skipping pre-flight CLI validation | Faster to launch AI | Broken experience on machines without Claude CLI; support burden | MVP only, must add before any public release |
| Using same context file for all tiers | One code path, simpler | Quick tier gets bloated context, GSD tier gets insufficient context, token waste across the board | Never -- mode-aware context is a core requirement |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code CLI | Assuming `--dangerously-skip-permissions` works on all versions | Check version, support alternative flags (`--permission-mode bypassPermissions`), handle auth failures |
| GSD Framework | Assuming GSD commands (`/gsd:new-project`) are always available | GSD is a user-installed Claude Code extension; detect its presence, degrade to non-GSD tiers if absent |
| notify crate (file watcher) | Using `RecursiveMode::Recursive` on project directories | Use `NonRecursive` on specific subdirectories (.element/, .planning/) to avoid fd exhaustion |
| SQLite via Arc<Mutex<>> | Holding mutex across entire sync operation | Minimize critical section: read state, release, compute diff, re-acquire, apply changes |
| .planning/ markdown files | Treating markdown as a reliable data format | Use YAML frontmatter for machine-readable data, markdown body for human-readable content; parse with AST not regex |
| Terminal PTY (existing) | Launching new CLI session without killing previous one | The existing `launchTerminalCommand` already kills/respawns, but verify this works when switching between planning and execution modes rapidly |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full context regeneration on every state change | Disk writes on every checkbox click, brief UI stall | Debounce context generation (500ms); only regenerate when launching AI, not on every state change | Immediately annoying with >10 tasks |
| Parsing entire ROADMAP.md on every file event | Watcher fires, full parse, full diff, full DB write | Cache last-known file hash; skip parse if hash unchanged | Noticeable with ROADMAP.md >50KB |
| Holding database lock during markdown parsing | UI freezes during sync | Parse markdown outside the lock, only hold lock for DB writes | Noticeable with >20 phases/tasks |
| Accumulating file watchers across project switches | fd exhaustion, stale event handlers | Clean up watchers on project switch; single `SyncWatcherState` managing all watchers | After switching projects 5-10 times |
| Context file grows unboundedly | AI quality degrades, token costs increase | Enforce token budget per tier, collapse completed phases | Projects with >30 tasks |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing CLI tool path from Settings without sanitization | Command injection via crafted settings value | Validate the settings value is a real file path (exists, is executable), never interpolate into shell strings |
| Writing API keys or tokens to context.md | Credentials exposed in .element/ directory, possibly committed to git | Never include credentials in context files; context generation should not access keyring |
| Passing user-edited markdown content directly to AI without escaping | Prompt injection via crafted ROADMAP.md content | Not a real risk for local-first single-user app, but note that AI instructions in context files should be clearly delimited from user content |
| .element/ and .planning/ directories not in .gitignore | plan-output.json, context.md, and other transient files committed to version control | Auto-add `.element/` to .gitignore on first context generation; .planning/ IS intentionally tracked in git |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auto-selecting planning tier without explanation | User doesn't understand why AI is asking detailed questions (GSD) or generating a flat list (Quick) | Show tier selection with one-line descriptions; remember last choice per project |
| Sync conflicts shown as technical errors | "Parse error on line 47 of ROADMAP.md" means nothing to the user | Show human-readable conflict: "ROADMAP.md was edited externally. 2 phases changed. Review changes?" |
| Context file visible in file explorer | User sees .element/context.md and edits it, but app overwrites on next "Open AI" click | Either hide .element/ from the file tree (add to hardcoded excludes) or show a "generated file" badge |
| No feedback during sync operations | User changes a task status, wonders if .planning/ file updated | Show subtle sync indicator (checkmark/spinner) near the project name |
| Planning tier changes mid-project with no migration | User starts with Quick tier, outgrows it, switches to GSD -- existing flat todo list doesn't map to GSD phases | Offer a "migration" path: "Convert your tasks into phases?" rather than starting from scratch |
| "What's next?" mode gives stale advice | Context file was generated 2 hours ago, user completed 3 tasks since | Always regenerate context fresh when entering execution mode; never serve cached context |

## "Looks Done But Isn't" Checklist

- [ ] **Bidirectional sync:** Often missing write-guard to prevent infinite loop -- verify by editing ROADMAP.md externally while app is running and checking for event cascade in logs
- [ ] **Context file:** Often missing token budget enforcement -- verify by creating a project with 50+ tasks and checking context.md size
- [ ] **CLI pre-flight:** Often missing version check -- verify by setting CLI path to a non-existent binary and confirming graceful error
- [ ] **Tier selection:** Often missing persistence -- verify that switching away from a project and back remembers the selected tier
- [ ] **File watcher cleanup:** Often missing on project switch -- verify by switching projects 10 times and checking open file descriptors
- [ ] **Sync conflict resolution:** Often missing user-facing UI -- verify by editing ROADMAP.md in an external editor while also editing phases in the app
- [ ] **Planning-to-execution mode transition:** Often missing context regeneration -- verify that completing a task and immediately clicking "Open AI" shows updated progress
- [ ] **GSD tier fallback:** Often missing detection of GSD availability -- verify by removing GSD framework and confirming GSD tier is disabled

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Sync infinite loop | LOW | Kill app, delete .element/context.md, restart. Data in SQLite is the source of truth. |
| Context file bloat | LOW | Regenerate context file with token budget. No data loss possible -- context is always generated from DB. |
| ROADMAP.md parse failure | MEDIUM | Fall back to database state as truth. Show user a "Sync failed" notification with option to re-export from database to .planning/. Manual markdown fix may be needed. |
| GSD CLI not installed | LOW | Show install instructions. Quick/Medium tiers work without GSD. No data loss. |
| Database lock contention | LOW | Restart app. SQLite WAL recovery is automatic. No manual intervention needed. |
| File watcher resource exhaustion | LOW | Restart app. Watchers are re-established on project load. Fix the watcher scope to prevent recurrence. |
| Tier decision tree spaghetti | HIGH | Requires refactor to strategy pattern. If caught late (after 3+ tiers implemented), expect 2-3 day rewrite. |
| Planning data divergence (DB vs .planning/) | HIGH | Need to decide which source is truth (DB or file), export from truth to the other, and manually verify. Prevent with validation diffs before auto-applying sync. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Bidirectional sync infinite loop | Phase 1 (sync architecture) | Integration test: write to DB, verify file updates, verify no re-trigger of DB write |
| Context file exceeds token budget | Phase 1 (context generation) | Unit test: generate context for 50-task project, assert size < budget |
| ROADMAP.md parse fragility | Phase 1 (sync architecture) | Unit test: parse 5 variant ROADMAP.md files (different formatting, extra content, hand-edited) |
| GSD CLI not installed | Phase 1 (settings + pre-flight) | Manual test: uninstall claude CLI, click "Open AI", verify graceful error |
| Planning tier unmaintainability | Phase 2 (tier implementation) | Code review: tier logic should be in <3 files, new tier requires <3 file changes |
| File watcher resource exhaustion | Phase 1 (sync architecture) | Manual test: switch projects 20 times, check fd count stays stable |
| Database lock contention | Phase 1 (sync architecture) | Performance test: trigger sync while rapidly clicking checkboxes, verify no UI freeze >100ms |
| Planning data divergence | Phase 1 (sync architecture) | Integration test: edit ROADMAP.md externally, verify app shows diff before applying |

## Sources

- [The Engineering Challenges of Bi-Directional Sync](https://www.stacksync.com/blog/the-engineering-challenges-of-bi-directional-sync-why-two-one-way-pipelines-fail) -- architectural patterns for avoiding sync loops
- [Race Conditions in Two-Way Live Sync](https://www.linkedin.com/pulse/off-races-race-conditions-avoid-two-way-live-sync-paul-bemis) -- event-driven sync race condition taxonomy
- [Conflict Resolution Strategies in Data Synchronization](https://mobterest.medium.com/conflict-resolution-strategies-in-data-synchronization-2a10be5b82bc) -- LWW, merge, and user intervention patterns
- [Claude Code --dangerously-skip-permissions Safe Usage Guide](https://www.ksred.com/claude-code-dangerously-skip-permissions-when-to-use-it-and-when-you-absolutely-shouldnt/) -- flag behavior and version compatibility
- [Claude Code Permissions Documentation](https://code.claude.com/docs/en/permissions) -- official permission modes
- [BUG: --dangerously-skip-permissions broken after v2.1.77](https://github.com/anthropics/claude-code/issues/36168) -- known version compatibility issue
- [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) -- token budget and context rot patterns
- [How to Build a File Watcher with Debouncing in Rust](https://oneuptime.com/blog/post/2026-01-25-file-watcher-debouncing-rust/view) -- notify crate patterns
- Element codebase: `src-tauri/src/commands/onboarding_commands.rs` -- existing watcher + context generation patterns
- Element codebase: `src-tauri/src/models/onboarding.rs` -- current context file generation and parse logic

---
*Pitfalls research for: Intelligent Planning features (v1.2) added to Element desktop app*
*Researched: 2026-03-25*
