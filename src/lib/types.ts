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

// Plugin types
export type PluginStatus = "active" | "error" | "disabled" | "loading";

export interface PluginInfo {
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: string | null;
  status: PluginStatus;
  errorMessage: string | null;
  capabilities: string[];
  enabled: boolean;
  stepTypes: StepTypeInfo[];
}

export interface StepTypeInfo {
  id: string;
  name: string;
  description: string;
}

// Credential types
export type CredentialType = "api_key" | "token" | "secret" | "oauth_token";

export interface Credential {
  id: string;
  name: string;
  credentialType: CredentialType;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCredentialInput {
  name: string;
  credentialType: CredentialType;
  value: string;
  notes?: string;
}

// Settings navigation
export type SettingsTab = "plugins" | "credentials" | "calendars";
