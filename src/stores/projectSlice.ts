import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { Project } from "../lib/types";
import type { AppStore } from "./index";
import { useWorkspaceStore } from "./useWorkspaceStore";
import { useTerminalSessionStore } from "./useTerminalSessionStore";

export interface ProjectSlice {
  projects: Project[];
  selectedProjectId: string | null;
  projectsLoading: boolean;
  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  selectProject: (projectId: string | null) => void;
  linkDirectory: (projectId: string, directoryPath: string) => Promise<void>;
}

export const createProjectSlice: StateCreator<
  AppStore,
  [],
  [],
  ProjectSlice
> = (set, _get) => ({
  projects: [],
  selectedProjectId: null,
  projectsLoading: false,
  loadProjects: async () => {
    set({ projectsLoading: true });
    const projects = await api.listProjects();
    set({ projects, projectsLoading: false });
  },
  createProject: async (name, description) => {
    const project = await api.createProject(name, description);
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },
  deleteProject: async (projectId) => {
    // Kill all terminal sessions for this project first (D-11)
    useTerminalSessionStore.getState().removeAllForProject(projectId);
    await api.deleteProject(projectId);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== projectId),
      selectedProjectId:
        s.selectedProjectId === projectId ? null : s.selectedProjectId,
    }));
  },
  selectProject: (projectId) => {
    set({ selectedProjectId: projectId, selectedTaskId: null, selectedThemeId: null });
    useWorkspaceStore.getState().selectTask(null);
  },
  linkDirectory: async (projectId, directoryPath) => {
    const project = await api.linkProjectDirectory(projectId, directoryPath);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? project : p)),
    }));

    // Auto-sync: if .planning/ROADMAP.md exists, sync phases/tasks and set GSD tier
    try {
      await api.syncPlanningRoadmap(projectId, directoryPath);
      // If sync succeeded, this is a GSD project — set tier to "full"
      if (!project.planningTier) {
        const updated = await api.setPlanningTier(projectId, "full");
        set((s) => ({
          projects: s.projects.map((p) => (p.id === projectId ? updated : p)),
        }));
      }
      // Start the planning watcher for live sync
      await api.startPlanningWatcher(projectId, directoryPath);
    } catch {
      // No .planning/ROADMAP.md or parse failed — not a GSD project, that's fine
    }
  },
});
