export type TaskStatus = "pending" | "in-progress" | "complete" | "blocked";
export type TaskPriority = "urgent" | "high" | "medium" | "low";

export interface Project {
  id: string;
  name: string;
  description: string;
  goal: string;
  directoryPath: string | null;
  themeId: string | null;
  planningTier: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string | null;
  themeId: string | null;
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
  phaseId: string | null;
  source: string;
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

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  projectId?: string;
  themeId?: string;
  phaseId?: string;
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
  phaseId?: string;
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

export interface PluginSkillInfo {
  prefixedName: string;
  pluginName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  destructive: boolean;
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

// Step configuration types
export interface ShellStepConfig {
  command: string;
  workingDirectory?: string;
  timeoutSeconds?: number;
}

export interface HttpStepConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers?: Array<{ key: string; value: string }>;
  body?: string;
  auth?:
    | { type: "none" }
    | { type: "bearer"; credentialId: string }
    | { type: "basic"; credentialId: string };
  timeoutSeconds?: number;
}

export interface FsStepConfig {
  operation: "read" | "write" | "list";
  path: string;
  content?: string;
}

// Calendar types
export interface CalendarAccount {
  id: string;
  provider: "google" | "outlook";
  email: string;
  displayName: string;
  credentialId: string;
  syncToken: string | null;
  lastSyncedAt: string | null;
  colorIndex: number;
  enabled: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  accountId: string;
  title: string;
  description: string;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  attendees: string[];
  status: string;
  updatedAt: string;
}

// Theme types
export interface Theme {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const THEME_COLORS = [
  "#6366f1", // indigo (default)
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#6b7280", // gray
] as const;

// File Explorer
export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_hidden: boolean;
}

// Settings navigation
export type SettingsTab = "plugins" | "credentials" | "calendars" | "schedule" | "ai" | "heartbeat";

// Notification types
export interface Notification {
  id: string;
  title: string;
  body: string;
  priority: "critical" | "informational" | "silent";
  category: string | null;
  projectId: string | null;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}
