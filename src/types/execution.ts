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
