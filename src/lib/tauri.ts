import { invoke } from "@tauri-apps/api/core";
import type {
  Task,
  TaskWithTags,
  Project,
  Tag,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
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
};
