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
  const openTerminal = useWorkspaceStore((s) => s.openTerminal);
  const workspaceSelectTask = useWorkspaceStore((s) => s.selectTask);
  const workspaceSelectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);
  const openDrawerToTab = useWorkspaceStore((s) => s.openDrawerToTab);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // When terminal has focus, only allow Ctrl+` through to global handler.
      // All other keystrokes must flow to xterm.js unintercepted (per D-02, pitfall 4).
      const terminalFocused = document.activeElement?.closest(".xterm") !== null;
      if (terminalFocused && !(e.ctrlKey && e.key === "`")) {
        return; // Let xterm.js handle the keystroke
      }

      const meta = e.metaKey || e.ctrlKey;

      // Ctrl+`: toggle terminal (per D-02)
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        const currentTab = useWorkspaceStore.getState().activeDrawerTab;
        const isDrawerOpen = useWorkspaceStore.getState().drawerOpen;
        if (isDrawerOpen && currentTab === "terminal") {
          // Drawer is open on terminal tab -> close drawer
          toggleDrawer();
        } else {
          // Drawer is closed or on different tab -> open to terminal
          openTerminal();
        }
        return;
      }

      // Cmd+Shift+A: toggle Element AI drawer tab (per D-08)
      if (meta && e.shiftKey && e.code === "KeyA") {
        e.preventDefault();
        const ws = useWorkspaceStore.getState();
        if (ws.drawerOpen && ws.activeDrawerTab === "elementai") {
          toggleDrawer();
        } else {
          openDrawerToTab("elementai");
        }
        return;
      }

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
          createTask("Untitled Task", selectedProjectId).then((task) => {
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
    openTerminal,
    workspaceSelectTask,
    workspaceSelectedTaskId,
    openDrawerToTab,
  ]);
}
