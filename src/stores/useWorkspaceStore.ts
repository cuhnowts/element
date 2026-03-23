import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DrawerTab = "logs" | "history" | "runs" | "terminal";

interface WorkspaceState {
  drawerHeight: number;       // percentage (0-100)
  drawerOpen: boolean;
  calendarVisible: boolean;
  selectedTaskId: string | null;

  // Terminal/drawer tab state
  activeDrawerTab: DrawerTab;
  hasAutoOpenedTerminal: boolean;  // session-only, per D-03

  setDrawerHeight: (height: number) => void;
  toggleDrawer: () => void;
  toggleCalendar: () => void;
  selectTask: (id: string | null) => void;

  // Terminal/drawer actions
  setActiveDrawerTab: (tab: DrawerTab) => void;
  openDrawerToTab: (tab: DrawerTab) => void;
  openTerminal: () => void;
  markTerminalAutoOpened: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      drawerHeight: 30,
      drawerOpen: true,
      calendarVisible: true,
      selectedTaskId: null,
      activeDrawerTab: "logs",
      hasAutoOpenedTerminal: false,

      setDrawerHeight: (height) => set({ drawerHeight: height }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
      toggleCalendar: () => set((s) => ({ calendarVisible: !s.calendarVisible })),
      selectTask: (id) => set({ selectedTaskId: id }),

      setActiveDrawerTab: (tab) => set({ activeDrawerTab: tab }),
      openDrawerToTab: (tab) => set({ drawerOpen: true, activeDrawerTab: tab }),
      openTerminal: () => set({ drawerOpen: true, activeDrawerTab: "terminal" }),
      markTerminalAutoOpened: () => set({ hasAutoOpenedTerminal: true }),
    }),
    {
      name: "element-workspace",
      partialize: (state) => ({
        drawerHeight: state.drawerHeight,
        drawerOpen: state.drawerOpen,
        calendarVisible: state.calendarVisible,
        // Do NOT persist selectedTaskId -- task may not exist on next launch
        // Do NOT persist activeDrawerTab or hasAutoOpenedTerminal -- session-only state
      }),
    }
  )
);
