export type StepType = "shell" | "http" | "manual";

export interface ShellStepConfig {
  type: "shell";
  name: string;
  command: string;
  workingDir?: string;
  timeoutMs?: number;
}

export interface HttpStepConfig {
  type: "http";
  name: string;
  method: string;
  url: string;
  headers?: [string, string][];
  body?: unknown;
  timeoutMs?: number;
}

export interface ManualStepConfig {
  type: "manual";
  name: string;
  description: string;
}

export type StepDefinition = ShellStepConfig | HttpStepConfig | ManualStepConfig;

export interface Workflow {
  id: string;
  taskId?: string;
  name: string;
  description: string;
  steps: StepDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  workflowId: string;
  cronExpression: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}
