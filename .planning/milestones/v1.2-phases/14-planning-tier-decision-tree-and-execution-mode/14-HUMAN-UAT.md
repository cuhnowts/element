---
status: partial
phase: 14-planning-tier-decision-tree-and-execution-mode
source: [14-VERIFICATION.md]
started: 2026-03-27T19:10:00Z
updated: 2026-03-27T19:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end Quick tier flow
expected: Select Quick tier in dialog -> terminal launches with "simple task list" context -> AI generates plan-output.json -> AiPlanReview shows tasks -> confirm creates flat tasks (no phases) -> context file regenerates to execution mode (D-07)
result: [pending]

### 2. End-to-end Medium tier flow
expected: Select Medium tier -> terminal launches with "ask questions" context -> AI generates plan-output.json with phases -> AiPlanReview shows phases+tasks -> confirm creates phases and tasks -> context file regenerates (D-07)
result: [pending]

### 3. End-to-end GSD tier flow
expected: Select GSD tier -> plan watcher NOT started -> terminal launches with "/gsd:new-project" context -> no AiPlanReview interaction expected
result: [pending]

### 4. D-07 context file regeneration
expected: After confirming a plan (Quick or Medium), check .element/context.md shows execution mode content (progress, attention items) instead of planning mode content
result: [pending]

### 5. Tier badge and Change plan interaction
expected: After tier is set, badge shows in header (Quick/Medium/GSD). "Change plan" button shows warning dialog when tasks exist. After confirming warning, tier selection dialog opens.
result: [pending]

### 6. Execution mode content adequacy (CTX-03)
expected: For projects with existing tasks, context file shows progress summary, attention items, and tier-appropriate instructions. Verify this is adequate for guiding AI on "what's next"
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
