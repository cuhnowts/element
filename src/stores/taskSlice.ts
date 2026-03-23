import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type {
  Task,
  TaskWithTags,
  TaskStatus,
  TaskPriority,
} from "../lib/types";
import type { AppStore } from "./index";
import { useWorkspaceStore } from "./useWorkspaceStore";

export interface TaskSlice {
  tasks: Task[];
  selectedTaskId: string | null;
  selectedTask: TaskWithTags | null;
  tasksLoading: boolean;
  loadTasks: (projectId: string) => Promise<void>;
  createTask: (title: string, projectId?: string, themeId?: string, phaseId?: string) => Promise<Task>;
  setTaskPhase: (taskId: string, phaseId: string | null) => Promise<void>;
  loadTaskDetail: (taskId: string) => Promise<void>;
  selectTask: (taskId: string | null) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  updateTask: (
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      context?: string;
      priority?: TaskPriority;
      dueDate?: string;
      scheduledDate?: string;
      scheduledTime?: string;
      durationMinutes?: number;
      recurrenceRule?: string;
    },
  ) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addTagToTask: (taskId: string, tagName: string) => Promise<void>;
  removeTagFromTask: (taskId: string, tagId: string) => Promise<void>;
}

export const createTaskSlice: StateCreator<AppStore, [], [], TaskSlice> = (
  set,
  _get,
) => ({
  tasks: [],
  selectedTaskId: null,
  selectedTask: null,
  tasksLoading: false,
  loadTasks: async (projectId) => {
    set({ tasksLoading: true });
    const tasks = await api.listTasks(projectId);
    set({ tasks, tasksLoading: false });
  },
  createTask: async (title, projectId, themeId, phaseId) => {
    const task = await api.createTask({ projectId, themeId, phaseId, title });
    set((s) => ({ tasks: [task, ...s.tasks] }));
    return task;
  },
  setTaskPhase: async (taskId, phaseId) => {
    const task = await api.setTaskPhase(taskId, phaseId);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, phaseId: task.phaseId } : t)),
      selectedTask: s.selectedTask?.id === taskId
        ? { ...s.selectedTask, phaseId: task.phaseId }
        : s.selectedTask,
    }));
  },
  loadTaskDetail: async (taskId) => {
    const task = await api.getTask(taskId);
    set({ selectedTask: task });
  },
  selectTask: async (taskId) => {
    if (!taskId) {
      set({ selectedTaskId: null, selectedTask: null });
      useWorkspaceStore.getState().selectTask(null);
      return;
    }
    set({ selectedTaskId: taskId, selectedProjectId: null, selectedThemeId: null });
    useWorkspaceStore.getState().selectTask(taskId);
    const task = await api.getTask(taskId);
    set({ selectedTask: task });
  },
  updateTaskStatus: async (taskId, status) => {
    await api.updateTaskStatus(taskId, status);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
      selectedTask:
        s.selectedTask?.id === taskId
          ? { ...s.selectedTask, status }
          : s.selectedTask,
    }));
  },
  updateTask: async (taskId, updates) => {
    await api.updateTask(taskId, updates);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      selectedTask:
        s.selectedTask?.id === taskId
          ? { ...s.selectedTask, ...updates }
          : s.selectedTask,
    }));
  },
  deleteTask: async (taskId) => {
    await api.deleteTask(taskId);
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== taskId),
      selectedTaskId: s.selectedTaskId === taskId ? null : s.selectedTaskId,
      selectedTask: s.selectedTask?.id === taskId ? null : s.selectedTask,
    }));
  },
  addTagToTask: async (taskId, tagName) => {
    const tag = await api.addTagToTask(taskId, tagName);
    set((s) => ({
      selectedTask:
        s.selectedTask?.id === taskId
          ? { ...s.selectedTask, tags: [...s.selectedTask.tags, tag] }
          : s.selectedTask,
    }));
  },
  removeTagFromTask: async (taskId, tagId) => {
    await api.removeTagFromTask(taskId, tagId);
    set((s) => ({
      selectedTask:
        s.selectedTask?.id === taskId
          ? {
              ...s.selectedTask,
              tags: s.selectedTask.tags.filter((t) => t.id !== tagId),
            }
          : s.selectedTask,
    }));
  },
});
