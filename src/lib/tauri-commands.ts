import { invoke } from "@tauri-apps/api/core";
import type { Task, TaskDetail } from "@/types/task";
import type { ExecutionRecord, LogEntry, WorkflowRun, WorkflowStepResult } from "@/types/execution";
import type { Workflow, StepDefinition, Schedule } from "@/types/workflow";

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

// Workflow CRUD
export async function createWorkflow(
  name: string,
  description: string,
  steps: StepDefinition[],
  taskId?: string,
): Promise<Workflow> {
  return invoke<Workflow>("create_workflow", { name, description, steps, taskId });
}

export async function listWorkflows(): Promise<Workflow[]> {
  return invoke<Workflow[]>("list_workflows");
}

export async function getWorkflow(workflowId: string): Promise<Workflow> {
  return invoke<Workflow>("get_workflow", { workflowId });
}

export async function updateWorkflow(
  workflowId: string,
  name?: string,
  description?: string,
  steps?: StepDefinition[],
): Promise<Workflow> {
  return invoke<Workflow>("update_workflow", { workflowId, name, description, steps });
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  return invoke<void>("delete_workflow", { workflowId });
}

export async function promoteTaskToWorkflow(taskId: string): Promise<Workflow> {
  return invoke<Workflow>("promote_task_to_workflow", { taskId });
}

// Execution
export async function runWorkflow(workflowId: string): Promise<string> {
  return invoke<string>("run_workflow", { workflowId });
}

export async function retryWorkflowStep(
  workflowId: string,
  runId: string,
  stepIndex: number,
): Promise<void> {
  return invoke<void>("retry_workflow_step", { workflowId, runId, stepIndex });
}

export async function getWorkflowRuns(workflowId: string): Promise<WorkflowRun[]> {
  return invoke<WorkflowRun[]>("get_workflow_runs", { workflowId });
}

export async function getStepResults(runId: string): Promise<WorkflowStepResult[]> {
  return invoke<WorkflowStepResult[]>("get_step_results", { runId });
}

// Schedules
export async function createSchedule(
  workflowId: string,
  cronExpression: string,
): Promise<Schedule> {
  return invoke<Schedule>("create_schedule", { workflowId, cronExpression });
}

export async function getScheduleForWorkflow(
  workflowId: string,
): Promise<Schedule | null> {
  return invoke<Schedule | null>("get_schedule_for_workflow", { workflowId });
}

export async function updateSchedule(
  scheduleId: string,
  cronExpression: string,
): Promise<Schedule> {
  return invoke<Schedule>("update_schedule", { scheduleId, cronExpression });
}

export async function toggleSchedule(
  scheduleId: string,
  isActive: boolean,
): Promise<Schedule> {
  return invoke<Schedule>("toggle_schedule", { scheduleId, isActive });
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  return invoke<void>("delete_schedule", { scheduleId });
}

export async function getNextRunTimes(
  cronExpression: string,
  count: number,
): Promise<string[]> {
  return invoke<string[]>("get_next_run_times", { cronExpression, count });
}

// Hub Chat
export async function hubChatSend(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  tools?: { name: string; description: string; input_schema: Record<string, unknown> }[],
): Promise<void> {
  return invoke<void>("hub_chat_send", { messages, systemPrompt, tools: tools ?? null });
}

export async function hubChatStop(): Promise<void> {
  return invoke<void>("hub_chat_stop");
}
