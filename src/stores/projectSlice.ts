import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { Project } from "../lib/types";
import type { AppStore } from "./index";
import { useWorkspaceStore } from "./useWorkspaceStore";
import { toast } from "sonner";

export interface ProjectSlice {
  projects: Project[];
  selectedProjectId: string | null;
  projectsLoading: boolean;
  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  selectProject: (projectId: string | null) => void;
  linkDirectory: (projectId: string, directoryPath: string) => Promise<void>;
  updateProjectAiMode: (projectId: string, aiMode: string) => Promise<void>;
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
  },
  updateProjectAiMode: async (projectId, aiMode) => {
    // Optimistic update
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, aiMode } : p
      ),
    }));
    try {
      await api.updateProjectAiMode(projectId, aiMode);
    } catch (e) {
      // Revert on failure
      const projects = await api.listProjects();
      set({ projects });
      toast.error("Failed to update AI mode");
    }
  },
});
