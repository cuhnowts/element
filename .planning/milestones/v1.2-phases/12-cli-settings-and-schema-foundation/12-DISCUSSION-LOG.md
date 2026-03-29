# Phase 12: CLI Settings and Schema Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 12-cli-settings-and-schema-foundation
**Areas discussed:** CLI tool setting UX, CLI validation behavior, Planning tier storage, Sync source tagging

---

## CLI Tool Setting UX

### Where should the CLI tool setting live?

| Option | Description | Selected |
|--------|-------------|----------|
| Add to AI Providers tab | Keeps all AI config in one place. Tab already exists. | ✓ |
| New 'Terminal' tab | Dedicated tab separating CLI from API keys. | |
| New 'General' tab | First settings tab for general preferences. | |

**User's choice:** Add to AI Providers tab (Recommended)

### How should the user enter their CLI command?

| Option | Description | Selected |
|--------|-------------|----------|
| Single text field | One input for full command string. Simple. | |
| Command + args fields | Separate fields for command and default arguments. | ✓ |
| Preset dropdown + custom | Dropdown with known tools plus custom option. | |

**User's choice:** Command + args fields

### What should the default value be?

| Option | Description | Selected |
|--------|-------------|----------|
| Empty — prompt to configure | No default. Forces explicit setup. | ✓ |
| claude | Default to 'claude' with no args. | |
| You decide | Claude picks a sensible default. | |

**User's choice:** Empty — prompt to configure

### Should the AI Providers tab be renamed?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 'AI Providers' | Don't rename. Less churn. | |
| Rename to 'AI' | Shorter, broader label covering both concerns. | ✓ |
| Rename to 'AI & Terminal' | Explicit about both concerns. | |

**User's choice:** Rename to 'AI' (Recommended)

---

## CLI Validation Behavior

### When should the app validate the CLI tool?

| Option | Description | Selected |
|--------|-------------|----------|
| On 'Open AI' click | Check right before launching. Simple. | ✓ |
| On save in Settings + on launch | Validate on save AND on launch. Earlier feedback. | |
| You decide | Claude picks the right timing. | |

**User's choice:** On 'Open AI' click (Recommended)

### What should the error look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Toast with Settings link | Toast error with clickable link to Settings. | ✓ |
| Inline error on button | Error text below the Open AI button. | |
| Dialog with instructions | Modal dialog with install instructions. | |

**User's choice:** Toast with Settings link (Recommended)

### How should the app check if the tool exists?

| Option | Description | Selected |
|--------|-------------|----------|
| which/where command | Run 'which' (macOS) or 'where' (Windows). | |
| Try spawning with --version | Run '[tool] --version' and check exit code. | ✓ |
| You decide | Claude picks the right approach. | |

**User's choice:** Try spawning with --version

### What happens when no CLI tool is configured?

| Option | Description | Selected |
|--------|-------------|----------|
| Toast directing to Settings | Toast with message about configuring in Settings. | ✓ |
| Auto-open Settings AI tab | Automatically navigate to Settings. | |
| You decide | Claude picks the right behavior. | |

**User's choice:** Toast directing to Settings (Recommended)

---

## Planning Tier Storage

### How should the tier be stored per-project?

| Option | Description | Selected |
|--------|-------------|----------|
| New column on projects | Add 'planning_tier' column. Simple, queryable. | |
| Use app_settings table | Store as key-value pair. Reuses existing table. | |
| Replace ai_mode column | Replace dead ai_mode column with planning_tier. | ✓ |

**User's choice:** Replace ai_mode column
**Notes:** ai_mode is dead code from removed per-project AI mode feature.

### What should the tier values be?

| Option | Description | Selected |
|--------|-------------|----------|
| quick / medium / gsd | Matches REQUIREMENTS.md naming. | |
| quick / medium / full | 'full' is more user-facing friendly than 'gsd'. | ✓ |
| You decide | Claude picks appropriate values. | |

**User's choice:** quick / medium / full

### Should planning_tier be exposed to the frontend?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include in Project model | Add to struct. Frontend can read for PLAN-05. | ✓ |
| Not yet — schema only | Column only, no struct change until Phase 14. | |
| You decide | Claude decides based on Phase 14 needs. | |

**User's choice:** Yes, include in Project model (Recommended)

### API design for setting the tier?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated set_planning_tier | Specific command. Clear intent. | ✓ |
| General update_project | Add to general update payload. More flexible. | |
| You decide | Claude picks the right API shape. | |

**User's choice:** Dedicated set_planning_tier command (Recommended)

---

## Sync Source Tagging

### How should externally-synced phases/tasks be tagged?

| Option | Description | Selected |
|--------|-------------|----------|
| source column on both tables | Add 'source' TEXT to phases and tasks. Simple. | ✓ |
| source + source_ref columns | Both source and reference for re-sync matching. | |
| You decide | Claude picks the right approach. | |

**User's choice:** source column on both tables (Recommended)

### Default value for source?

| Option | Description | Selected |
|--------|-------------|----------|
| Default 'user' | NOT NULL DEFAULT 'user'. Clean, no ambiguity. | ✓ |
| Nullable, NULL = legacy | Existing rows get NULL. New rows get explicit value. | |
| You decide | Claude picks the right default. | |

**User's choice:** Default 'user' (Recommended)

### Expose source to frontend in Phase 12?

| Option | Description | Selected |
|--------|-------------|----------|
| Include in models | Add to Phase and Task structs now. | ✓ |
| Schema only | Column only until Phase 15. | |

**User's choice:** Include in models (Recommended)

---

## Claude's Discretion

- Storage key naming for CLI command/args in app_settings
- Migration numbering
- Cleanup of dead ai_mode references in frontend code

## Deferred Ideas

None — discussion stayed within phase scope
