import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { Notification } from "../lib/types";
import type { AppStore } from "./index";

export interface NotificationSlice {
  notifications: Notification[];
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

export const createNotificationSlice: StateCreator<AppStore, [], [], NotificationSlice> = (
  set,
) => ({
  notifications: [],
  unreadCount: 0,

  loadNotifications: async () => {
    const notifications = await api.listNotifications();
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    if (!notification) return;
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 100),
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    }));
  },

  markRead: async (id) => {
    await api.markNotificationRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
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
