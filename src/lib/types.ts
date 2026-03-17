export type TaskStatus = "pending" | "in-progress" | "complete" | "blocked";
export type TaskPriority = "urgent" | "high" | "medium" | "low";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  context: string;
  status: TaskStatus;
  priority: TaskPriority;
  externalPath: string | null;
  dueDate: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  durationMinutes: number | null;
  recurrenceRule: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithTags extends Task {
  tags: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  context?: string;
  priority?: TaskPriority;
  externalPath?: string;
  dueDate?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  recurrenceRule?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  context?: string;
  priority?: TaskPriority;
  externalPath?: string;
  dueDate?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  recurrenceRule?: string;
}
