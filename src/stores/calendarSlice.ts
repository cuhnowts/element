import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { CalendarAccount, CalendarEvent } from "../lib/types";
import type { ProjectSlice } from "./projectSlice";
import type { TaskSlice } from "./taskSlice";
import type { UiSlice } from "./uiSlice";
import type { PluginSlice } from "./pluginSlice";
import type { CredentialSlice } from "./credentialSlice";

export interface CalendarSlice {
  calendarAccounts: CalendarAccount[];
  calendarEvents: CalendarEvent[];
  calendarSyncing: boolean;
  calendarError: string | null;
  fetchCalendarAccounts: () => Promise<void>;
  connectGoogleCalendar: () => Promise<void>;
  connectOutlookCalendar: () => Promise<void>;
  syncCalendar: (accountId: string) => Promise<void>;
  syncAllCalendars: () => Promise<void>;
  disconnectCalendar: (accountId: string) => Promise<void>;
  fetchCalendarEvents: (start: string, end: string) => Promise<void>;
}

export const createCalendarSlice: StateCreator<
  ProjectSlice &
    TaskSlice &
    UiSlice &
    PluginSlice &
    CredentialSlice &
    CalendarSlice,
  [],
  [],
  CalendarSlice
> = (set, get) => ({
  calendarAccounts: [],
  calendarEvents: [],
  calendarSyncing: false,
  calendarError: null,
  fetchCalendarAccounts: async () => {
    try {
      const calendarAccounts = await api.listCalendarAccounts();
      set({ calendarAccounts, calendarError: null });
    } catch (e) {
      set({
        calendarError: e instanceof Error ? e.message : String(e),
      });
    }
  },
  connectGoogleCalendar: async () => {
    set({ calendarSyncing: true, calendarError: null });
    try {
      await api.connectGoogleCalendar();
      await get().fetchCalendarAccounts();
    } catch (e) {
      set({
        calendarError: e instanceof Error ? e.message : String(e),
      });
    } finally {
      set({ calendarSyncing: false });
    }
  },
  connectOutlookCalendar: async () => {
    set({ calendarSyncing: true, calendarError: null });
    try {
      await api.connectOutlookCalendar();
      await get().fetchCalendarAccounts();
    } catch (e) {
      set({
        calendarError: e instanceof Error ? e.message : String(e),
      });
    } finally {
      set({ calendarSyncing: false });
    }
  },
  syncCalendar: async (accountId) => {
    set({ calendarSyncing: true, calendarError: null });
    try {
      await api.syncCalendar(accountId);
      await get().fetchCalendarAccounts();
    } catch (e) {
      set({
        calendarError: e instanceof Error ? e.message : String(e),
      });
    } finally {
      set({ calendarSyncing: false });
    }
  },
  syncAllCalendars: async () => {
    set({ calendarSyncing: true, calendarError: null });
    try {
      await api.syncAllCalendars();
      await get().fetchCalendarAccounts();
    } catch (e) {
      set({
        calendarError: e instanceof Error ? e.message : String(e),
      });
    } finally {
      set({ calendarSyncing: false });
    }
  },
  disconnectCalendar: async (accountId) => {
    try {
      await api.disconnectCalendar(accountId);
      set((s) => ({
        calendarAccounts: s.calendarAccounts.filter((a) => a.id !== accountId),
        calendarEvents: s.calendarEvents.filter(
          (e) => e.accountId !== accountId,
        ),
        calendarError: null,
      }));
    } catch (e) {
      set({
        calendarError: e instanceof Error ? e.message : String(e),
      });
    }
  },
  fetchCalendarEvents: async (start, end) => {
    try {
      const calendarEvents = await api.listCalendarEvents(start, end);
      set({ calendarEvents, calendarError: null });
    } catch (e) {
      set({
        calendarError: e instanceof Error ? e.message : String(e),
      });
    }
  },
});
