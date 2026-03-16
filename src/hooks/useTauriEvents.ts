import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useStore } from "../stores";
import { useTaskStore } from "@/stores/useTaskStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function useTauriEvents() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const loadProjects = useStore((s) => s.loadProjects);
  const loadTasks = useStore((s) => s.loadTasks);
  const openCreateProjectDialog = useStore((s) => s.openCreateProjectDialog);

  const fetchTodaysTasks = useTaskStore((s) => s.fetchTodaysTasks);
  const fetchExecutionLogs = useTaskStore((s) => s.fetchExecutionLogs);
  const workspaceSelectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);

  useEffect(() => {
    const listeners = Promise.all([
      listen("project-created", () => loadProjects()),
      listen("project-updated", () => loadProjects()),
      listen("project-deleted", () => loadProjects()),
      listen("task-created", () => {
        if (selectedProjectId) loadTasks(selectedProjectId);
        fetchTodaysTasks();
      }),
      listen("task-updated", () => {
        if (selectedProjectId) loadTasks(selectedProjectId);
        fetchTodaysTasks();
      }),
      listen("task-deleted", () => {
        if (selectedProjectId) loadTasks(selectedProjectId);
      }),
      listen("menu-new-project", () => openCreateProjectDialog()),
      listen("menu-new-task", () => {
        // Handled by keyboard shortcut hook -- focus the new task input
      }),
      listen("execution-started", () => {
        if (workspaceSelectedTaskId) fetchExecutionLogs(workspaceSelectedTaskId);
      }),
      listen("execution-log", () => {
        if (workspaceSelectedTaskId) fetchExecutionLogs(workspaceSelectedTaskId);
      }),
      listen("execution-completed", () => {
        if (workspaceSelectedTaskId) fetchExecutionLogs(workspaceSelectedTaskId);
      }),
    ]);

    return () => {
      listeners.then((fns) => fns.forEach((fn) => fn()));
    };
  }, [selectedProjectId, loadProjects, loadTasks, openCreateProjectDialog, fetchTodaysTasks, fetchExecutionLogs, workspaceSelectedTaskId]);
}
