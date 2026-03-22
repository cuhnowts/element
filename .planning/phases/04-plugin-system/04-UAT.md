---
status: complete
phase: 04-plugin-system
source: [04-00-SUMMARY.md, 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md]
started: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Start the application from scratch. The app boots without errors and the main UI loads.
result: pass

### 2. Open Settings Page
expected: Click the gear icon in the sidebar footer OR press Cmd+, — the Settings page opens, replacing the center panel. It shows a left nav with tabs (Plugins, Credentials, Calendars). Press Escape to close and return to the normal view.
result: pass

### 3. Plugin List
expected: In Settings > Plugins tab, you see three core plugins listed: Shell, HTTP, and Filesystem. Each shows an "Active" status dot (green) and capability badges.
result: pass

### 4. Enable/Disable Plugin
expected: Click the enable/disable toggle on a core plugin. The status dot changes and the plugin state updates. Toggle it back and it returns to its original state.
result: pass

### 5. Add Credential
expected: In Settings > Credentials tab, click Add. A dialog appears with fields for name, service, username, and secret. Fill in values and submit. The new credential appears in the vault list.
result: pass

### 6. Credential Reveal and Auto-Mask
expected: Click the reveal button on a credential. The secret value is shown. After approximately 10 seconds, it automatically masks back to dots/asterisks without any user action.
result: pass

### 7. Credential Copy and Delete
expected: Click copy on a credential — the value is copied to clipboard (button shows a check briefly). Click delete — a confirmation appears. Confirm to remove the credential from the list.
result: pass

### 8. Calendar Accounts Tab
expected: In Settings, click the Calendars tab. The calendar accounts UI loads showing a connect button for Google and/or Outlook calendar providers.
result: pass

### 9. Mini Calendar Event Dots
expected: In the sidebar mini calendar, dates with calendar events show small color-coded dot indicators below the date number. (Requires a connected calendar account with events, or skip if no calendar connected.)
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
