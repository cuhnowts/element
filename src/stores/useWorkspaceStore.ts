import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DrawerTab = "logs" | "history" | "runs" | "terminal";

export interface ProjectWorkspaceState {
  centerTab: "detail" | "files";
  drawerOpen: boolean;
  drawerTab: DrawerTab;
}

const DEFAULT_PROJECT_STATE: ProjectWorkspaceState = {
  centerTab: "detail",
  drawerOpen: true,
  drawerTab: "logs",
};

interface WorkspaceState {
  drawerHeight: number;       // percentage (0-100)
  drawerOpen: boolean;
  calendarVisible: boolean;
  selectedTaskId: string | null;

  // Terminal/drawer tab state
  activeDrawerTab: DrawerTab;
  hasAutoOpenedTerminal: boolean;  // session-only, per D-03

  // Per-project workspace state (session-only, not persisted)
  projectStates: Record<string, ProjectWorkspaceState>;
  getProjectState: (projectId: string) => ProjectWorkspaceState;
  setProjectCenterTab: (projectId: string, tab: "detail" | "files") => void;
  setProjectDrawerState: (projectId: string, drawerOpen: boolean, drawerTab: DrawerTab) => void;
  saveCurrentProjectState: (projectId: string) => void;
  restoreProjectState: (projectId: string) => void;

  // Terminal kill/respawn support (D-02)
  terminalSessionKey: number;
  terminalInitialCommand: { command: string; args: string[] } | null;
  launchTerminalCommand: (command: string, args: string[]) => void;

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
    (set, get) => ({
      drawerHeight: 40,
      drawerOpen: true,
      calendarVisible: true,
      selectedTaskId: null,
      activeDrawerTab: "logs" as DrawerTab,
      hasAutoOpenedTerminal: false,

      // Per-project workspace state (session-only)
      projectStates: {},
      getProjectState: (projectId: string): ProjectWorkspaceState => {
        return get().projectStates[projectId] ?? DEFAULT_PROJECT_STATE;
      },
      setProjectCenterTab: (projectId: string, tab: "detail" | "files") => {
        set((s) => ({
          projectStates: {
            ...s.projectStates,
            [projectId]: {
              ...(s.projectStates[projectId] ?? DEFAULT_PROJECT_STATE),
              centerTab: tab,
            },
          },
        }));
      },
      setProjectDrawerState: (projectId: string, drawerOpen: boolean, drawerTab: DrawerTab) => {
        set((s) => ({
          projectStates: {
            ...s.projectStates,
            [projectId]: {
              ...(s.projectStates[projectId] ?? DEFAULT_PROJECT_STATE),
              drawerOpen,
              drawerTab,
            },
          },
        }));
      },
      saveCurrentProjectState: (projectId: string) => {
        const state = get();
        set((s) => ({
          projectStates: {
            ...s.projectStates,
            [projectId]: {
              centerTab: (s.projectStates[projectId]?.centerTab ?? DEFAULT_PROJECT_STATE.centerTab),
              drawerOpen: state.drawerOpen,
              drawerTab: state.activeDrawerTab,
            },
          },
        }));
      },
      restoreProjectState: (projectId: string) => {
        const projectState = get().projectStates[projectId] ?? DEFAULT_PROJECT_STATE;
        set({
          drawerOpen: projectState.drawerOpen,
          activeDrawerTab: projectState.drawerTab,
        });
      },

      // Terminal kill/respawn (D-02)
      terminalSessionKey: 0,
      terminalInitialCommand: null,
      launchTerminalCommand: (command: string, args: string[]) => {
        set((s) => ({
          terminalInitialCommand: { command, args },
          terminalSessionKey: s.terminalSessionKey + 1,
          drawerOpen: true,
          activeDrawerTab: "terminal" as DrawerTab,
        }));
      },

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
        // Do NOT persist projectStates, terminalSessionKey, terminalInitialCommand -- session-only (D-14)
      }),
    }
  )
);
