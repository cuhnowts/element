import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { Theme } from "../lib/types";
import type { AppStore } from "./index";

export interface ThemeSlice {
  themes: Theme[];
  themesLoading: boolean;
  loadThemes: () => Promise<void>;
  createTheme: (name: string, color: string) => Promise<Theme>;
  updateTheme: (id: string, name?: string, color?: string) => Promise<void>;
  deleteTheme: (id: string) => Promise<void>;
  reorderThemes: (orderedIds: string[]) => Promise<void>;
  assignProjectToTheme: (projectId: string, themeId: string | null) => Promise<void>;
  assignTaskToTheme: (taskId: string, themeId: string | null) => Promise<void>;
}

export const createThemeSlice: StateCreator<AppStore, [], [], ThemeSlice> = (set, get) => ({
  themes: [],
  themesLoading: false,

  loadThemes: async () => {
    set({ themesLoading: true });
    const themes = await api.listThemes();
    set({ themes, themesLoading: false });
  },

  createTheme: async (name, color) => {
    const theme = await api.createTheme(name, color);
    set((s) => ({ themes: [...s.themes, theme] }));
    return theme;
  },

  updateTheme: async (id, name, color) => {
    const updated = await api.updateTheme(id, name, color);
    set((s) => ({
      themes: s.themes.map((t) => (t.id === id ? updated : t)),
    }));
  },

  deleteTheme: async (id) => {
    await api.deleteTheme(id);
    set((s) => ({
      themes: s.themes.filter((t) => t.id !== id),
      // Nullify theme references in projects and tasks
      projects: s.projects.map((p) =>
        p.themeId === id ? { ...p, themeId: null } : p
      ),
    }));
    // Reload to get fresh data after backend cascade
    get().loadProjects();
  },

  reorderThemes: async (orderedIds) => {
    // Optimistic update
    set((s) => ({
      themes: orderedIds
        .map((id, index) => {
          const theme = s.themes.find((t) => t.id === id);
          return theme ? { ...theme, sortOrder: index } : null;
        })
        .filter((t): t is Theme => t !== null),
    }));
    await api.reorderThemes(orderedIds);
  },

  assignProjectToTheme: async (projectId, themeId) => {
    const updated = await api.assignProjectTheme(projectId, themeId);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? updated : p)),
    }));
  },

  assignTaskToTheme: async (taskId, themeId) => {
    const updated = await api.assignTaskTheme(taskId, themeId);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? updated : t)),
    }));
  },
});
