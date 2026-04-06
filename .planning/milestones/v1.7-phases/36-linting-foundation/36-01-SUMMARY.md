---
phase: 36-linting-foundation
plan: 01
subsystem: tooling
tags: [biome, linting, formatting, a11y, typescript]

requires: []
provides:
  - "Biome v2.4.7 config with zero violations on biome check src/"
  - "Clean lint baseline for pre-commit hook enforcement"
affects: [36-02, 39-hooks-enforcement]

tech-stack:
  added: []
  patterns:
    - "biome-ignore with per-line justification for a11y suppressions"
    - "Visual-only labels use <span> not <label> (noLabelWithoutControl)"
    - "Custom interactive elements use // biome-ignore for a11y rules"

key-files:
  created: []
  modified:
    - "biome.json"
    - "src/ (248 files)"

key-decisions:
  - "Converted visual-only <label> elements to <span> rather than suppressing noLabelWithoutControl"
  - "Added role attributes (status, img, region) to elements using aria-label instead of suppressing"
  - "Removed unnecessary role attributes from divs to fix useSemanticElements"
  - "Scoped biome.json to src/**/*.ts and src/**/*.tsx to exclude Tailwind v4 CSS parse errors"
  - "Reordered HubChat hook declarations to fix noInvalidUseBeforeDeclaration rather than suppressing"

patterns-established:
  - "biome-ignore comments must include specific justification"
  - "Use // biome-ignore in non-JSX and .map() callbacks; {/* biome-ignore */} as JSX children"
  - "Visual section headers use <span> not <label> unless paired with native form control"

requirements-completed: [LINT-01, LINT-02]

duration: 20min
completed: 2026-04-05
---

# Phase 36 Plan 01: Biome v2 Migration and Lint Zero Summary

**Migrated Biome from v1.9.4 to v2.4.7 schema and resolved all 651 lint/format violations to achieve zero-error baseline**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-05T19:07:44Z
- **Completed:** 2026-04-05T19:28:00Z
- **Tasks:** 2
- **Files modified:** 248

## Accomplishments
- Migrated biome.json from v1.9.4 to v2.4.7 schema with v2 assist structure
- Auto-fixed ~600 violations (formatting, import ordering, template literals, useImportType)
- Manually resolved ~136 remaining violations through proper code fixes and targeted suppressions
- All recommended rules remain enforced -- no rules disabled globally

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate Biome schema to v2 and auto-fix violations** - `22b7586` (feat)
2. **Task 2: Manually resolve remaining Biome violations** - `ee1df10` (fix)

## Files Created/Modified
- `biome.json` - Migrated to v2.4.7 schema, scoped to src/**/*.ts and src/**/*.tsx
- `src/` (248 files) - Formatting, import ordering, lint fixes across entire codebase

## Decisions Made
- Converted 43 visual-only `<label>` elements to `<span>` instead of suppressing (semantically correct fix)
- Added `role="status"`, `role="img"`, `role="region"` to elements using `aria-label` (proper a11y fix)
- Removed unnecessary `role` attributes from divs that were triggering useSemanticElements
- Reordered `sendToolResult` and `handleToolUse` declarations in HubChat.tsx to fix noInvalidUseBeforeDeclaration
- Replaced `fns.forEach((fn) => fn())` with `for...of` loops to fix useIterableCallbackReturn
- Scoped biome.json to TS/TSX files only to avoid Tailwind v4 `@theme` CSS parse errors
- Used per-line `biome-ignore` with justification for 42 a11y violations on custom interactive components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] CSS parse errors from Tailwind v4 syntax**
- **Found during:** Task 1 (auto-fix)
- **Issue:** Biome cannot parse Tailwind v4 `@theme` directives in app.css, causing 7 parse errors
- **Fix:** Added `files.includes` to biome.json scoping to `src/**/*.ts` and `src/**/*.tsx`
- **Files modified:** biome.json
- **Verification:** CSS parse errors eliminated, TS/TSX files still fully checked

**2. [Rule 2 - Missing Critical] More violations than plan estimated (136 vs 48)**
- **Found during:** Task 2 (manual fixes)
- **Issue:** Plan estimated ~48 remaining violations; actual count was 136 including 44 noLabelWithoutControl, 15 useSemanticElements, 9 useAriaPropsSupportedByRole
- **Fix:** Systematic fix strategy -- proper code fixes where possible, targeted suppressions for custom interactive components
- **Impact:** Additional categories required handling but all resolved

---

**Total deviations:** 2 auto-fixed (both missing critical)
**Impact on plan:** Larger scope than estimated but completed within time budget. No scope creep.

## Issues Encountered
- JSX biome-ignore comment syntax requires different formats depending on context: `// biome-ignore` works in non-JSX code and .map() callbacks, but `{/* biome-ignore */}` is required when placed as JSX text children
- Removing `role` attributes from elements with onClick/tabIndex exposed new violations (noStaticElementInteractions, noNoninteractiveTabindex) that were previously masked by the role

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Biome check passes clean -- ready for pre-commit hook enforcement (Phase 39)
- LINT-01 (schema migrated, check passes) and LINT-02 (recommended rules enforced) satisfied
- Biome config excludes CSS files -- Tailwind v4 CSS linting would need a separate tool if desired

---
*Phase: 36-linting-foundation*
*Completed: 2026-04-05*
