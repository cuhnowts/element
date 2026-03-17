export type StepStatus = "pending" | "running" | "complete" | "failed" | "skipped";
export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface Step {
  id: string;
  name: string;
  status: StepStatus;
  duration?: string; // e.g. "1.2s"
  agents?: string[];
  skills?: string[];
  tools?: string[];
  order: number;
}

export interface ExecutionRecord {
  id: string;
  taskId: string;
  startedAt: string;
  completedAt?: string;
  status: StepStatus;
  steps: Step[];
}

export interface LogEntry {
  timestamp: string; // HH:mm:ss format
  level: LogLevel;
  message: string;
}

// Workflow execution types

export interface WorkflowRun {
  id: string;
  workflowId: string;
  triggerType: "manual" | "scheduled" | "catch-up";
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface WorkflowStepResult {
  id: string;
  runId: string;
  stepIndex: number;
  stepName: string;
  stepType: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  inputPreview?: string;
  outputPreview?: string;
  outputFull?: string;
  errorMessage?: string;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface StepProgress {
  workflowId: string;
  runId: string;
  stepIndex: number;
  stepName: string;
  status: "running" | "completed" | "failed";
  outputPreview?: string;
  errorMessage?: string;
  durationMs?: number;
}
