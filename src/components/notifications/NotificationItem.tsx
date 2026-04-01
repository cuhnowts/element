import type { Notification } from "@/lib/types";

interface NotificationItemProps {
  notification: Notification;
  onNavigate: (actionUrl: string) => void;
  onMarkRead: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  return new Date(dateStr).toLocaleDateString();
}

const priorityBadgeStyles: Record<
  Notification["priority"],
  string
> = {
  critical: "bg-destructive text-destructive-foreground",
  informational: "bg-[var(--chart-2,theme(colors.teal.600))] text-foreground",
  silent: "bg-muted text-muted-foreground",
};

const priorityLabels: Record<Notification["priority"], string> = {
  critical: "Critical",
  informational: "Info",
  silent: "Silent",
};

export function NotificationItem({
  notification,
  onNavigate,
  onMarkRead,
}: NotificationItemProps) {
  const isUnread = !notification.read;

  const handleClick = () => {
    if (isUnread) {
      onMarkRead(notification.id);
    }
    if (notification.actionUrl) {
      onNavigate(notification.actionUrl);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`flex items-start gap-2 px-3 py-2 border-b border-border hover:bg-muted cursor-pointer ${
        isUnread ? "border-l-2 border-destructive bg-muted/50" : ""
      }`}
    >
      {/* Priority badge */}
      <span
        className={`shrink-0 mt-1 rounded-full px-1.5 py-0.5 text-[12px] font-semibold leading-tight ${
          priorityBadgeStyles[notification.priority]
        }`}
      >
        {priorityLabels[notification.priority]}
      </span>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${!isUnread ? "opacity-70" : ""}`}>
        <p className="text-sm font-semibold truncate">{notification.title}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.body}
        </p>
      </div>

      {/* Timestamp */}
      <span className="shrink-0 text-xs text-muted-foreground mt-0.5">
        {formatRelativeTime(notification.createdAt)}
      </span>
    </div>
  );
}
