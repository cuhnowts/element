# Phase 20: Notification System - Research

**Researched:** 2026-03-29
**Domain:** Desktop notification system -- OS-native notifications, in-app notification center, event-driven API
**Confidence:** HIGH

## Summary

Phase 20 delivers the notification pipeline for Element: OS-native desktop notifications via `tauri-plugin-notification`, an in-app notification center (bell icon + popover with history), and an event-driven API the Phase 21 central agent can invoke. The existing codebase already has Sonner configured for toasts and a well-established Tauri event system pattern, so the core work is (1) adding the native notification plugin, (2) building the SQLite persistence layer, (3) creating the Zustand notification slice, (4) building the bell icon + popover UI, and (5) wiring the event-driven creation API.

The architecture is straightforward: a Rust-side `create_notification` command handles persistence (SQLite write) and OS notification dispatch for critical-tier items, then emits a Tauri event that the frontend listens to for updating the Zustand store and showing Sonner toasts. The notification center is a Popover anchored to a bell icon in the drawer handle area, displaying a reverse-chronological flat list with color-coded priority badges.

**Primary recommendation:** Follow the established Tauri command + event pattern already used throughout the codebase. The Rust command is the single entry point for all notification creation (both from backend event bus and frontend invoke), ensuring SQLite persistence happens regardless of source.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Bell icon with unread badge in the titlebar, clicking opens a dropdown/popover with notification history (reverse-chronological flat list)
- **D-02:** Notification items are actionable -- clicking navigates to the relevant project/phase/task (deep-link navigation)
- **D-03:** Bulk actions at the top of the popover: "Mark all as read" and "Clear all"
- **D-04:** Flat chronological list with color-coded priority badges -- no tabs or filters for v1
- **D-05:** Three tiers with channel mapping:
  - Critical = OS-native notification + in-app toast (Sonner) + history
  - Informational = in-app toast + history
  - Silent = history only
- **D-06:** Phase 20 builds the notification API with test/demo triggers only. Real event wiring deferred to Phase 21 agent per NOTIF-03
- **D-07:** User notification preferences (muting, disabling OS notifications) deferred to a future phase
- **D-08:** SQLite `notifications` table in existing element.db -- columns: id, title, body, priority, category, project_id, action_url, read, created_at
- **D-09:** Cap at 100 notifications, auto-prune oldest when limit hit
- **D-10:** Zustand slice caches active notification set in memory, SQLite is source of truth
- **D-11:** Primary invocation via Tauri event bus -- backend components emit `notification:create` events with typed `NotificationPayload` struct
- **D-12:** Frontend also has access via `invoke('create_notification', ...)` Rust command for UI-originated notifications
- **D-13:** Rust command handles persistence (SQLite write) regardless of notification source (event or invoke)
- **D-14:** Notification coalescing/grouping deferred -- individual notifications for v1

### Claude's Discretion
- OS notification permission handling (request at startup, fallback to in-app-only if denied)
- Exact popover dimensions and scroll behavior
- Notification ID generation strategy (UUID vs incremental)
- Sonner toast duration for informational notifications
- Internal event payload struct field naming

### Deferred Ideas (OUT OF SCOPE)
- Notification preferences UI (mute tiers, disable OS notifications)
- Notification coalescing/grouping
- Filter/tab by priority tier in the popover
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTIF-01 | OS-native desktop notifications for critical items (via tauri-plugin-notification) | `tauri-plugin-notification` 2.3.3 verified; builder pattern on Rust side, JS permission API; capabilities config documented |
| NOTIF-02 | In-app notification center with history and priority tiers (critical / informational / silent) | SQLite persistence with 100-item cap, Zustand slice pattern, Popover UI with shadcn/ui, Sonner toasts already configured |
| NOTIF-03 | Notifications are driven by the central AI agent, not individual project actions | Event-driven API via `notification:create` Tauri event + `create_notification` Rust command; Phase 20 builds API with test triggers, Phase 21 wires real agent events |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-notification (Rust crate) | 2.3.3 | OS-native desktop notifications from Rust backend | Official Tauri plugin, matches app's Tauri 2.10 version, builder pattern API |
| @tauri-apps/plugin-notification (npm) | 2.3.3 | JS API for permission checking (isPermissionGranted, requestPermission) | Official JS companion for the Rust plugin |
| sonner | 2.0.7 (already installed) | In-app toast notifications for critical + informational tiers | Already configured in `src/components/ui/sonner.tsx` with theme-aware styling and icon variants |
| @radix-ui/react-popover | 1.1.x | Popover primitive for notification center dropdown | shadcn/ui standard; project already uses Radix (slot, collapsible, context-menu, dropdown-menu) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (already installed) | Bell, BellDot icons for notification trigger button | Already used throughout app for all icons |
| zustand | (already installed) | Notification state slice | Established store pattern with 12 existing slices |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radix Popover via shadcn/ui | Custom dropdown with `position: absolute` | Popover handles positioning, focus trap, escape-to-close, click-outside automatically; hand-rolling loses these |
| UUID for notification IDs | SQLite AUTOINCREMENT | UUID matches all other models in codebase (projects, tasks, themes all use UUID v4); consistency wins |
| Sonner for toasts | react-hot-toast | Sonner already installed and configured; no reason to switch |

**Installation:**
```bash
# Rust -- add to src-tauri/Cargo.toml [dependencies]
# tauri-plugin-notification = "2"

# Frontend
npm install @tauri-apps/plugin-notification
npx shadcn@latest add popover
```

**Version verification:** `tauri-plugin-notification` 2.3.3 verified via crates.io (2026-03-29). `@tauri-apps/plugin-notification` 2.3.3 verified via npm registry. `sonner` 2.0.7 already in package.json.

## Architecture Patterns

### Recommended Project Structure
```
src-tauri/src/
  commands/
    notification_commands.rs    # Tauri commands: create, list, mark_read, clear, etc.
  models/
    notification.rs             # Notification struct, CreateNotificationInput, DB impl
  db/sql/
    011_notifications.sql       # Migration: notifications table

src/
  stores/
    notificationSlice.ts        # Zustand slice: notifications[], unreadCount, actions
  components/
    notifications/
      NotificationBell.tsx      # Bell icon + unread badge (mounted in drawer handle)
      NotificationPopover.tsx   # Popover content: header + list + bulk actions
      NotificationItem.tsx      # Single notification row with priority badge + action
  hooks/
    useNotificationEvents.ts    # Tauri event listener for notification:created events
```

### Pattern 1: Single-Entry-Point Notification Creation (Rust Command)
**What:** All notification creation flows through one Rust command (`create_notification`) that handles SQLite write, auto-prune, OS notification dispatch (for critical), and Tauri event emission.
**When to use:** Every notification creation -- whether from backend event bus or frontend invoke.
**Why:** Ensures persistence happens regardless of source. The Rust side is the only place that can call `tauri-plugin-notification` for OS-native notifications.
**Example:**
```rust
// src-tauri/src/commands/notification_commands.rs
#[tauri::command]
pub async fn create_notification(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
    title: String,
    body: String,
    priority: String,       // "critical" | "informational" | "silent"
    category: Option<String>,
    project_id: Option<String>,
    action_url: Option<String>,
) -> Result<Notification, String> {
    let db = state.lock().map_err(|e| e.to_string())?;

    let notification = db.create_notification(CreateNotificationInput {
        title: title.clone(),
        body: body.clone(),
        priority: priority.clone(),
        category,
        project_id,
        action_url,
    }).map_err(|e| e.to_string())?;

    // Auto-prune if over 100
    db.prune_notifications(100).map_err(|e| e.to_string())?;

    // OS notification for critical tier
    if priority == "critical" {
        let _ = app.notification()
            .builder()
            .title(&title)
            .body(&body)
            .show();
    }

    // Emit event for frontend to update store + show toast
    app.emit("notification:created", &notification)
        .map_err(|e| e.to_string())?;

    Ok(notification)
}
```

### Pattern 2: Backend Event Bus Listener (for Phase 21 agent integration)
**What:** A Tauri event listener on the Rust side that listens for `notification:create` events from other backend components (like the future orchestrator) and calls the same `create_notification` DB logic.
**When to use:** When backend components need to create notifications without going through the frontend.
**Example:**
```rust
// In app.setup() or a dedicated notification module
let app_handle = app.handle().clone();
app.listen("notification:create", move |event| {
    if let Ok(payload) = serde_json::from_str::<NotificationPayload>(event.payload()) {
        let db = app_handle.state::<Arc<Mutex<Database>>>();
        let db = db.lock().unwrap();
        if let Ok(notification) = db.create_notification(payload.into()) {
            let _ = db.prune_notifications(100);
            if payload.priority == "critical" {
                let _ = app_handle.notification()
                    .builder()
                    .title(&payload.title)
                    .body(&payload.body)
                    .show();
            }
            let _ = app_handle.emit("notification:created", &notification);
        }
    }
});
```

### Pattern 3: Frontend Event Subscription + Store Update
**What:** A React hook that listens for `notification:created` Tauri events and pushes to the Zustand notification slice, triggering Sonner toasts for critical/informational tiers.
**When to use:** In a top-level component (like `App.tsx`) to capture all notification events.
**Example:**
```typescript
// src/hooks/useNotificationEvents.ts
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { useNotificationStore } from "@/stores/notificationSlice";

export function useNotificationEvents() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    const unlisten = listen<Notification>("notification:created", (event) => {
      const notif = event.payload;
      addNotification(notif);

      // Show toast for critical and informational
      if (notif.priority === "critical") {
        toast.error(notif.title, { description: notif.body, duration: 8000 });
      } else if (notif.priority === "informational") {
        toast.info(notif.title, { description: notif.body, duration: 4000 });
      }
      // silent = no toast, just added to store
    });

    return () => { unlisten.then((fn) => fn()); };
  }, [addNotification]);
}
```

### Anti-Patterns to Avoid
- **Frontend-only notification persistence:** Do NOT store notifications only in Zustand/memory. SQLite is the source of truth. Notifications must survive app restart.
- **Separate code paths for OS vs in-app:** Do NOT have the frontend call `sendNotification()` JS API for OS notifications and separately create in-app notifications. The Rust command is the single entry point that handles both.
- **Polling for new notifications:** Do NOT poll `list_notifications` on an interval. Use the event-driven `notification:created` listener pattern (same as existing `useTauriEvents` hook).
- **Inline notification logic in other commands:** Do NOT add notification creation logic inside `phase_commands.rs` or `task_commands.rs`. Notifications are created only via the notification API. Phase 21 will wire events through it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OS-native notifications | Custom FFI to macOS/Windows notification APIs | `tauri-plugin-notification` 2.3.3 | Handles cross-platform differences, permission flows, macOS notification center integration |
| Popover positioning & focus management | Custom absolute positioning + click-outside detection | shadcn/ui Popover (Radix) | Handles viewport edge detection, focus trap, escape key, scroll lock, portaling |
| Toast notifications | Custom toast component with animations | Sonner (already installed) | Already configured with theme-aware styling, stacking, auto-dismiss, icon variants |
| Permission request flow | Custom macOS permission dialogs | `isPermissionGranted()` + `requestPermission()` from `@tauri-apps/plugin-notification` | Platform-native permission prompts |

**Key insight:** The notification system is fundamentally a persistence layer (SQLite) + two delivery channels (OS native, Sonner toast) + a read model (Zustand slice + Popover UI). Each piece has a well-tested library solution. The custom code is only the glue between them.

## Common Pitfalls

### Pitfall 1: macOS Notification Permission Denied Silently
**What goes wrong:** `app.notification().builder().show()` silently fails on macOS if the app lacks notification permission. No error is thrown.
**Why it happens:** macOS requires explicit permission. In development builds, the permission prompt may not appear or may have been denied previously.
**How to avoid:** Call `isPermissionGranted()` from JS at app startup. If not granted, call `requestPermission()`. Store the result. If denied, skip OS notifications and rely on in-app toasts only. Log a warning.
**Warning signs:** OS notifications work in development but not in production builds, or vice versa.

### Pitfall 2: Capabilities Permission Missing
**What goes wrong:** `tauri-plugin-notification` is installed but `notification:default` is not added to `src-tauri/capabilities/default.json`. The plugin silently fails or throws a permission error at runtime.
**Why it happens:** Tauri 2.x requires explicit capability declarations for all plugin permissions.
**How to avoid:** Add `"notification:default"` to the permissions array in `src-tauri/capabilities/default.json` during plugin setup. Test immediately after adding.
**Warning signs:** Runtime errors mentioning "permission" or "capability" when trying to send notifications.

### Pitfall 3: Notification Store Diverges from SQLite
**What goes wrong:** Zustand store shows different notifications than SQLite. Happens when notifications are created while the app is starting up (before the event listener mounts) or if the listener misses events.
**Why it happens:** The Zustand slice is populated by events, but events can be missed during initialization race conditions.
**How to avoid:** Load initial notification list from SQLite on app startup via `list_notifications` Tauri command. The event listener only handles incremental updates after that initial load. This is the same pattern used for projects/tasks in `useTauriEvents`.
**Warning signs:** Badge count is wrong after app restart; notifications appear in popover but not in toast, or vice versa.

### Pitfall 4: SQLite Lock Contention on Notification Prune
**What goes wrong:** The `prune_notifications(100)` call on every notification creation holds the mutex while doing a DELETE + COUNT query, blocking other commands.
**Why it happens:** Notification creation is more frequent than other DB operations, especially once the agent is active.
**How to avoid:** Prune only when count exceeds threshold (e.g., prune when > 110 to batch deletes). Or prune in a separate async task, not in the hot path. The lock duration for a simple DELETE WHERE id IN (subquery) is negligible for 100 rows, so this is LOW risk but worth noting.
**Warning signs:** Occasional UI lag when many notifications are created in quick succession.

### Pitfall 5: Popover Component Not Available
**What goes wrong:** The shadcn/ui Popover component is not yet in the project. Attempting to import it fails.
**Why it happens:** The project has shadcn/ui but only the components that have been explicitly added. Popover must be installed via `npx shadcn@latest add popover`.
**How to avoid:** Install Popover as the first task. It will add `@radix-ui/react-popover` to package.json and create `src/components/ui/popover.tsx`.
**Warning signs:** Import errors for `@/components/ui/popover`.

## Code Examples

### SQLite Migration (011_notifications.sql)
```sql
-- Migration 011: Notification system
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'informational'
        CHECK(priority IN ('critical', 'informational', 'silent')),
    category TEXT,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    action_url TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_project_id ON notifications(project_id);
```

### Rust Notification Model
```rust
// src-tauri/src/models/notification.rs
use serde::{Deserialize, Serialize};
use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub body: String,
    pub priority: String,
    pub category: Option<String>,
    pub project_id: Option<String>,
    pub action_url: Option<String>,
    pub read: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNotificationInput {
    pub title: String,
    pub body: String,
    pub priority: String,
    pub category: Option<String>,
    pub project_id: Option<String>,
    pub action_url: Option<String>,
}

impl Database {
    pub fn create_notification(&self, input: CreateNotificationInput) -> Result<Notification, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO notifications (id, title, body, priority, category, project_id, action_url, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![id, input.title, input.body, input.priority, input.category, input.project_id, input.action_url, now],
        )?;
        Ok(Notification {
            id,
            title: input.title,
            body: input.body,
            priority: input.priority,
            category: input.category,
            project_id: input.project_id,
            action_url: input.action_url,
            read: false,
            created_at: now,
        })
    }

    pub fn list_notifications(&self) -> Result<Vec<Notification>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, body, priority, category, project_id, action_url, read, created_at FROM notifications ORDER BY created_at DESC LIMIT 100"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Notification {
                id: row.get(0)?,
                title: row.get(1)?,
                body: row.get(2)?,
                priority: row.get(3)?,
                category: row.get(4)?,
                project_id: row.get(5)?,
                action_url: row.get(6)?,
                read: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
            })
        })?;
        rows.collect()
    }

    pub fn mark_notification_read(&self, id: &str) -> Result<(), rusqlite::Error> {
        self.conn.execute("UPDATE notifications SET read = 1 WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn mark_all_notifications_read(&self) -> Result<(), rusqlite::Error> {
        self.conn.execute("UPDATE notifications SET read = 0 WHERE read = 1", [])?;
        Ok(())
    }

    pub fn clear_all_notifications(&self) -> Result<(), rusqlite::Error> {
        self.conn.execute("DELETE FROM notifications", [])?;
        Ok(())
    }

    pub fn prune_notifications(&self, max_count: i64) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            "DELETE FROM notifications WHERE id IN (SELECT id FROM notifications ORDER BY created_at DESC LIMIT -1 OFFSET ?1)",
            [max_count],
        )?;
        Ok(())
    }

    pub fn get_unread_count(&self) -> Result<i64, rusqlite::Error> {
        self.conn.query_row("SELECT COUNT(*) FROM notifications WHERE read = 0", [], |row| row.get(0))
    }
}
```

### Zustand Notification Slice
```typescript
// src/stores/notificationSlice.ts
import { StateCreator } from "zustand";
import { api } from "@/lib/tauri";

export interface Notification {
  id: string;
  title: string;
  body: string;
  priority: "critical" | "informational" | "silent";
  category: string | null;
  projectId: string | null;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationSlice {
  notifications: Notification[];
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

export const createNotificationSlice: StateCreator<NotificationSlice> = (set, get) => ({
  notifications: [],
  unreadCount: 0,

  loadNotifications: async () => {
    const notifications = await api.listNotifications();
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 100),
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    }));
  },

  markRead: async (id) => {
    await api.markNotificationRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await api.markAllNotificationsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearAll: async () => {
    await api.clearAllNotifications();
    set({ notifications: [], unreadCount: 0 });
  },
});
```

### NotificationBell Component
```typescript
// src/components/notifications/NotificationBell.tsx
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationPopover } from "./NotificationPopover";
import { useStore } from "@/stores"; // after adding notificationSlice

export function NotificationBell() {
  const unreadCount = useStore((s) => s.unreadCount);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationPopover />
      </PopoverContent>
    </Popover>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tauri-plugin-notification` 2.0 | `tauri-plugin-notification` 2.3.3 | Late 2025 | Minor API stability improvements; same builder pattern |
| Custom notification permission handling | Plugin-provided `isPermissionGranted()` + `requestPermission()` | Tauri 2.0 | No need to call macOS APIs directly |
| Separate Rust/JS notification paths | Single Rust command + event pattern | Tauri 2.x best practice | One code path for persistence + dispatch |

**Deprecated/outdated:**
- `tauri-plugin-notifications` (community, 0.4.3): Do NOT use. This is the community plugin with push notification support. Element is desktop-only and should use the official `tauri-plugin-notification` (no 's').
- JS-only `sendNotification()` for creating notifications: The JS API should only be used for permission checking. Actual notification creation goes through Rust commands for persistence.

## Open Questions

1. **Bell icon placement**
   - What we know: CONTEXT says "titlebar" but the app has no traditional titlebar -- it uses a Sidebar + CenterPanel + OutputDrawer layout. The drawer handle bar has the Logs/History/Terminal tabs.
   - What's unclear: Exact placement of the bell icon. The drawer handle area is the closest to a "titlebar" concept.
   - Recommendation: Place bell icon in the drawer handle area (the `ResizableHandle` bar in `AppLayout.tsx`), to the right of the tab buttons. This is visible regardless of which panel is active and is near the existing UI controls.

2. **Deep-link navigation action_url format**
   - What we know: D-02 says clicking navigates to relevant project/phase/task.
   - What's unclear: The exact format of action_url strings.
   - Recommendation: Use internal route-style strings: `project/{id}`, `project/{id}/phase/{id}`, `project/{id}/task/{id}`. Parse on click to call existing `selectProject`, `selectPhase`, `setSelectedTaskId` store actions. No actual router needed -- just store state changes.

3. **Sonner toast duration**
   - What we know: Critical notifications should be attention-getting, informational should be brief.
   - Recommendation: Critical = 8 seconds with `toast.error()`, Informational = 4 seconds with `toast.info()`, Silent = no toast. These are reasonable defaults that can be adjusted.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | vite.config.ts (Vitest configured via Vite) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTIF-01 | OS-native notifications fire for critical tier | manual-only | N/A -- requires OS notification center observation | N/A |
| NOTIF-01 | Permission check/request flow | unit (mock) | `npx vitest run src/hooks/useNotificationPermission.test.ts` | Wave 0 |
| NOTIF-02 | Notification slice: add, markRead, markAllRead, clearAll | unit | `npx vitest run src/stores/notificationSlice.test.ts` | Wave 0 |
| NOTIF-02 | NotificationBell renders badge count | unit | `npx vitest run src/components/notifications/NotificationBell.test.tsx` | Wave 0 |
| NOTIF-02 | NotificationPopover renders list, handles actions | unit | `npx vitest run src/components/notifications/NotificationPopover.test.tsx` | Wave 0 |
| NOTIF-02 | Priority badge color mapping (critical=red, info=blue, silent=gray) | unit | `npx vitest run src/components/notifications/NotificationItem.test.tsx` | Wave 0 |
| NOTIF-03 | create_notification Tauri command persists and emits event | integration (Rust) | `cargo test --manifest-path src-tauri/Cargo.toml test_create_notification` | Wave 0 |
| NOTIF-03 | Event listener updates Zustand store on notification:created | unit | `npx vitest run src/hooks/useNotificationEvents.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/stores/notificationSlice.test.ts` -- covers NOTIF-02 store logic
- [ ] `src/components/notifications/NotificationBell.test.tsx` -- covers NOTIF-02 badge rendering
- [ ] `src/components/notifications/NotificationPopover.test.tsx` -- covers NOTIF-02 list and actions
- [ ] `src/components/notifications/NotificationItem.test.tsx` -- covers NOTIF-02 priority badges
- [ ] `src/hooks/useNotificationEvents.test.ts` -- covers NOTIF-03 event listener
- [ ] Rust test for notification DB operations (create, list, prune, mark_read)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| tauri-plugin-notification (crate) | NOTIF-01 | Not yet installed | 2.3.3 (target) | Install during setup task |
| @tauri-apps/plugin-notification (npm) | NOTIF-01 permission API | Not yet installed | 2.3.3 (target) | Install during setup task |
| shadcn/ui Popover | NOTIF-02 bell dropdown | Not yet installed | -- | `npx shadcn@latest add popover` |
| sonner | NOTIF-02 in-app toasts | Installed | 2.0.7 | -- |
| @tauri-apps/api | Tauri event system | Installed | 2.10.1 | -- |
| Zustand | State management | Installed | (in package.json) | -- |
| rusqlite | SQLite persistence | Installed | 0.32 | -- |

**Missing dependencies with no fallback:**
- None -- all missing items are installable via standard package managers

**Missing dependencies with fallback:**
- None -- all items should be installed directly

## Sources

### Primary (HIGH confidence)
- [Tauri Notification Plugin docs](https://v2.tauri.app/plugin/notification/) - installation, Rust builder API, JS permission API, capabilities config
- crates.io `tauri-plugin-notification` 2.3.3 - verified current version
- npm registry `@tauri-apps/plugin-notification` 2.3.3 - verified current version
- Existing codebase: `src/components/ui/sonner.tsx`, `src/hooks/useTauriEvents.ts`, `src/stores/index.ts`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/theme_commands.rs` - established patterns for commands, events, stores, toasts

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` - notification architecture design from project research phase
- `.planning/research/STACK.md` - stack evaluation for notification plugin
- `.planning/research/FEATURES.md` - feature spec and notification categories

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries verified against npm/crates.io registries; Sonner already installed and working
- Architecture: HIGH - follows established codebase patterns (commands, events, Zustand slices, SQLite migrations); no novel patterns required
- Pitfalls: HIGH - based on direct codebase inspection (missing popover, capabilities config requirement, initialization race condition)

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable -- Tauri 2.x plugin ecosystem is mature, no breaking changes expected)
