import { invoke } from "@tauri-apps/api/core";
import type { Task, TaskDetail } from "@/types/task";
import type { ExecutionRecord, LogEntry } from "@/types/execution";

export async function getTodaysTasks(): Promise<Task[]> {
  return invoke<Task[]>("get_todays_tasks");
}

export async function getTaskDetail(taskId: string): Promise<TaskDetail> {
  return invoke<TaskDetail>("get_task_detail", { taskId });
}

export async function getExecutionHistory(taskId: string): Promise<ExecutionRecord[]> {
  return invoke<ExecutionRecord[]>("get_execution_history", { taskId });
}

export async function getExecutionLogs(executionId: string): Promise<LogEntry[]> {
  return invoke<LogEntry[]>("get_execution_logs", { executionId });
}
