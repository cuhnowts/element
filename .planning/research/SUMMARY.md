# Project Research Summary

**Project:** Element v1.2 — Intelligent Planning
**Domain:** Tiered AI planning, .planning/ folder sync, context-adaptive AI execution guidance for Tauri desktop app
**Researched:** 2026-03-25
**Confidence:** HIGH

## Executive Summary

Element v1.2 adds intelligent planning capability to the existing Tauri 2.x + React 19 + SQLite desktop app. The milestone is architecturally lean: only one new dependency (`pulldown-cmark` for markdown parsing) is needed, and the primary work is design pattern implementation — tiered context file generation, a .planning/ folder file watcher, and a configurable CLI tool setting. The recommended approach is to extend the existing `generate_context_file_content` pattern into a `context_builder` module with five named modes (planning-quick, planning-medium, planning-gsd, execution, execution-done), and build tier selection as a discriminated enum with a strategy pattern to avoid branching spaghetti across code paths.

The key differentiators — tiered planning (Quick/Medium/GSD), .planning/ folder sync, and progress-aware execution mode — are achievable through plain markdown context files with output contracts. GSD's workflow system proves that well-structured markdown with conditional instructions and a known output file path is sufficient to drive complex multi-step AI workflows across any tool (Claude Code, Aider, Codex, etc.) without slash commands or tool-specific features. The hardcoded `claude --dangerously-skip-permissions` command must become a configurable setting immediately; it is known tech debt that blocks all non-Claude users and has a confirmed version-specific flag regression after v2.1.77.

The highest-risk area is the .planning/ folder sync, which must solve a bidirectional sync infinite loop problem, a file descriptor exhaustion risk from file watchers, and database lock contention during batch sync operations. All three must be addressed in the foundation phase before any feature code touches them. The one-way sync contract — disk owns structure, database owns task status and user additions — cleanly avoids conflict scenarios. ROADMAP.md parsing should use regex-based line parsing (not a full AST) given the predictable GSD-generated format, with graceful tolerance for unexpected content.

## Key Findings

### Recommended Stack

The existing stack is completely unchanged. The only addition is `pulldown-cmark = { version = "0.13", default-features = false }` in `Cargo.toml` — though ARCHITECTURE.md ultimately recommends regex-based parsing over AST parsing for ROADMAP.md given its predictable GSD-generated structure. All frontend features build on existing shadcn/ui components and Zustand. No new npm packages are needed.

**Core technologies:**
- `pulldown-cmark` 0.13 (conditional): ROADMAP.md parsing — de facto standard Rust CommonMark parser, zero allocations, pure Rust. May be superseded by regex parsing depending on format stability.
- `notify` v8 (existing): .planning/ folder watcher — same debouncer pattern as existing `start_file_watcher`; extend with a new `PlanningWatcherState`
- `rusqlite` (existing): schema additions — three new columns: `phases.source`, `phases.external_ref`, `projects.planning_tier`
- Rust `format!` string building (existing): context file generation — no template engine needed; the AI interprets markdown instructions as its "template engine"

**What NOT to add:** Tera/Handlebars/Liquid template engines, serde_yaml, bidirectional .planning/ write-back, WebSocket/SSE for watcher events, React markdown renderers, xstate or other FSM libraries.

### Expected Features

**Must have (table stakes):**
- Planning decision tree on first "Open AI" — detect project state, route to tier selection or execution mode
- Quick tier (flat todo list) — same-week work should not require phase ceremony; uses existing `plan-output.json` contract
- Progress-aware context file — execution mode seeds current state (what's done, what's next), not static structure; already partially built
- Structured output contract — AI produces machine-parseable JSON; extend existing `plan-output.json` pattern per tier
- Configurable CLI tool — unblocks non-Claude users; known tech debt; trivial implementation (string setting + UI)

**Should have (differentiators):**
- Medium tier with focused questioning — AI asks 3-5 domain-specific questions before generating phases/tasks (GSD `questioning.md` pattern adapted to pure markdown)
- GSD tier (full research + milestones) — killer differentiator; requires .planning/ sync to be useful; defer until sync is working
- .planning/ folder sync — GSD writes ROADMAP.md; Element reads and syncs phase/task structure to database via file watcher
- "What's next?" execution mode — progress-aware context guides AI to the next action based on task completion state
- Tool-agnostic context files — portable markdown instructions + output contracts work with any AI CLI tool
- Smart context adaptation — 5 context modes based on `planning_tier` + task completion state

**Defer (v2+):**
- AGENTS.md generation at project root (tool auto-discovery; nice-to-have after core context system is solid)
- Multi-tool orchestration (one configured tool per session is the right constraint)
- Built-in AI chat UI (Element orchestrates, external tools execute — never duplicate this)

### Architecture Approach

The architecture extends existing patterns with four new Rust modules (`planning_sync.rs`, `context_builder.rs`, `planning_commands.rs`, `PlanningWatcherState`) and three new frontend components (`PlanningTierDialog`, `CliSettingsForm`, `planningSlice`). Quick and Medium tiers use the existing `plan-output.json` contract and existing plan watcher; only the GSD tier uses the new planning watcher and .planning/ sync path. This keeps two code paths cleanly separated and coexistent.

**Major components:**
1. `context_builder.rs` — determines context mode from project state, generates tier-appropriate markdown with embedded output contract
2. `planning_sync.rs` — parses ROADMAP.md via regex line-by-line, diffs against DB, applies one-way sync (disk structure → DB)
3. `PlanningWatcherState` + `planning_commands.rs` — watches `.planning/` with 1000ms debounce (longer than .element/'s 500ms; GSD writes multiple files in rapid succession), triggers sync on ROADMAP changes only
4. `PlanningTierDialog.tsx` — first-time "Open AI" flow; selected tier saved to `projects.planning_tier`
5. `CliSettingsForm.tsx` — stores `cli_tool_command` in `app_settings`, replaces hardcoded `claude --dangerously-skip-permissions`

**Suggested build order (from ARCHITECTURE.md):** Foundation (CLI settings + schema) → Adaptive context builder → Planning tier decision tree → .planning/ folder sync

### Critical Pitfalls

1. **Bidirectional sync infinite loop** — Never write back to .planning/ files from the app. Use a content-hash write guard (not timestamp suppression, which is unreliable across macOS FSEvents/Linux inotify/Windows ReadDirectoryChangesW) if any write-back ever occurs. Sync is strictly one-way: disk → DB. Must be solved in Phase 1 before any sync code is written.

2. **Context file exceeds AI token budget** — Mode-aware context is mandatory from day one. Token budgets: ~2,000 tokens (Quick), ~4,000 (Medium), ~8,000 (GSD). Collapse completed phases to a single summary line. Never dump the full task list into the context file. Hard ceiling: truncate completed phase details first, then task descriptions.

3. **ROADMAP.md parse fragility** — Use generous tolerance: H2 headings are phases, checkbox list items are tasks, everything else is skipped with a warning (not a failure). Log but don't crash on unexpected content. Never auto-apply sync without logging what changed; surface user-facing conflict messages for external edits.

4. **GSD CLI not installed or wrong version** — Add pre-flight `which <command>` check before launching. Warn on known-incompatible flag versions (`--dangerously-skip-permissions` confirmed broken after v2.1.77; support `--permission-mode bypassPermissions`). GSD tier must be visibly disabled (greyed out, not silently broken) when GSD framework is absent.

5. **File watcher resource exhaustion** — Watch `.element/` and `.planning/` specifically with `NonRecursive` mode. Never watch the project root recursively. Enforce cleanup on every project switch. Single `SyncWatcherState` manages all watcher instances.

6. **Database lock contention during sync** — Minimize critical section: read current state → release lock → compute diff in memory → re-acquire → apply changes. Confirm SQLite WAL mode is enabled. Break batch sync into per-phase transactions. Show sync status indicator in UI so users see "Syncing..." rather than unexplained lag.

## Implications for Roadmap

Research converges on a 4-phase structure driven by hard dependencies. Each phase is a releasable increment. None can be safely reordered.

### Phase 1: Foundation — CLI Settings, Schema, and Sync Architecture

**Rationale:** All subsequent features depend on this foundation. Configurable CLI tool unblocks non-Claude users immediately. The three schema columns (`projects.planning_tier`, `phases.source`, `phases.external_ref`) must exist before any tier or sync logic can be stored. Most critically, the file watcher architecture, sync safety patterns (write guard, lock strategy), and watcher cleanup discipline must be designed and reviewed here — rearchitecting after features are built on top has HIGH recovery cost.

**Delivers:** CLI tool settings UI (`CliSettingsForm`, `app_settings` key `cli_tool_command`); pre-flight CLI validation before launch; migration 010 adding schema columns; `set_project_planning_tier` / `get_project_planning_tier` commands; `PlanningWatcherState` scaffold with cleanup-on-project-switch; confirmed SQLite WAL mode; updated `Project` TypeScript type with `planningTier` field.

**Addresses:** Configurable CLI tool (table stakes), watcher resource exhaustion (critical pitfall), DB lock contention (critical pitfall), sync loop prevention (critical pitfall), GSD CLI pre-flight validation (critical pitfall).

### Phase 2: Adaptive Context Builder

**Rationale:** Refactors the existing `onboarding.rs` context generation before any new features depend on it. Extracting `context_builder.rs` first means every subsequent tier is built on a tested, mode-aware foundation. Establishing token budget enforcement now prevents the "bolt it on later" failure mode documented in PITFALLS.md.

**Delivers:** `context_builder.rs` with 5 modes (PlanningQuick, PlanningMedium, PlanningGsd, Execution, ExecutionDone); `determine_context_mode()` pure function; per-tier token budget enforcement; backward-compatible `generate_context_file` command with optional `mode` parameter; all existing "Open AI" behavior preserved.

**Uses:** Rust `format!` string building (existing pattern); no new dependencies.

**Avoids:** Context file bloat (token budget enforced from day one), using same context for all tiers.

### Phase 3: Planning Tier Decision Tree

**Rationale:** Combines Phase 1 (tier storage) + Phase 2 (context modes) into the user-facing flow. Quick and Medium tiers are implemented here; GSD tier is wired to the context builder but requires Phase 4's sync for the full output loop. This phase delivers the most immediately visible user value in v1.2.

**Delivers:** `PlanningTierDialog` component (Quick/Medium/GSD selection with one-line descriptions); `planningSlice` store; modified `OpenAiButton` with full decision tree (no tier → show dialog; has tier + no tasks → planning mode; has tier + has tasks → execution "What's next?" mode); Quick tier end-to-end (`plan-output.json` output, existing `AiPlanReview` unchanged); Medium tier with questioning framework embedded in context markdown; execution mode context showing progress and next-action framing; CLI tool setting used (not hardcoded `claude`).

**Addresses:** Planning decision tree (table stakes), Quick tier (table stakes), Medium tier with questioning (differentiator), "What's next?" execution mode (differentiator), tool-agnostic context files (differentiator).

**Avoids:** Tier logic scattered across files (strategy pattern from start); auto-selecting tier without explanation; GSD tier silently broken when framework absent.

**Research flag:** Medium tier question quality depends on how the questioning framework is embedded in the context markdown. GSD's `questioning.md` reference file is the direct model — read it before finalizing the template. Budget iteration time; prompt quality cannot be fully assessed from research alone.

### Phase 4: .planning/ Folder Sync (GSD Tier)

**Rationale:** The most architecturally complex feature and has the narrowest initial audience (GSD users only). Must come last because it requires schema (Phase 1), context builder (Phase 2), and tier system (Phase 3) to be in place. The sync architecture safety patterns validated in Phase 1 are the foundation for this phase's implementation.

**Delivers:** `planning_sync.rs` with regex ROADMAP.md parser and incremental diff engine; `find_active_roadmap()` to locate the most recent ROADMAP.md in `.planning/milestones/`; `sync_planning_to_db` one-way sync (disk structure → DB, never reverse); `PlanningWatcherState` activated watching `.planning/` recursively at 1000ms debounce; `planning-synced` Tauri event; frontend `planningSlice` refresh on sync event; GSD tier in decision tree starts the planning watcher; sync status indicator in UI.

**Addresses:** .planning/ folder sync (differentiator), GSD tier (differentiator).

**Avoids:** Bidirectional sync write-back, full AST parsing (regex is sufficient for predictable GSD format), storing raw ROADMAP content in DB.

**Research flag:** Regex patterns in `planning_sync.rs` must be validated against actual current GSD output before declaring complete. Test against `.planning/milestones/v1.0-ROADMAP.md` and `.planning/milestones/v1.1-ROADMAP.md` (both present in the project directory). Edge cases to cover: phase numbers with decimals (2.1), special characters in phase names, completed-date format variations, subdirectory nesting changes across GSD versions.

### Phase Ordering Rationale

- **Foundation first:** PITFALLS.md classifies four of its eight pitfalls as requiring Phase 1 prevention. All involve sync architecture and watcher design. Retrofitting these patterns after features are built on top has HIGH to MEDIUM recovery cost.
- **Refactor before feature:** Context builder extraction (Phase 2) must precede tier implementation (Phase 3). Building tiers directly on top of `onboarding.rs`'s hardcoded template would make subsequent mode additions increasingly expensive.
- **User-facing before complex backend:** Phase 3 delivers Quick tier, Medium tier, and execution mode — real user value — before the most complex engineering work in Phase 4. This allows usable releases at each phase boundary.
- **GSD tier last:** The GSD tier context file (Phase 3) instructs the AI to write to `.planning/`; without the sync layer (Phase 4), those files are written but never reflected in Element's UI. Building GSD tier end-to-end requires both phases. Phase 3 delivers the context generation; Phase 4 closes the loop.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (Medium tier questioning framework):** The quality of AI questions depends entirely on how the questioning framework is embedded in the context markdown. GSD's `questioning.md` at `~/.claude/get-shit-done/references/questioning.md` is the primary model — read it directly before planning this phase. Expect to iterate.
- **Phase 4 (ROADMAP.md regex patterns):** Patterns must be validated against actual current-version GSD output. The two existing ROADMAP files in `.planning/milestones/` are the test corpus. Run the parser against both before finalizing the implementation plan.

Phases with standard patterns (skip research-phase):

- **Phase 1 (CLI settings + schema):** SQLite migration + shadcn form + `app_settings` table = established patterns already in the codebase. No novel territory.
- **Phase 2 (context builder):** Pure Rust string building refactor. The existing `generate_context_file_content` function in `onboarding.rs` is the direct model; this is extraction, extension, and mode-awareness, not invention.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only one potential new dependency (pulldown-cmark). All others are existing and validated. No MSRV conflicts. ARCHITECTURE.md may eliminate even that dependency by choosing regex over AST. |
| Features | HIGH | Directly derived from GSD codebase analysis (primary source — 56 workflows, 15 references, 32+ templates analyzed) + existing Element codebase. Table stakes and differentiators have clear implementation paths. |
| Architecture | HIGH | Based on existing codebase patterns: notify watcher, plan watcher, app_settings, onboarding command structure. No novel architecture required. Build order driven by actual code dependencies. |
| Pitfalls | MEDIUM-HIGH | Sync loop and watcher pitfalls verified against existing code and engineering literature. CLI flag regression confirmed via GitHub issue #36168. Context token budget validated against industry patterns. DB lock contention observed pattern in existing `batch_create_plan`. |

**Overall confidence:** HIGH

### Gaps to Address

- **Cross-tool context file quality:** The portability strategy (markdown instructions + output contract) is sound in principle, but actual testing with Aider, Codex CLI, and Cursor has not been done. The STACK.md source for cross-tool compatibility is LOW confidence (single third-party guide). Validate with real tool invocations during Phase 3.
- **GSD framework detection:** How to reliably detect whether GSD is installed in the user's Claude Code config is unspecified. Options: check for `~/.claude/get-shit-done/` directory existence, check that `claude` CLI version supports GSD commands, or provide a manual toggle. Decide during Phase 3 planning.
- **Tier migration path:** What happens when a user starts with Quick tier and outgrows it is flagged in PITFALLS.md as a UX concern but is not addressed in FEATURES.md or ARCHITECTURE.md. Treat as deferred to v1.3 unless user testing reveals it blocks adoption during Phase 3.
- **pulldown-cmark vs regex:** STACK.md recommends pulldown-cmark; ARCHITECTURE.md recommends regex. The resolution is: use regex for ROADMAP.md (predictable GSD-generated format), use pulldown-cmark if other .planning/ files require AST-level parsing. Confirm this decision in Phase 4 planning.

## Sources

### Primary (HIGH confidence)
- GSD codebase at `$HOME/.claude/get-shit-done/` — 56 workflows, 15 references, 32+ templates, 18 agents (direct analysis)
- Element codebase — `onboarding_commands.rs`, `onboarding.rs`, `OpenAiButton.tsx`, `file_explorer_commands.rs` (direct analysis)
- GSD ROADMAP format — `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.1-ROADMAP.md` (direct analysis)
- pulldown-cmark 0.13.3 — [docs.rs](https://docs.rs/crate/pulldown-cmark/latest)
- notify v8 — validated in `src-tauri/Cargo.toml`
- Claude Code permissions — [official docs](https://code.claude.com/docs/en/permissions)
- BUG: --dangerously-skip-permissions broken after v2.1.77 — [GitHub issue #36168](https://github.com/anthropics/claude-code/issues/36168)

### Secondary (MEDIUM confidence)
- [AGENTS.md specification](https://agents.md/) — Linux Foundation standard for tool-agnostic AI context
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- [MarkdownDB](https://markdowndb.com/) — validates parse-markdown-to-DB approach
- [notify crate docs](https://docs.rs/notify/latest/notify/)
- [The Engineering Challenges of Bi-Directional Sync](https://www.stacksync.com/blog/the-engineering-challenges-of-bi-directional-sync-why-two-one-way-pipelines-fail)
- [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)
- [2026 Agentic Coding Trends Report](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf)

### Tertiary (LOW confidence)
- [AI tool context file comparison](https://www.agentrulegen.com/guides/cursorrules-vs-claude-md) — cross-tool context strategy; needs per-tool validation
- [Context Management for Windsurf](https://iceberglakehouse.com/posts/2026-03-context-windsurf/) — how rules/memories files are consumed; informational only

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
