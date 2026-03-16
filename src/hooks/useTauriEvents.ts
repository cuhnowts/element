import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useStore } from "../stores";

export function useTauriEvents() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const loadProjects = useStore((s) => s.loadProjects);
  const loadTasks = useStore((s) => s.loadTasks);
  const openCreateProjectDialog = useStore((s) => s.openCreateProjectDialog);

  useEffect(() => {
    const listeners = Promise.all([
      listen("project-created", () => loadProjects()),
      listen("project-updated", () => loadProjects()),
      listen("project-deleted", () => loadProjects()),
      listen("task-created", () => {
        if (selectedProjectId) loadTasks(selectedProjectId);
      }),
      listen("task-updated", () => {
        if (selectedProjectId) loadTasks(selectedProjectId);
      }),
      listen("task-deleted", () => {
        if (selectedProjectId) loadTasks(selectedProjectId);
      }),
      listen("menu-new-project", () => openCreateProjectDialog()),
      listen("menu-new-task", () => {
        // Handled by keyboard shortcut hook -- focus the new task input
      }),
    ]);

    return () => {
      listeners.then((fns) => fns.forEach((fn) => fn()));
    };
  }, [selectedProjectId, loadProjects, loadTasks, openCreateProjectDialog]);
}
