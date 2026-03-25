# Stack Research

**Domain:** Intelligent planning features (tiered AI, .planning/ sync, context-adaptive markdown, CLI tool config)
**Researched:** 2026-03-25
**Confidence:** HIGH (existing patterns extended, no new paradigms)

## Scope

This document covers ONLY stack additions/changes for v1.2 features. The existing validated stack (Tauri 2.x, React 19, SQLite, Zustand, shadcn/ui, Tailwind CSS, xterm.js, tauri-plugin-pty, notify v8, reqwest, tokio, keyring) is unchanged.

---

## Key Insight: No New Dependencies Needed

The v1.2 milestone is architecturally unique -- it requires almost zero new library dependencies. The features are primarily:

1. **Rust string manipulation** (markdown generation/parsing)
2. **SQLite schema additions** (settings, planning state)
3. **Reuse of existing `notify` crate** (already v8 with debouncer)
4. **React component composition** (decision tree UI, settings form)

The real "stack" work is in **design patterns**, not library choices.

---

## Recommended Stack Additions

### Rust: Markdown Parsing for ROADMAP.md Sync

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `pulldown-cmark` | 0.13.3 | Parse ROADMAP.md into structured phase data | De facto standard Rust CommonMark parser (62M+ downloads). Pull-parser design means zero allocations for streaming. Handles GFM extensions (task lists `- [x]`, tables) which are exactly what ROADMAP.md uses. Already pure Rust, no unsafe blocks. |

**Why pulldown-cmark over alternatives:**
- `comrak` is more full-featured but heavier (wraps C code) -- overkill for extracting headings and checkbox lists
- `markdown-rs` is newer but less battle-tested
- Regex-only parsing is fragile and breaks on edge cases (nested lists, inline code in headings)

**What it does for us:** The `.planning/ROADMAP.md` file uses a predictable structure (H2 headings for sections, `- [x]`/`- [ ]` task lists for phases, Markdown tables for progress). pulldown-cmark's event iterator lets us walk this structure and extract phase names, completion status, and plan counts into Rust structs that map to SQLite rows.

**Integration point:** New module `src-tauri/src/planning/roadmap_parser.rs`. The parser walks `Event::Start(Tag::Heading)`, `Event::TaskListMarker(bool)`, and `Event::Start(Tag::Item)` events to build a `Vec<RoadmapPhase>` struct.

```toml
# Add to Cargo.toml [dependencies]
pulldown-cmark = { version = "0.13", default-features = false }
```

### Frontend: No New Dependencies

All v1.2 UI features build on the existing stack:

| Feature | Built With | Notes |
|---------|-----------|-------|
| Planning decision tree | React state machine + existing shadcn Dialog/Card | No router needed -- modal flow within ProjectDetail |
| Settings UI for CLI tool | shadcn Input + Select + Form | Already have get/set_app_setting Tauri commands |
| Progress display | Existing phase/task components | Just new data sources from .planning/ sync |
| Tier selection | shadcn RadioGroup or Card grid | Simple selection UI, no new lib |

### Rust: No New Backend Dependencies

| Feature | Built With | Notes |
|---------|-----------|-------|
| .planning/ watcher | Existing `notify` v8 + `notify-debouncer-mini` 0.7 | Same pattern as `start_file_watcher` and `start_plan_watcher` -- add a third watcher for `.planning/` |
| Context file generation | String concatenation (existing pattern) | `generate_context_file_content` already does this -- extend with tier-aware sections |
| ROADMAP.md parsing | `pulldown-cmark` (new, see above) | Only new dependency |
| CLI tool config | Existing `app_settings` table | `get_app_setting`/`set_app_setting` already wired |

---

## Architecture Patterns (The Real Stack)

### Pattern 1: Context File as Cross-Tool Protocol

This is the critical architectural decision for v1.2. The context file written to `.element/context.md` must work with ANY AI CLI tool, not just Claude Code.

**Current state:** Hardcoded `claude --dangerously-skip-permissions` with context.md as argument.

**Target state:** Configurable CLI tool where context.md serves as a universal instruction document.

**How AI CLI tools consume context:**

| Tool | How It Reads Context | Entry Point |
|------|---------------------|-------------|
| Claude Code | `claude [file]` reads file as initial prompt | Direct file argument |
| Cursor (terminal) | Reads `.cursorrules` or paste into chat | Would need manual paste or symlink |
| GitHub Copilot CLI | `gh copilot suggest` reads piped input | `cat context.md \| gh copilot suggest` |
| Aider | `aider --read context.md` | `--read` flag for read-only context |
| OpenAI Codex CLI | Reads `AGENTS.md` in project root | Place as AGENTS.md or pass as prompt |
| Ollama CLI | Pipe into prompt | `cat context.md \| ollama run model` |

**Recommendation:** The context file should be written as **tool-agnostic markdown** that works when:
1. Passed as a file argument (`claude context.md`)
2. Piped as stdin (`cat context.md | tool`)
3. Placed at a known path that tools auto-discover (`.element/context.md`)

The CLI tool setting should store: `{ command: "claude", args: ["--dangerously-skip-permissions", "{context_file}"], env: {} }` where `{context_file}` is a template variable replaced at launch time.

### Pattern 2: Tiered Context Generation (Decision Tree in Markdown)

The GSD skill pattern reveals how to embed workflow logic into markdown without slash commands:

**GSD's approach:**
- SKILL.md files use plain markdown with structured sections (## Your Task, ## Output Contract)
- Decision trees are expressed as conditional prose: "If X, do Y. Otherwise, do Z."
- Output contracts specify JSON schemas the AI should write to a known file path
- File watchers detect the output and parse it back into the app

**This pattern maps directly to Element's tiers:**

| Tier | Context File Strategy | Output Contract |
|------|----------------------|-----------------|
| Quick | Short context, flat task list request, write to `.element/plan-output.json` | `{ "tasks": [{ "title": "...", "description": "..." }] }` |
| Medium | Medium context with questioning section, phases + tasks, write to `.element/plan-output.json` | Existing `PlanOutput` schema (phases array) |
| GSD | Full GSD workflow instructions embedded in context.md, write to `.planning/ROADMAP.md` + phase dirs | ROADMAP.md in standard GSD format |

**Key insight from GSD analysis:** GSD's SKILL.md files prove that **plain markdown with clear instructions and output contracts is sufficient** to drive complex multi-step workflows in any AI tool. No special format, no YAML frontmatter, no template engine needed. The "template engine" is the AI itself -- you write instructions, the AI follows them.

### Pattern 3: Structured Markdown Generation (Not Templates)

**Do NOT use a template engine.** Here's why:

The existing `generate_context_file_content()` function in `onboarding.rs` already uses Rust string building with conditional sections. This is the right approach because:

1. **Context files are AI-consumed, not human-consumed.** The AI doesn't care about pixel-perfect formatting.
2. **Conditional logic is simple.** "If project is empty, show onboarding instructions. If populated, show progress + what's next." This is a 3-way branch, not a complex template.
3. **Template engines add indirection.** Tera, Handlebars, or Liquid would add a dependency, a template directory, and a debugging layer for zero benefit.
4. **The existing pattern works.** `generate_context_file_content` is already tested and shipping.

**Extend the existing pattern** with a new function signature:

```rust
pub fn generate_context_file_content_v2(
    data: &ProjectContextData,
    mode: ContextMode,       // Planning | Execution | WhatNext
    tier: Option<PlanTier>,  // Quick | Medium | GSD (only for Planning mode)
    cli_tool: &CliToolConfig, // Affects output contract paths and instructions
) -> String
```

### Pattern 4: .planning/ Folder Watcher

Reuse the exact `notify` + `notify-debouncer-mini` pattern from `start_file_watcher`:

```rust
pub struct PlanningWatcherState {
    pub watcher: Mutex<Option<Debouncer<RecommendedWatcher>>>,
}
```

**What to watch for:**
- `ROADMAP.md` changes -> re-parse phases, sync to SQLite
- `STATE.md` changes -> update progress display
- `phases/*/` directory changes -> detect new plans/summaries
- `plan-output.json` -> already handled by existing PlanWatcherState

**Watch `.planning/` recursively** with a 1-second debounce (longer than file explorer's 500ms because GSD writes multiple files in rapid succession during phase transitions).

**Event routing in the callback:**
```rust
// In the debouncer callback
if path.ends_with("ROADMAP.md") {
    app.emit("planning-roadmap-changed", path);
} else if path.ends_with("STATE.md") {
    app.emit("planning-state-changed", path);
} else if path.ends_with("plan-output.json") {
    // Already handled by PlanWatcherState -- skip to avoid double-processing
}
```

### Pattern 5: CLI Tool Configuration Schema

Store in the existing `app_settings` table:

```json
{
  "cli_tool": {
    "command": "claude",
    "args": ["--dangerously-skip-permissions", "{context_file}"],
    "label": "Claude Code"
  }
}
```

**Preset options for the Settings UI:**

| Preset | Command | Args |
|--------|---------|------|
| Claude Code | `claude` | `["--dangerously-skip-permissions", "{context_file}"]` |
| Aider | `aider` | `["--read", "{context_file}"]` |
| Custom | (user input) | (user input with `{context_file}` placeholder) |

The `{context_file}` placeholder gets replaced with the absolute path to `.element/context.md` at launch time.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Tera / Handlebars / Liquid (template engines) | Unnecessary complexity for conditional string building. The AI is the "template engine" -- it interprets markdown instructions. | Rust `format!` + conditional string building (existing pattern) |
| pulldown-cmark-to-cmark (markdown writer) | We're generating markdown from data, not transforming markdown-to-markdown | Direct string building |
| YAML parser (serde_yaml) | Deprecated; ROADMAP.md uses markdown structure not YAML frontmatter | pulldown-cmark for parsing, string building for generation |
| gray-matter or front-matter crate | STATE.md has YAML frontmatter but it's simpler to parse with a regex for the `---` delimiters + serde_yaml for just that block | Regex split + `serde_json` (already in deps) or just parse the markdown body |
| Any React markdown renderer (react-markdown, remark) | Context files are written TO disk for CLI tools, not rendered in-browser | Not applicable -- these are output files |
| WebSocket / SSE for watcher events | Tauri's `app.emit()` already provides event bridge to frontend | Existing Tauri event system |
| State machine library (xstate, zustand-fsm) | Decision tree has 3 tiers with linear flows -- React useState + switch is sufficient | useState + conditional rendering |

---

## Installation

```toml
# Add to src-tauri/Cargo.toml [dependencies]
pulldown-cmark = { version = "0.13", default-features = false }
```

```bash
# No new npm dependencies needed
# Frontend is pure composition of existing shadcn/ui + Zustand
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| pulldown-cmark (parse ROADMAP.md) | Regex-based parsing | If ROADMAP.md format is 100% stable and never changes. Regex is faster to implement but breaks on format evolution. |
| Rust string building (context gen) | Tera template engine | If context files grow beyond ~200 lines of conditional logic or if non-developers need to edit templates. |
| notify v8 recursive watch | Polling with `std::fs::metadata` | If notify has platform-specific bugs on Windows (unlikely -- v8 is mature). Polling at 2s interval is a fallback. |
| Single `app_settings` JSON blob | Dedicated `cli_tools` SQLite table | If users need multiple CLI tool profiles (switch between Claude/Aider per project). Overkill for v1.2 -- one global setting is enough. |
| Hardcoded presets + custom | Full plugin system for CLI tools | If the CLI tool ecosystem grows beyond 3-4 options. For v1.2, presets + custom covers all cases. |

---

## Stack Patterns by Feature

### Tiered Planning Decision Tree

**If Quick tier:**
- Context file: Short, flat task request, 30-50 lines
- Output: `.element/plan-output.json` with `{ "tasks": [...] }` (no phases)
- UI: Single modal step -> AI generates -> review list

**If Medium tier:**
- Context file: Medium with questioning prompts + phase structure request, 50-100 lines
- Output: `.element/plan-output.json` with existing `PlanOutput` schema
- UI: Modal step -> AI questions (in terminal) -> AI generates -> AiPlanReview

**If GSD tier:**
- Context file: Full GSD instructions embedded, 100-200 lines
- Output: `.planning/ROADMAP.md` + phase directories (standard GSD structure)
- UI: Modal step -> AI runs in terminal (full GSD workflow) -> .planning/ watcher syncs results

### .planning/ Folder Sync

**Stack:** `notify` v8 (existing) + `pulldown-cmark` (new) + SQLite (existing)
**Flow:** File change event -> debounced callback -> parse changed file -> update SQLite -> emit Tauri event -> React re-renders

### Context-Adaptive Markdown

**Stack:** Pure Rust string building (existing pattern)
**Key decision:** Context file structure varies by mode:

```
Planning mode (empty project):     "Help plan this project. [tier instructions]. Write output to [path]."
Planning mode (has phases):        "Project has phases but needs more detail. [tier instructions]."
Execution mode (has plan):         "Here's where we are. What's next? [progress data]."
```

### CLI Tool Configuration

**Stack:** SQLite `app_settings` (existing) + shadcn Select/Input (existing)
**Schema:** Single JSON setting: `cli_tool_config` = `{ command, args, label }`

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| pulldown-cmark 0.13 | Rust 1.71+ (we use latest stable) | No MSRV conflict |
| pulldown-cmark 0.13 | serde_json 1.x (for structured output) | pulldown-cmark doesn't depend on serde; we use serde_json separately to serialize parsed data |
| notify 8.x | notify-debouncer-mini 0.7 | Already validated in v1.1 file explorer |

---

## Cross-Tool Context File Design

### Research Finding: How GSD Skills Work

GSD (Get Shit Done) uses `.claude/get-shit-done/workflows/` with markdown files containing:

1. **Purpose block** (`<purpose>`) -- what the workflow does
2. **Process steps** (`<step>`) -- sequential instructions with decision points
3. **Output contracts** -- exact JSON schemas or file formats the AI must produce
4. **Required reading** -- files to load before starting
5. **Routing logic** -- "If X, then do Y" expressed in plain prose

These work because Claude Code has `/slash-command` routing built in. But **bare API calls, Cursor, Copilot CLI, and Aider have no slash commands** -- they just read markdown and follow instructions.

### Design: Portable Workflow Instructions

The context file Element generates must encode the same workflow logic as GSD skills but without assuming any tool-specific features. The pattern:

```markdown
# Project Context: {name}

## Current State
{progress data, phase status, task list}

## Your Task
{mode-specific instructions}

### If you need to plan this project:
{tier-specific planning instructions}

### If you need to execute:
{what's-next guidance with current phase context}

## Output Contract
When complete, write results to `.element/plan-output.json`:
{JSON schema}

IMPORTANT: The output file MUST be valid JSON matching this schema exactly.
```

**Why this works across tools:**
- Every AI tool can read markdown and follow instructions
- The "Output Contract" section gives the AI a clear target (file path + schema)
- The file watcher picks up the output regardless of which tool wrote it
- No slash commands, no special syntax, no tool-specific features assumed
- Decision trees are expressed as conditional prose ("If X, do Y") which any LLM can follow

**What makes GSD's pattern transferable:**
- GSD SKILL.md files are just markdown with clear structure
- The magic is in the **output contract** (write JSON to a known path) + **file watcher** (detect and parse the output)
- This contract pattern works identically whether Claude Code, Aider, or bare `ollama` writes the file

---

## Sources

- pulldown-cmark 0.13.3 -- [docs.rs](https://docs.rs/crate/pulldown-cmark/latest) -- HIGH confidence (official docs)
- notify v8 -- already validated in codebase (`src-tauri/Cargo.toml` line 30) -- HIGH confidence
- AI tool context files -- [DeployHQ guide](https://www.deployhq.com/blog/ai-coding-config-files-guide) -- MEDIUM confidence (third-party but comprehensive)
- AGENTS.md standard -- [Layer5 blog](https://layer5.io/blog/ai/agentsmd-one-file-to-guide-them-all/) -- MEDIUM confidence
- GSD skill pattern -- analyzed from `~/.claude/plugins/.../skill-creator/skills/skill-creator/SKILL.md` and `~/.claude/get-shit-done/workflows/` -- HIGH confidence (primary source)
- Claude Code best practices -- [official docs](https://code.claude.com/docs/en/best-practices) -- HIGH confidence
- Cross-tool context strategy -- [agentrulegen.com comparison](https://www.agentrulegen.com/guides/cursorrules-vs-claude-md) -- LOW confidence (needs validation per-tool)

---
*Stack research for: v1.2 Intelligent Planning*
*Researched: 2026-03-25*
