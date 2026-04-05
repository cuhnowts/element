import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DrawerTab = "elementai" | "logs" | "history" | "runs" | "terminal";

export interface HubLayout {
  goalsPanelSize: number;
  centerPanelSize: number;
  calendarPanelSize: number;
  goalsCollapsed: boolean;
  calendarCollapsed: boolean;
}

const DEFAULT_HUB_LAYOUT: HubLayout = {
  goalsPanelSize: 25,
  centerPanelSize: 50,
  calendarPanelSize: 25,
  goalsCollapsed: false,
  calendarCollapsed: false,
};

export interface ProjectWorkspaceState {
  centerTab: "detail" | "files";
  drawerOpen: boolean;
  drawerTab: DrawerTab;
}

const DEFAULT_PROJECT_STATE: ProjectWorkspaceState = {
  centerTab: "detail",
  drawerOpen: true,
  drawerTab: "terminal",
};

interface WorkspaceState {
  drawerHeight: number;       // percentage (0-100)
  drawerOpen: boolean;
  calendarVisible: boolean;
  selectedTaskId: string | null;

  // Theme collapse state (persisted)
  themeCollapseState: Record<string, boolean>;
  setThemeExpanded: (themeId: string, expanded: boolean) => void;
  isThemeExpanded: (themeId: string) => boolean;

  // Workflow collapse state (persisted)
  workflowsCollapsed: boolean;
  toggleWorkflows: () => void;

  // Hub layout state (persisted)
  hubLayout: HubLayout;
  setHubLayout: (partial: Partial<HubLayout>) => void;

  // Hub panel overlay toggles (session-only, not persisted per D-10)
  hubCalendarOpen: boolean;
  hubGoalsOpen: boolean;
  toggleHubCalendar: () => void;
  toggleHubGoals: () => void;

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
      // Hub panel overlay toggles (session-only, not persisted per D-10)
      hubCalendarOpen: false,
      hubGoalsOpen: false,
      toggleHubCalendar: () => set((s) => ({ hubCalendarOpen: !s.hubCalendarOpen })),
      toggleHubGoals: () => set((s) => ({ hubGoalsOpen: !s.hubGoalsOpen })),

      activeDrawerTab: "terminal" as DrawerTab,
      hasAutoOpenedTerminal: false,

      // Hub layout state (persisted)
      hubLayout: { ...DEFAULT_HUB_LAYOUT },
      setHubLayout: (partial) => {
        set((s) => ({
          hubLayout: { ...s.hubLayout, ...partial },
        }));
      },

      // Theme collapse state (persisted)
      themeCollapseState: {},
      setThemeExpanded: (themeId: string, expanded: boolean) => {
        set((s) => ({
          themeCollapseState: { ...s.themeCollapseState, [themeId]: expanded },
        }));
      },
      isThemeExpanded: (themeId: string): boolean => {
        const state = get().themeCollapseState[themeId];
        return state === undefined ? true : state;
      },

      // Workflow collapse state (persisted) -- default collapsed per D-09
      workflowsCollapsed: true,
      toggleWorkflows: () => set((s) => ({ workflowsCollapsed: !s.workflowsCollapsed })),

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
        themeCollapseState: state.themeCollapseState,
        hubLayout: state.hubLayout,
        workflowsCollapsed: state.workflowsCollapsed,
        // Do NOT persist selectedTaskId -- task may not exist on next launch
        // Do NOT persist activeDrawerTab or hasAutoOpenedTerminal -- session-only state
        // Do NOT persist projectStates -- session-only (D-14)
      }),
    }
  )
);
