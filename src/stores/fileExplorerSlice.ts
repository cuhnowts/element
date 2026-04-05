import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { FileEntry } from "../lib/types";
import type { AppStore } from "./index";

const STORAGE_KEY = "element-file-expanded";

function loadPersistedExpanded(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistExpanded(expanded: Record<string, string[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded));
  } catch {
    // ignore storage errors
  }
}

export interface FileExplorerSlice {
  // Tree data: directory path -> children
  fileTree: Record<string, FileEntry[]>;
  // Expanded folder paths per project: projectId -> string[]
  expandedPaths: Record<string, string[]>;
  // Selected file path
  selectedFilePath: string | null;
  // Show hidden toggle
  showHiddenFiles: boolean;
  // Loading directories
  loadingPaths: string[];
  // Active project tab: "detail" | "files"
  activeProjectTab: "detail" | "files";

  loadDirectory: (dirPath: string) => Promise<void>;
  toggleExpand: (dirPath: string, projectId: string) => void;
  collapseAll: (projectId: string) => void;
  selectFile: (path: string | null) => void;
  setShowHidden: (show: boolean) => void;
  toggleShowHidden: () => void;
  openFileInEditor: (filePath: string) => Promise<void>;
  revealInFileManager: (path: string) => Promise<void>;
  refreshDirectory: (dirPath: string) => Promise<void>;
  refreshChangedDirectories: (changedDirs: string[]) => Promise<void>;
  setActiveProjectTab: (tab: "detail" | "files") => void;
  clearFileTree: () => void;
}

export const createFileExplorerSlice: StateCreator<AppStore, [], [], FileExplorerSlice> = (
  set,
  get,
) => ({
  fileTree: {},
  expandedPaths: loadPersistedExpanded(),
  selectedFilePath: null,
  showHiddenFiles: false,
  loadingPaths: [],
  activeProjectTab: "detail",

  loadDirectory: async (dirPath: string) => {
    set((s) => ({ loadingPaths: [...s.loadingPaths, dirPath] }));
    try {
      const entries = await api.listDirectory(dirPath, get().showHiddenFiles);
      set((s) => ({
        fileTree: { ...s.fileTree, [dirPath]: entries },
        loadingPaths: s.loadingPaths.filter((p) => p !== dirPath),
      }));
    } catch {
      set((s) => ({
        loadingPaths: s.loadingPaths.filter((p) => p !== dirPath),
      }));
    }
  },

  toggleExpand: (dirPath: string, projectId: string) => {
    const state = get();
    const projectExpanded = state.expandedPaths[projectId] || [];
    const isExpanded = projectExpanded.includes(dirPath);

    if (isExpanded) {
      const updated = {
        ...state.expandedPaths,
        [projectId]: projectExpanded.filter((p) => p !== dirPath),
      };
      set({ expandedPaths: updated });
      persistExpanded(updated);
    } else {
      const updated = {
        ...state.expandedPaths,
        [projectId]: [...projectExpanded, dirPath],
      };
      set({ expandedPaths: updated });
      persistExpanded(updated);

      // Load directory if not cached
      if (!state.fileTree[dirPath]) {
        state.loadDirectory(dirPath);
      }
    }
  },

  collapseAll: (projectId: string) => {
    const updated = { ...get().expandedPaths, [projectId]: [] };
    set({ expandedPaths: updated });
    persistExpanded(updated);
  },

  selectFile: (path: string | null) => {
    set({ selectedFilePath: path });
  },

  setShowHidden: (show: boolean) => {
    set({ showHiddenFiles: show });
  },

  toggleShowHidden: () => {
    const state = get();
    const newShow = !state.showHiddenFiles;
    set({ showHiddenFiles: newShow });

    // Re-fetch all loaded directories
    const dirs = Object.keys(state.fileTree);
    for (const dir of dirs) {
      api.listDirectory(dir, newShow).then((entries) => {
        set((s) => ({
          fileTree: { ...s.fileTree, [dir]: entries },
        }));
      });
    }
  },

  openFileInEditor: async (filePath: string) => {
    await api.openFileInEditor(filePath);
  },

  revealInFileManager: async (path: string) => {
    await api.revealInFileManager(path);
  },

  refreshDirectory: async (dirPath: string) => {
    const entries = await api.listDirectory(dirPath, get().showHiddenFiles);
    set((s) => ({
      fileTree: { ...s.fileTree, [dirPath]: entries },
    }));
  },

  refreshChangedDirectories: async (changedDirs: string[]) => {
    const state = get();
    const promises = changedDirs
      .filter((dir) => state.fileTree[dir] !== undefined)
      .map((dir) => state.refreshDirectory(dir));
    await Promise.all(promises);
  },

  setActiveProjectTab: (tab: "detail" | "files") => {
    set({ activeProjectTab: tab });
  },

  clearFileTree: () => {
    set({ fileTree: {}, selectedFilePath: null });
  },
});
