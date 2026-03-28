---
plan: 12-02
phase: 12-cli-settings-and-schema-foundation
status: complete
started: 2026-03-27
completed: 2026-03-27
---

## Summary

Added CLI tool configuration UI to Settings > AI tab and wired OpenAiButton to read from settings with validation.

## What Was Built

1. **TypeScript types updated**: Added `planningTier` to Project, `source` to Phase and Task interfaces. Added `validateCliTool` and `setPlanningTier` API bindings.

2. **Settings > AI tab**: Renamed from "AI Providers" to "AI". Added CLI Tool section with Command and Default arguments fields above existing AI Providers section.

3. **OpenAiButton settings-driven launch**: Replaced hardcoded `claude --dangerously-skip-permissions` with configurable command/args from app_settings. Added validation flow: no-command toast, tool-not-found toast, then launch.

4. **tauri-pty workaround**: Discovered tauri-pty's `spawn(file, args)` does not reliably pass args as process argv. Implemented workaround: always spawn login shell (`/bin/zsh -l`), then write full command string to stdin after 500ms initialization delay.

5. **CLI arg separator**: Added `--` between flags and positional args for Claude CLI compatibility.

## Key Files

### Created
- (none)

### Modified
- `src/lib/types.ts` — planningTier on Project, source on Phase/Task
- `src/lib/tauri.ts` — validateCliTool, setPlanningTier bindings
- `src/components/settings/AiSettings.tsx` — CLI Tool form section
- `src/components/settings/SettingsNav.tsx` — "AI" tab label
- `src/components/settings/SettingsPage.tsx` — "AI" heading
- `src/components/center/OpenAiButton.tsx` — settings-driven launch with validation
- `src/components/center/OpenAiButton.test.tsx` — updated tests for new flow
- `src/hooks/useTerminal.ts` — shell-first spawn with stdin command writing
- `src/components/center/__tests__/ProjectDetail.test.tsx` — added source to test fixture
- `src/components/center/__tests__/TodayView.test.tsx` — added source to test fixture

## Deviations

1. **tauri-pty args bug**: spawn() args array is not passed as process argv. Worked around by spawning login shell and writing command to stdin.
2. **Test fixtures**: Added `source: "user"` to makeTask helpers in ProjectDetail and TodayView tests.
3. **`--` separator**: Added double-dash before context file path for Claude CLI flag parsing.

## Decisions

- D-PTY: tauri-pty spawn workaround — shell-first approach with 500ms stdin delay
- D-SEP: `--` separator before positional args for CLI tool compatibility
