import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceState {
  drawerHeight: number;       // percentage (0-100)
  drawerOpen: boolean;
  calendarVisible: boolean;
  selectedTaskId: string | null;

  setDrawerHeight: (height: number) => void;
  toggleDrawer: () => void;
  toggleCalendar: () => void;
  selectTask: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      drawerHeight: 30,
      drawerOpen: true,
      calendarVisible: true,
      selectedTaskId: null,

      setDrawerHeight: (height) => set({ drawerHeight: height }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
      toggleCalendar: () => set((s) => ({ calendarVisible: !s.calendarVisible })),
      selectTask: (id) => set({ selectedTaskId: id }),
    }),
    {
      name: "element-workspace",
      partialize: (state) => ({
        drawerHeight: state.drawerHeight,
        drawerOpen: state.drawerOpen,
        calendarVisible: state.calendarVisible,
        // Do NOT persist selectedTaskId -- task may not exist on next launch
      }),
    }
  )
);
