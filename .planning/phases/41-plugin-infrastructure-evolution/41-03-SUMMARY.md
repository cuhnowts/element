---
plan: 41-03
phase: 41-plugin-infrastructure-evolution
status: complete
started: 2026-04-06
completed: 2026-04-06
---

## Summary

Added frontend TypeScript types, Tauri API bindings, and Zustand store extensions for plugin skills. Fixed the PathBuf::from("/") security hole.

## What Was Built

### TypeScript Types (types.ts)
- `PluginSkillInfo` interface with prefixedName, pluginName, description, inputSchema, outputSchema, destructive

### Tauri API Bindings (tauri.ts)
- `listPluginSkills()` — fetch all registered skills
- `dispatchPluginSkill(skillName, input)` — invoke a plugin skill
- `purgePluginDirectory(pluginName, directoryPath)` — remove plugin directory

### Zustand Store (pluginSlice.ts)
- `pluginSkills: PluginSkillInfo[]` state with `pluginSkillsLoading` flag
- `fetchPluginSkills()` action
- `dispatchPluginSkill()` action
- `enablePlugin`/`disablePlugin` now auto-refresh skills after state change

### Security Fix (plugin_commands.rs)
- Replaced `PathBuf::from("/")` with `std::env::current_dir()` in execute_step
- Filesystem operations now scoped to working directory instead of entire filesystem

## Self-Check: PASSED

## key-files
### modified
- src/lib/types.ts
- src/lib/tauri.ts
- src/stores/pluginSlice.ts
- src-tauri/src/commands/plugin_commands.rs

## Tests
- No new TypeScript errors in modified files
- Rust build succeeds
- All existing tests pass
