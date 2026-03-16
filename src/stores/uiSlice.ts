import type { StateCreator } from "zustand";
import type { ProjectSlice } from "./projectSlice";
import type { TaskSlice } from "./taskSlice";

export interface UiSlice {
  commandPaletteOpen: boolean;
  createProjectDialogOpen: boolean;
  deleteConfirmOpen: boolean;
  deleteTarget: {
    type: "task" | "project";
    id: string;
    name: string;
  } | null;
  toggleCommandPalette: () => void;
  openCreateProjectDialog: () => void;
  closeCreateProjectDialog: () => void;
  openDeleteConfirm: (target: {
    type: "task" | "project";
    id: string;
    name: string;
  }) => void;
  closeDeleteConfirm: () => void;
}

export const createUiSlice: StateCreator<
  ProjectSlice & TaskSlice & UiSlice,
  [],
  [],
  UiSlice
> = (set) => ({
  commandPaletteOpen: false,
  createProjectDialogOpen: false,
  deleteConfirmOpen: false,
  deleteTarget: null,
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  openCreateProjectDialog: () => set({ createProjectDialogOpen: true }),
  closeCreateProjectDialog: () => set({ createProjectDialogOpen: false }),
  openDeleteConfirm: (target) =>
    set({ deleteConfirmOpen: true, deleteTarget: target }),
  closeDeleteConfirm: () =>
    set({ deleteConfirmOpen: false, deleteTarget: null }),
});
