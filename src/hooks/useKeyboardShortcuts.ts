import { useEffect } from "react";
import { useStore } from "@/stores";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function useKeyboardShortcuts() {
  const toggleCommandPalette = useStore((s) => s.toggleCommandPalette);
  const openCreateProjectDialog = useStore((s) => s.openCreateProjectDialog);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const createTask = useStore((s) => s.createTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const selectedTask = useStore((s) => s.selectedTask);
  const openDeleteConfirm = useStore((s) => s.openDeleteConfirm);
  const closeDeleteConfirm = useStore((s) => s.closeDeleteConfirm);
  const closeCreateProjectDialog = useStore((s) => s.closeCreateProjectDialog);
  const deleteConfirmOpen = useStore((s) => s.deleteConfirmOpen);
  const createProjectDialogOpen = useStore((s) => s.createProjectDialogOpen);
  const commandPaletteOpen = useStore((s) => s.commandPaletteOpen);

  const toggleDrawer = useWorkspaceStore((s) => s.toggleDrawer);
  const workspaceSelectTask = useWorkspaceStore((s) => s.selectTask);
  const workspaceSelectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+K: toggle command palette
      if (meta && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Cmd+B: toggle output drawer
      if (meta && e.key === "b") {
        e.preventDefault();
        toggleDrawer();
        return;
      }

      // Cmd+Shift+N: new project
      if (meta && e.shiftKey && e.key === "N") {
        e.preventDefault();
        openCreateProjectDialog();
        return;
      }

      // Cmd+N: new task in current project
      if (meta && !e.shiftKey && e.key === "n") {
        e.preventDefault();
        if (selectedProjectId) {
          createTask(selectedProjectId, "Untitled Task").then((task) => {
            selectTask(task.id);
            workspaceSelectTask(task.id);
          });
        }
        return;
      }

      // Cmd+Backspace: delete selected task
      if (meta && e.key === "Backspace") {
        e.preventDefault();
        if (selectedTaskId && selectedTask) {
          openDeleteConfirm({
            type: "task",
            id: selectedTaskId,
            name: selectedTask.title,
          });
        }
        return;
      }

      // Escape: close dialogs / deselect task
      if (e.key === "Escape") {
        e.preventDefault();
        if (deleteConfirmOpen) {
          closeDeleteConfirm();
        } else if (createProjectDialogOpen) {
          closeCreateProjectDialog();
        } else if (commandPaletteOpen) {
          toggleCommandPalette();
        } else if (selectedTaskId) {
          selectTask(null);
          workspaceSelectTask(null);
        } else if (workspaceSelectedTaskId) {
          workspaceSelectTask(null);
        }
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    toggleCommandPalette,
    openCreateProjectDialog,
    selectedProjectId,
    createTask,
    selectTask,
    selectedTaskId,
    selectedTask,
    openDeleteConfirm,
    closeDeleteConfirm,
    closeCreateProjectDialog,
    deleteConfirmOpen,
    createProjectDialogOpen,
    commandPaletteOpen,
    toggleDrawer,
    workspaceSelectTask,
    workspaceSelectedTaskId,
  ]);
}
