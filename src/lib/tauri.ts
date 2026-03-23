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
  Theme,
  Phase,
  FileEntry,
} from "./types";
import type {
  AiProvider,
  CreateProviderInput,
  ModelInfo,
} from "../types/ai";
import type { ScheduleBlock, WorkHoursConfig } from "../types/scheduling";

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

  // Themes
  createTheme: (name: string, color: string) =>
    invoke<Theme>("create_theme", { name, color }),
  listThemes: () => invoke<Theme[]>("list_themes"),
  updateTheme: (themeId: string, name: string | undefined, color: string | undefined) =>
    invoke<Theme>("update_theme", { themeId, name, color }),
  deleteTheme: (themeId: string) =>
    invoke<void>("delete_theme", { themeId }),
  reorderThemes: (orderedIds: string[]) =>
    invoke<void>("reorder_themes", { orderedIds }),
  getThemeItemCounts: (themeId: string) =>
    invoke<[number, number]>("get_theme_item_counts", { themeId }),
  assignProjectTheme: (projectId: string, themeId: string | null) =>
    invoke<Project>("assign_project_theme", { projectId, themeId }),
  assignTaskTheme: (taskId: string, themeId: string | null) =>
    invoke<Task>("assign_task_theme", { taskId, themeId }),

  // Phases
  createPhase: (projectId: string, name: string) =>
    invoke<Phase>("create_phase", { projectId, name }),
  listPhases: (projectId: string) =>
    invoke<Phase[]>("list_phases", { projectId }),
  updatePhase: (phaseId: string, name: string) =>
    invoke<Phase>("update_phase", { phaseId, name }),
  deletePhase: (phaseId: string) =>
    invoke<void>("delete_phase", { phaseId }),
  reorderPhases: (projectId: string, orderedIds: string[]) =>
    invoke<void>("reorder_phases", { projectId, orderedIds }),
  linkProjectDirectory: (projectId: string, directoryPath: string) =>
    invoke<Project>("link_project_directory", { projectId, directoryPath }),

  // Task phase assignment
  setTaskPhase: (taskId: string, phaseId: string | null) =>
    invoke<Task>("set_task_phase", { taskId, phaseId }),

  // Standalone tasks
  listStandaloneTasks: () =>
    invoke<Task[]>("list_standalone_tasks"),
  listTasksByTheme: (themeId: string) =>
    invoke<Task[]>("list_tasks_by_theme", { themeId }),

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

  // Scheduling
  getWorkHours: () => invoke<WorkHoursConfig | null>("get_work_hours"),
  saveWorkHours: (config: WorkHoursConfig) =>
    invoke<WorkHoursConfig>("save_work_hours", { config }),
  generateSchedule: (date: string) =>
    invoke<ScheduleBlock[]>("generate_schedule", { date }),
  applySchedule: (blocks: ScheduleBlock[]) =>
    invoke<void>("apply_schedule", { blocks }),

  // AI Providers
  listAiProviders: () => invoke<AiProvider[]>("list_ai_providers"),
  addAiProvider: (input: CreateProviderInput) =>
    invoke<AiProvider>("add_ai_provider", { ...input }),
  removeAiProvider: (id: string) =>
    invoke<void>("remove_ai_provider", { id }),
  setDefaultProvider: (id: string) =>
    invoke<void>("set_default_provider", { id }),
  testProviderConnection: (id: string) =>
    invoke<boolean>("test_provider_connection", { id }),
  listProviderModels: (id: string) =>
    invoke<ModelInfo[]>("list_provider_models", { id }),
  aiAssistTask: (taskId: string) =>
    invoke<void>("ai_assist_task", { taskId }),

  // File Explorer
  listDirectory: (dirPath: string, showHidden: boolean) =>
    invoke<FileEntry[]>("list_directory", { dirPath, showHidden }),
  openFileInEditor: (filePath: string) =>
    invoke<void>("open_file_in_editor", { filePath }),
  revealInFileManager: (path: string) =>
    invoke<void>("reveal_in_file_manager", { path }),
  startFileWatcher: (dirPath: string) =>
    invoke<void>("start_file_watcher", { dirPath }),
  stopFileWatcher: () =>
    invoke<void>("stop_file_watcher"),

  // CLI
  runCliTool: (command: string, args: string[], workingDir?: string) =>
    invoke<number>("run_cli_tool", { command, args, workingDir }),
};
