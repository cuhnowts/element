# Deferred Items - Phase 17

## Pre-existing TS errors (out of scope)

These errors exist because other worktrees have untracked files (ThemeDetail.tsx, ExecutionHistory.tsx) that are imported by committed files (CenterPanel.tsx, OutputDrawer.tsx), but these files are not yet committed to git:

1. `src/components/layout/CenterPanel.tsx(8,29)`: Cannot find module `@/components/center/ThemeDetail`
2. `src/components/layout/OutputDrawer.tsx(6,34)`: Cannot find module `@/components/output/ExecutionHistory`
3. `src/components/layout/OutputDrawer.tsx(64,33)`: Parameter 'executionId' implicitly has 'any' type

These will resolve once the files from other parallel agents are committed.
