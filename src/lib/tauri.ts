import { invoke } from "@tauri-apps/api/core";
import type {
  Task,
  TaskWithTags,
  Project,
  Tag,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  PluginInfo,
  Credential,
  CalendarAccount,
  CalendarEvent,
} from "./types";

export const api = {
  // Projects
  createProject: (name: string, description?: string) =>
    invoke<Project>("create_project", { name, description }),
  listProjects: () => invoke<Project[]>("list_projects"),
  getProject: (projectId: string) =>
    invoke<Project>("get_project", { projectId }),
  updateProject: (projectId: string, name: string, description: string) =>
    invoke<Project>("update_project", { projectId, name, description }),
  deleteProject: (projectId: string) =>
    invoke<void>("delete_project", { projectId }),

  // Tasks
  createTask: (input: CreateTaskInput) =>
    invoke<Task>("create_task", { ...input }),
  listTasks: (projectId: string) =>
    invoke<Task[]>("list_tasks", { projectId }),
  getTask: (taskId: string) =>
    invoke<TaskWithTags>("get_task", { taskId }),
  updateTask: (taskId: string, input: UpdateTaskInput) =>
    invoke<Task>("update_task", { taskId, ...input }),
  updateTaskStatus: (taskId: string, status: TaskStatus) =>
    invoke<Task>("update_task_status", { taskId, status }),
  deleteTask: (taskId: string) =>
    invoke<void>("delete_task", { taskId }),

  // Tags
  addTagToTask: (taskId: string, tagName: string) =>
    invoke<Tag>("add_tag_to_task", { taskId, tagName }),
  removeTagFromTask: (taskId: string, tagId: string) =>
    invoke<void>("remove_tag_from_task", { taskId, tagId }),
  listTags: () => invoke<Tag[]>("list_tags"),

  // Plugins
  listPlugins: () => invoke<PluginInfo[]>("list_plugins"),
  getPlugin: (name: string) => invoke<PluginInfo>("get_plugin", { name }),
  enablePlugin: (name: string) => invoke<void>("enable_plugin", { name }),
  disablePlugin: (name: string) => invoke<void>("disable_plugin", { name }),
  reloadPlugin: (name: string) => invoke<PluginInfo>("reload_plugin", { name }),
  scanPlugins: () => invoke<PluginInfo[]>("scan_plugins"),
  openPluginsDirectory: () => invoke<string>("open_plugins_directory"),

  // Credentials
  listCredentials: () => invoke<Credential[]>("list_credentials"),
  createCredential: (
    name: string,
    credentialType: string,
    value: string,
    notes?: string,
  ) =>
    invoke<Credential>("create_credential", {
      name,
      credentialType,
      value,
      notes,
    }),
  getCredentialSecret: (id: string) =>
    invoke<string>("get_credential_secret", { id }),
  updateCredential: (
    id: string,
    name?: string,
    credentialType?: string,
    notes?: string,
    value?: string,
  ) =>
    invoke<Credential>("update_credential", {
      id,
      name,
      credentialType,
      notes,
      value,
    }),
  deleteCredential: (id: string) =>
    invoke<void>("delete_credential", { id }),

  // Calendar
  listCalendarAccounts: () =>
    invoke<CalendarAccount[]>("list_calendar_accounts"),
  connectGoogleCalendar: () =>
    invoke<CalendarAccount>("connect_google_calendar"),
  connectOutlookCalendar: () =>
    invoke<CalendarAccount>("connect_outlook_calendar"),
  syncCalendar: (accountId: string) =>
    invoke<void>("sync_calendar", { accountId }),
  syncAllCalendars: () => invoke<void>("sync_all_calendars"),
  disconnectCalendar: (accountId: string) =>
    invoke<void>("disconnect_calendar", { accountId }),
  listCalendarEvents: (start: string, end: string) =>
    invoke<CalendarEvent[]>("list_calendar_events", { start, end }),
};
