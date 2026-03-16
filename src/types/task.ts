export type TaskStatus = "pending" | "in-progress" | "complete" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  project?: string;
  tags: string[];
  scheduledDate?: string; // ISO date string
  scheduledTime?: string; // HH:mm format
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends Task {
  description?: string;
  context?: string;
  dueDate?: string;
  agents: string[];
  skills: string[];
  tools: string[];
  steps: import("./execution").Step[];
}
