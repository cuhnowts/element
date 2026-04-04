import { useStore } from "@/stores";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useHubChatStore } from "@/stores/useHubChatStore";
import { NotificationItem } from "./NotificationItem";

export function NotificationPopover() {
  const notifications = useStore((s) => s.notifications);
  const unreadCount = useStore((s) => s.unreadCount);
  const markAllRead = useStore((s) => s.markAllRead);
  const clearAll = useStore((s) => s.clearAll);
  const markRead = useStore((s) => s.markRead);
  const selectProject = useStore((s) => s.selectProject);

  const navigateToHub = useStore((s) => s.navigateToHub);

  const handleNavigate = (actionUrl: string) => {
    // Handle hub:// deep links (e.g., hub://chat?context=risk&id=...)
    if (actionUrl.startsWith("hub://chat?context=risk")) {
      // Find the notification that triggered this to get the body text
      const params = new URLSearchParams(actionUrl.split("?")[1]);
      const riskId = params.get("id");
      const notif = notifications.find(
        (n) => n.actionUrl === actionUrl,
      );
      const riskContext = notif
        ? `[Risk context] ${notif.title}: ${notif.body}`
        : `[Risk context] Risk ID: ${riskId}`;

      // Inject risk context as a system message into hub chat
      useHubChatStore.getState().addUserMessage(riskContext);

      // Navigate to hub view
      navigateToHub();
      return;
    }

    // Parse actionUrl patterns for deep-link navigation
    const projectMatch = actionUrl.match(/^project\/([^/]+)$/);
    const taskMatch = actionUrl.match(/^project\/([^/]+)\/task\/([^/]+)$/);

    if (taskMatch) {
      selectProject(taskMatch[1]);
      useWorkspaceStore.getState().selectTask(taskMatch[2]);
    } else if (projectMatch) {
      selectProject(projectMatch[1]);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <p className="text-sm font-semibold">No notifications</p>
        <p className="text-sm text-muted-foreground text-center mt-1">
          You're all caught up. Notifications from your projects will appear
          here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => markAllRead()}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Mark all as read
          </button>
          <button
            type="button"
            onClick={() => clearAll()}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.map((notif) => (
          <NotificationItem
            key={notif.id}
            notification={notif}
            onNavigate={handleNavigate}
            onMarkRead={markRead}
          />
        ))}
      </div>
    </div>
  );
}
