# Feature Landscape

**Domain:** Tiered AI planning, .planning/ folder sync, progress-aware execution mode for desktop project management
**Researched:** 2026-03-25
**Confidence:** HIGH (based on direct analysis of GSD codebase + industry context file patterns)

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Planning decision tree on first "Open AI" | Users click "Open AI" on empty project and get generic instructions. Must detect state and route appropriately. | Medium | Existing `generate_context_file`, `OpenAiButton` | Currently `is_empty` triggers a generic onboarding prompt. Needs tier detection. |
| Quick tier (flat todo list) | Same-week work should not require multi-phase ceremony. Users will abandon if forced through complex flows for simple tasks. | Low | Context file generation | Equivalent to GSD's `/gsd:quick` — single plan, 1-3 tasks, no phases. |
| Progress-aware context file | Once planned, "Open AI" must seed current state (what's done, what's next) not just static structure. Already partially built. | Low | Existing `generate_populated_project_context` | Current implementation already shows phases/tasks with status icons. Needs "what's next" framing. |
| Structured output contract | AI must produce machine-parseable output (JSON) that Element can ingest. Already built for plan-output.json. | Low (exists) | `plan-output.json` schema, `start_plan_watcher` | Extend existing pattern for different tiers — same contract, different complexity levels. |
| Configurable CLI tool | Hardcoded `claude --dangerously-skip-permissions` must become a setting. Users on Codex, Aider, or other CLI tools are locked out. | Low | Settings UI (exists), `launchTerminalCommand` | Known tech debt item. Simple string setting + UI. |

## Differentiators

Features that set Element apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Medium tier with focused questioning | AI asks 3-5 focused questions about gray areas before generating phases + tasks. Goes beyond dump-and-plan to collaborative thinking. | Medium | Context file with conditional instructions, questioning framework | GSD's questioning.md pattern is the blueprint. Must work via markdown instructions, not slash commands. |
| GSD tier (full research + milestones) | For complex long-running projects, AI runs research, generates milestones, phases, and detailed task breakdowns. No other desktop PM tool offers this depth. | High | `.planning/` folder sync, ROADMAP.md parsing, multi-step workflow encoding | This is the killer differentiator. Must be achievable through context file instructions alone. |
| `.planning/` folder sync | Bidirectional awareness — GSD (or any AI tool) writes ROADMAP.md/phases, Element reads them into its database. File watcher keeps them in sync as the AI executes. | High | File watcher (pattern exists for `.element/`), markdown parser, database schema extensions | MarkdownDB (JS library) validates the approach but custom parser is more appropriate for the specific ROADMAP.md format. |
| "What's next?" execution mode | After planning, AI understands progress and guides execution: "Phase 2 task 3 is next, here's the context." Transforms from planning tool to execution companion. | Medium | Progress tracking (exists), context file adaptation | GSD's `next.md` workflow is the model — detect state, route to next action. Encode routing logic in markdown. |
| Tool-agnostic context files | Context files work with Claude Code, Codex, Aider, Cursor, or any CLI tool that accepts a markdown file. Not locked to Claude's slash commands. | Medium | Context file architecture redesign | This is the portability challenge. GSD uses slash commands + Task() API. Element must encode the same logic in pure markdown. |
| Smart context adaptation | Context file changes based on project state: empty project gets planning instructions, partially complete gets execution guidance, fully planned gets "what's next" mode. | Medium | State detection in Rust, template system | Three templates: onboarding, planning-in-progress, execution. Rust selects based on DB state. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Built-in AI chat UI for planning | Element orchestrates, external tools execute. Building a chat UI duplicates Claude Code/Cursor and is a maintenance pit. | Seed context files into the terminal. Let the AI CLI handle the conversation. |
| GSD slash command integration | Slash commands are Claude Code-specific. Building direct integration couples to one tool. | Encode workflow logic in markdown instructions that any AI tool can follow. |
| Automatic plan execution without user review | Users must see and approve plans before they become tasks. Autonomous execution erodes trust. | Always surface plans in AiPlanReview with inline editing and DnD before committing to database. |
| Full ROADMAP.md bidirectional write-back | Element should not write back to .planning/ files. The AI tool owns those files; Element reads them. | Read-only sync from `.planning/` to database. Element's database is the UI source of truth; `.planning/` is the AI tool's source of truth. |
| Multi-tool orchestration | Don't try to coordinate between Claude Code AND Cursor simultaneously. One tool per session. | Configurable CLI tool setting. User picks their tool. Context file format works with all of them. |
| Real-time streaming of AI output into UI | Parsing streaming terminal output to show progress is fragile and tool-specific. | Use file-based contracts (plan-output.json, ROADMAP.md) as the communication channel. File watcher detects when AI has produced output. |

## GSD Skill/Workflow Pattern Analysis

This section analyzes how GSD structures its instruction system and how to adapt it for tool-agnostic context files.

### GSD Architecture (from direct codebase analysis)

GSD organizes AI instructions across four layers:

**Layer 1: Workflows (56 files in `workflows/`)**
Each workflow is a complete multi-step process encoded in markdown with XML-like tags. Key patterns:
- `<purpose>` tag — What this workflow does
- `<process>` with numbered `<step>` elements — Sequential decision logic
- `<required_reading>` — Files the AI must read before starting
- `<success_criteria>` — Checkboxes defining completion
- Conditional branching via `**If X:** do Y. **If not X:** do Z.`

Example from `next.md` (the "what's next?" equivalent):
```
Route 1: No phases exist -> discuss
Route 2: Phase exists but no context -> discuss
Route 3: Phase has context but no plans -> plan
Route 4: Phase has plans but incomplete -> execute
Route 5: All plans have summaries -> verify and complete
```

**Layer 2: References (15 files in `references/`)**
Reusable context documents loaded on-demand. Not instructions — they are knowledge:
- `questioning.md` — How to ask good questions (loaded by discussion workflows)
- `tdd.md` — Test-driven development patterns (loaded by executors)
- `verification-patterns.md` — How to verify work (loaded by verifiers)

**Layer 3: Templates (32+ files in `templates/`)**
Structural patterns for output files. Define the shape of artifacts:
- `context.md` — Phase context template with decisions, specifics, deferred ideas
- `project.md` — Project definition template
- `claude-md.md` — CLAUDE.md generation template with marker-bounded sections

**Layer 4: Agents (18 agent definitions in `agents/`)**
Specialized roles spawned by orchestrator workflows:
- `gsd-executor` — Executes plan tasks
- `gsd-planner` — Creates detailed plans
- `gsd-verifier` — Verifies phase completion
- `gsd-phase-researcher` — Researches technical approaches

### Key GSD Patterns to Adapt

**Pattern 1: State-Driven Routing**
GSD's `next.md` reads STATE.md and routes to the appropriate workflow. Element must replicate this in the context file itself — the AI reads the project state and follows the appropriate instruction branch.

Adaptation: Embed routing logic directly in context markdown:
```markdown
## Your Mode

**If no phases exist below:** You are in PLANNING mode. Follow the Planning Instructions.
**If phases exist with incomplete tasks:** You are in EXECUTION mode. Follow the Execution Instructions.
**If all tasks are complete:** Congratulate the user and ask what's next.
```

**Pattern 2: Tiered Complexity (Quick/Medium/GSD)**
GSD has separate workflows: `quick.md` (1-3 tasks), `plan-phase.md` (medium), `new-project.md` (full). The tier decision happens in the orchestrator.

Adaptation: Element detects complexity in Rust (based on project state and user choice) and generates the appropriate context file template. No tier decision in the AI — Element makes the decision and provides the right instructions.

**Pattern 3: Structured Output Contracts**
GSD uses frontmatter YAML + XML tags for structured plan files. Element already uses `plan-output.json`.

Adaptation: Keep the existing JSON contract. Extend it for medium/GSD tiers:
```json
{
  "tier": "medium",
  "phases": [...],
  "metadata": { "estimated_duration": "2 weeks" }
}
```

**Pattern 4: Progressive Disclosure via File References**
GSD skills use `<files_to_read>` blocks — the AI doesn't get everything upfront. It reads what it needs when it needs it.

Adaptation: Context files can reference other files in the project:
```markdown
## Reference Materials
- If you need project history, read `.element/history.md`
- If you need architecture context, read `CLAUDE.md` or `AGENTS.md`
```

**Pattern 5: Gray Area Questioning**
GSD's `questioning.md` + `discuss-phase.md` surface 2-4 decision points before planning. The AI asks domain-specific questions (not generic ones) using a heuristic:
- Something users SEE -> layout, interactions
- Something users CALL -> API design, errors
- Something users RUN -> CLI flags, output format

Adaptation: For the medium tier, embed the questioning framework in the context file:
```markdown
## Before You Plan

Identify 3-5 gray areas in this project. For each, ask the user a focused question
with concrete options (not vague categories). Consider:
- User-facing decisions (what they'll see/interact with)
- Technical decisions (architecture, data model, libraries)
- Scope decisions (what's in v1 vs later)

After gathering answers, generate the plan.
```

### Portability Analysis: Making Context Files Tool-Agnostic

The critical challenge is that GSD relies on Claude Code-specific features:
1. **Slash commands** (`/gsd:plan-phase`) — Not portable
2. **Task() API** for subagent spawning — Not portable
3. **AskUserQuestion** structured prompts — Not portable (but conversational equivalent works everywhere)
4. **`gsd-tools.cjs`** CLI utilities — Not portable

What IS portable across all AI CLI tools:
1. **Markdown instructions** — Every tool reads markdown
2. **File reading directives** — "Read this file before proceeding"
3. **Conditional logic in natural language** — "If X, then do Y"
4. **Structured output requests** — "Write JSON to this path with this schema"
5. **File-based communication** — Write output to a known path, file watcher picks it up

**Portability strategy:** Element generates markdown context files that:
- Contain all instructions inline (no external tool dependencies)
- Use natural language conditionals instead of code branching
- Request structured JSON output to known file paths
- Are self-contained — the AI needs only the context file + project files to operate

### How AGENTS.md Fits

AGENTS.md (Linux Foundation standard, adopted by 40,000+ projects) is emerging as the tool-agnostic alternative to CLAUDE.md. Key facts:
- Standard markdown format, hierarchical (project root + subdirectories)
- Supported by Codex, Amp, Jules, Cursor, Factory
- Claude Code has an open feature request to support it natively
- Does NOT replace tool-specific files — coexists with CLAUDE.md, .cursorrules

**Recommendation:** Element should generate `.element/context.md` (its own format for seeding AI sessions) but could optionally also write an `AGENTS.md` at project root for tools that auto-discover it. This is a nice-to-have, not a priority.

## Feature Dependencies

```
Configurable CLI tool -> (independent, do first)
                                    |
                                    v
Planning decision tree -> Smart context adaptation -> Tier detection (Quick/Medium/GSD)
         |                         |                           |
         v                         v                           v
   Quick tier <---- Context file templates ----> Medium tier questioning
         |                         |                           |
         v                         v                           v
   plan-output.json --> AiPlanReview (exists) <-- Extended JSON schema
                                    |
                    .planning/ folder sync -> ROADMAP.md parser
                              |                      |
                              v                      v
                     File watcher          Database schema extensions
                              |
                              v
                    "What's next?" mode -> Progress-aware context
```

## MVP Recommendation

Prioritize:
1. **Configurable CLI tool** — Unblocks non-Claude users, known tech debt, trivial complexity
2. **Smart context adaptation with tier detection** — The core UX change. "Open AI" on empty project asks tier, generates appropriate context file. Requires reworking `generate_context_file_content` in Rust.
3. **Quick tier** — Generates a simple "help me plan these tasks" context file. AI produces `plan-output.json`. Existing AiPlanReview handles the rest.
4. **Medium tier with questioning** — Context file includes questioning framework. AI asks questions, then produces structured plan.
5. **"What's next?" execution mode** — Progress-aware context file that guides the AI to the next action based on project state.

Defer:
- **GSD tier (full research + milestones):** Requires `.planning/` folder sync to be useful. Build after sync is working.
- **`.planning/` folder sync:** High complexity, requires markdown parser + file watcher + schema extensions. Build after tiers are working.
- **AGENTS.md generation:** Nice-to-have, build after core context file system is solid.

## Complexity Budget

| Feature | Estimated Effort | Risk |
|---------|-----------------|------|
| Configurable CLI tool | 1-2 hours | None — string setting + UI |
| Tier detection + routing | 1-2 days | Low — extends existing context generation |
| Quick tier context file | 0.5-1 day | Low — simplest template |
| Medium tier with questioning | 1-2 days | Medium — question quality depends on context file design |
| "What's next?" mode | 1-2 days | Medium — routing logic must be clear enough for any AI tool |
| .planning/ folder sync (read) | 3-5 days | High — markdown parsing, schema changes, file watcher |
| GSD tier context file | 2-3 days | High — complex multi-step instructions in pure markdown |

## Sources

### Direct Analysis (HIGH confidence)
- GSD codebase at `$HOME/.claude/get-shit-done/` — 56 workflows, 15 references, 32+ templates, 18 agents
- Element codebase — `onboarding_commands.rs`, `onboarding.rs`, `OpenAiButton.tsx`
- GSD skill system — `$HOME/.claude/plugins/marketplaces/claude-plugins-official/plugins/*/skills/*/SKILL.md`

### Industry Context (MEDIUM confidence)
- [AGENTS.md specification](https://agents.md/) — Linux Foundation standard for tool-agnostic AI context
- [CLAUDE.md, AGENTS.md, and Every AI Config File Explained](https://www.deployhq.com/blog/ai-coding-config-files-guide) — Comparison of context file formats
- [The Complete Guide to AI Agent Memory Files](https://medium.com/data-science-collective/the-complete-guide-to-ai-agent-memory-files-claude-md-agents-md-and-beyond-49ea0df5c5a9) — Tiered context management patterns
- [Codified Context: Infrastructure for AI Agents](https://arxiv.org/html/2602.20478v1) — Research on tiered knowledge architecture for AI agents
- [Planning with Files](https://github.com/OthmanAdi/planning-with-files) — Claude Code skill for persistent markdown planning
- [MarkdownDB](https://markdowndb.com/) — JS library for indexing markdown into SQLite (validates parse-markdown-to-DB approach)
- [Context Management for Windsurf](https://iceberglakehouse.com/posts/2026-03-context-windsurf/) — How Windsurf manages context via Rules files and Memories
- [2026 Agentic Coding Trends Report](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf) — Anthropic's analysis of coding agent patterns
