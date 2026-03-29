# Phase 16: Onboarding Skill and Context Delivery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 16-onboarding-skill-context-delivery
**Areas discussed:** Content scope, Delivery mechanism, Tier/state awareness, Token budget impact, Semi-dynamic content details, Content maintenance, GSD integration

---

## Content Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Orientation brief | What Element is, core concepts, AI's role. ~300-500 tokens. | ✓ |
| Feature-by-feature guide | Covers each major capability. ~800-1200 tokens. | |
| Full product manual | Deep explanation of everything. ~1500-2500 tokens. | |

**User's choice:** Orientation brief
**Notes:** Enough to orient without overwhelming.

### AI Role Framing

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include role framing | Tell AI it's inside Element, seeded with context, what actions it can take | ✓ |
| Just product knowledge | Explain Element but don't frame the AI's role | |
| You decide | Claude determines balance | |

**User's choice:** Yes, include role framing

### Content Type (Static vs Dynamic)

| Option | Description | Selected |
|--------|-------------|----------|
| Static content | Hardcoded in Rust, same every time | |
| Semi-dynamic | Static description + dynamic CLI tool name and tier | ✓ |
| Fully dynamic | Generated from database state | |

**User's choice:** Semi-dynamic

---

## Delivery Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| New section in context.md | Add "About Element" at top of existing context.md | ✓ |
| Separate skill file | Write separate .element/skill.md alongside context.md | |
| Prepended template file | Store template in app resources, prepend at generation | |

**User's choice:** New section in context.md

### Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Top, before Header | Product knowledge first, then project context | ✓ |
| After Header, before Instructions | Project name first, then product knowledge | |
| You decide | Claude determines | |

**User's choice:** Top, before Header

---

## Tier/State Awareness

### Tier Adaptation

| Option | Description | Selected |
|--------|-------------|----------|
| Same for all tiers | Universal product knowledge, tier-specific behavior in Instructions | ✓ |
| Tier-adapted framing | Same core content, different AI role framing per tier | |
| Omit for GSD tier | Skip entirely for GSD | |

**User's choice:** Same for all tiers

### State Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Always present | Skill section in every state | ✓ |
| Skip for Complete state | Omit when all tasks done | |
| You decide | Claude determines | |

**User's choice:** Always present

---

## Token Budget Impact

| Option | Description | Selected |
|--------|-------------|----------|
| Separate budget | ~400 token allowance on top of 2000 project budget | ✓ |
| Shared budget | Counts toward 2000, project data collapses first | |
| No budget, always full | Fixed overhead, only project data gets collapsed | |

**User's choice:** Separate budget

---

## Semi-Dynamic Content Details

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: CLI tool + tier | Just configured CLI tool name and planning tier | ✓ |
| Moderate: + project stats | Plus number of themes, projects, total tasks | |
| Rich: + feature flags | Plus which features are active/configured | |

**User's choice:** Minimal: CLI tool + tier

---

## Content Maintenance

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded in Rust | Skill text in onboarding.rs, updated with feature releases | ✓ |
| External template file | .md template in Tauri resources, read at runtime | |
| Database-stored template | In app_settings, user-customizable | |

**User's choice:** Hardcoded in Rust

---

## GSD Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include it | GSD users benefit from orientation, no conflict with .planning/ | ✓ |
| Omit for GSD tier | GSD has own context, might create noise | |
| Shorter version for GSD | Condensed 1-2 line mention | |

**User's choice:** Yes, include it

---

## Claude's Discretion

- Exact wording of product description and AI role framing
- Format of dynamic CLI tool name and tier within section
- Heading hierarchy within skill section
