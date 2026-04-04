# Phase 17: Tech Debt Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 17-tech-debt-cleanup
**Areas discussed:** Navigation bug behavior, TS error fix depth, Orphaned file verification

---

## Navigation Bug Behavior

### Q1: What's the actual bug?

| Option | Description | Selected |
|--------|-------------|----------|
| launchTerminalCommand navigates away | Calling launchTerminalCommand with bad state causes the workspace store to switch views/routes | |
| State race on project switch | Clicking Open AI while project is still loading hits a race where projectId or directoryPath is stale | |
| Not sure -- reproduce it | Know the symptom but not the root cause. Have Claude reproduce and diagnose during execution. | ✓ |

**User's choice:** Not sure -- reproduce it
**Notes:** User knows the symptom (navigates to home) but hasn't pinpointed root cause. Diagnosis is part of execution.

### Q2: Expected behavior on error?

| Option | Description | Selected |
|--------|-------------|----------|
| Error toast + stay on ProjectDetail | Show a descriptive toast explaining what's wrong, user stays exactly where they are | ✓ |
| Error toast + disable button | Toast the error AND grey out the Open AI button until state is valid | |
| Inline error message | Show the error directly in the ProjectDetail view near the button, not as a toast | |

**User's choice:** Error toast + stay on ProjectDetail
**Notes:** None

---

## TS Error Fix Depth

### Q1: How thorough should the fixes be?

| Option | Description | Selected |
|--------|-------------|----------|
| Proper type alignment | Fix the root cause -- update type definitions or interfaces so the types genuinely match | ✓ |
| Minimal targeted fixes | Use type assertions or minimal patches to silence the errors | |
| You decide | Claude picks the right fix per error | |

**User's choice:** Proper type alignment
**Notes:** None

---

## Orphaned File Verification

### Q1: Sweep for other dead code?

| Option | Description | Selected |
|--------|-------------|----------|
| Verify only | Confirm the two files are gone and no stale imports/references remain | |
| Light sweep | Also check for other unused components or exports that are obviously dead | ✓ |
| Just close it | Files are gone, requirement is met. No further verification needed. | |

**User's choice:** Light sweep
**Notes:** None

---

## Claude's Discretion

- Navigation bug diagnosis approach
- Specific type fix implementations (proper alignment, not casts)
- Scope of light dead code sweep

## Deferred Ideas

None -- discussion stayed within phase scope.
