import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/tauri";
import { useTaskStore } from "@/stores/useTaskStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useStore } from "../stores";

export function useTauriEvents() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const loadProjects = useStore((s) => s.loadProjects);
  const loadTasks = useStore((s) => s.loadTasks);
  const loadPhases = useStore((s) => s.loadPhases);
  const openCreateProjectDialog = useStore((s) => s.openCreateProjectDialog);

  const fetchTodaysTasks = useTaskStore((s) => s.fetchTodaysTasks);
  const fetchExecutionLogs = useTaskStore((s) => s.fetchExecutionLogs);
  const workspaceSelectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);
  const refreshChangedDirectories = useStore((s) => s.refreshChangedDirectories);

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
      listen<string[]>("file-system-changed", (event) => {
        const changedDirs = event.payload;
        refreshChangedDirectories(changedDirs);
      }),
      listen<{ phaseCount: number; taskCount: number }>("planning-sync-complete", (event) => {
        const { phaseCount, taskCount } = event.payload;
        if (phaseCount > 0 || taskCount > 0) {
          toast.success(`Synced ${phaseCount} phases, ${taskCount} tasks from .planning/`);
        }
        if (selectedProjectId) {
          loadPhases(selectedProjectId);
          loadTasks(selectedProjectId);
        }
      }),
      listen<string>("planning-sync-error", (event) => {
        // Only show toast if it's not a "file not found" error (watcher may fire before GSD writes the file)
        const msg = event.payload ?? "";
        if (!msg.includes("Failed to read") && !msg.includes("No such file")) {
          toast.warning("Could not parse .planning/ROADMAP.md \u2014 check file format");
        }
      }),
      listen<string>("planning-file-changed", async (event) => {
        const changedProjectId = event.payload;
        if (changedProjectId === selectedProjectId) {
          const projects = useStore.getState().projects;
          const project = projects.find((p) => p.id === changedProjectId);
          if (project?.directoryPath) {
            try {
              await api.syncPlanningRoadmap(changedProjectId, project.directoryPath);
            } catch {
              // Error handled by planning-sync-error event
            }
          }
        }
      }),
    ]);

    return () => {
      listeners.then((fns) => {
        for (const fn of fns) fn();
      });
    };
  }, [
    selectedProjectId,
    loadProjects,
    loadTasks,
    loadPhases,
    openCreateProjectDialog,
    fetchTodaysTasks,
    fetchExecutionLogs,
    workspaceSelectedTaskId,
    refreshChangedDirectories,
  ]);
}
