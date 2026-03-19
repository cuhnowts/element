import type { StateCreator } from "zustand";
import type { AppStore } from "./index";
import type { SettingsTab } from "../lib/types";

export interface UiSlice {
  commandPaletteOpen: boolean;
  createProjectDialogOpen: boolean;
  deleteConfirmOpen: boolean;
  deleteTarget: {
    type: "task" | "project";
    id: string;
    name: string;
  } | null;
  settingsOpen: boolean;
  settingsTab: SettingsTab;
  toggleCommandPalette: () => void;
  openCreateProjectDialog: () => void;
  closeCreateProjectDialog: () => void;
  openDeleteConfirm: (target: {
    type: "task" | "project";
    id: string;
    name: string;
  }) => void;
  closeDeleteConfirm: () => void;
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
}

export const createUiSlice: StateCreator<AppStore, [], [], UiSlice> = (
  set,
) => ({
  commandPaletteOpen: false,
  createProjectDialogOpen: false,
  deleteConfirmOpen: false,
  deleteTarget: null,
  settingsOpen: false,
  settingsTab: "plugins",
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  openCreateProjectDialog: () => set({ createProjectDialogOpen: true }),
  closeCreateProjectDialog: () => set({ createProjectDialogOpen: false }),
  openDeleteConfirm: (target) =>
    set({ deleteConfirmOpen: true, deleteTarget: target }),
  closeDeleteConfirm: () =>
    set({ deleteConfirmOpen: false, deleteTarget: null }),
  openSettings: (tab) =>
    set({ settingsOpen: true, settingsTab: tab ?? "plugins" }),
  closeSettings: () => set({ settingsOpen: false }),
});
