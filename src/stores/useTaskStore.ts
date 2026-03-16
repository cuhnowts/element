import { create } from "zustand";
import type { Task, TaskDetail } from "@/types/task";
import type { ExecutionRecord, LogEntry } from "@/types/execution";
import { getTodaysTasks, getTaskDetail, getExecutionHistory, getExecutionLogs } from "@/lib/tauri-commands";

interface TaskState {
  todaysTasks: Task[];
  selectedTaskDetail: TaskDetail | null;
  executionHistory: ExecutionRecord[];
  executionLogs: LogEntry[];
  isLoadingTasks: boolean;
  isLoadingDetail: boolean;
  isLoadingLogs: boolean;
  error: string | null;

  fetchTodaysTasks: () => Promise<void>;
  fetchTaskDetail: (taskId: string) => Promise<void>;
  fetchExecutionHistory: (taskId: string) => Promise<void>;
  fetchExecutionLogs: (executionId: string) => Promise<void>;
  addLogEntry: (entry: LogEntry) => void;
  clearLogs: () => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>()((set) => ({
  todaysTasks: [],
  selectedTaskDetail: null,
  executionHistory: [],
  executionLogs: [],
  isLoadingTasks: false,
  isLoadingDetail: false,
  isLoadingLogs: false,
  error: null,

  fetchTodaysTasks: async () => {
    set({ isLoadingTasks: true, error: null });
    try {
      const tasks = await getTodaysTasks();
      set({ todaysTasks: tasks, isLoadingTasks: false });
    } catch (e) {
      set({ error: String(e), isLoadingTasks: false });
    }
  },

  fetchTaskDetail: async (taskId: string) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const detail = await getTaskDetail(taskId);
      set({ selectedTaskDetail: detail, isLoadingDetail: false });
    } catch (e) {
      set({ error: String(e), isLoadingDetail: false });
    }
  },

  fetchExecutionHistory: async (taskId: string) => {
    set({ isLoadingLogs: true, error: null });
    try {
      const history = await getExecutionHistory(taskId);
      set({ executionHistory: history, isLoadingLogs: false });
    } catch (e) {
      set({ error: String(e), isLoadingLogs: false });
    }
  },

  fetchExecutionLogs: async (executionId: string) => {
    set({ isLoadingLogs: true, error: null });
    try {
      const logs = await getExecutionLogs(executionId);
      set({ executionLogs: logs, isLoadingLogs: false });
    } catch (e) {
      set({ error: String(e), isLoadingLogs: false });
    }
  },

  addLogEntry: (entry) => set((s) => ({ executionLogs: [...s.executionLogs, entry] })),
  clearLogs: () => set({ executionLogs: [] }),
  clearError: () => set({ error: null }),
}));
