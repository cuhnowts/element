import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { toast } from "sonner";
import type { Notification } from "@/lib/types";
import { useStore } from "@/stores";

export function useNotificationEvents() {
  const addNotification = useStore((s) => s.addNotification);
  const loadNotifications = useStore((s) => s.loadNotifications);

  // Load initial notifications from SQLite on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Listen for new notifications from backend
  useEffect(() => {
    const unlisten = listen<Notification>("notification:created", (event) => {
      const notif = event.payload;
      addNotification(notif);

      if (notif.priority === "critical") {
        toast.error(notif.title, { description: notif.body, duration: 8000 });
      } else if (notif.priority === "informational") {
        toast.info(notif.title, { description: notif.body, duration: 4000 });
      }
      // silent = no toast, just added to store
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addNotification]);

  // Listen for bulk state changes from backend
  useEffect(() => {
    const unlistenAllRead = listen("notifications:all-read", () => {
      useStore.setState((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    });
    const unlistenCleared = listen("notifications:cleared", () => {
      useStore.setState({ notifications: [], unreadCount: 0 });
    });

    return () => {
      unlistenAllRead.then((fn) => fn());
      unlistenCleared.then((fn) => fn());
    };
  }, []);
}
