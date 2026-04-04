/**
 * Shared action registry for bot skills.
 *
 * Single source of truth for all bot skill definitions (D-02).
 * Hub chat tool_use and MCP write tools both reference this registry.
 */

export interface ActionDefinition {
  /** Tool name (e.g. "create_task") */
  name: string;
  /** Human-readable description for LLM */
  description: string;
  /** JSON Schema object for tool input */
  inputSchema: Record<string, unknown>;
  /** Whether this action requires confirmation (per D-06) */
  destructive: boolean;
  /** The Tauri invoke command name */
  tauriCommand: string;
}

export const ACTION_REGISTRY: ActionDefinition[] = [
  {
    name: "search_tasks",
    description:
      "Search for tasks by title. Returns matching tasks with their IDs. Use this before updating or deleting tasks.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term to match against task titles",
        },
      },
      required: ["query"],
    },
    destructive: false,
    tauriCommand: "search_tasks",
  },
  {
    name: "create_task",
    description: "Create a new task with a title and optional details.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        projectId: {
          type: "string",
          description: "Project ID to assign the task to",
        },
        description: {
          type: "string",
          description: "Detailed task description",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Task priority level",
        },
        phaseId: {
          type: "string",
          description: "Phase ID to assign the task to",
        },
      },
      required: ["title"],
    },
    destructive: false,
    tauriCommand: "create_task",
  },
  {
    name: "update_task",
    description: "Update an existing task's title, description, or priority.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task to update" },
        title: { type: "string", description: "New task title" },
        description: { type: "string", description: "New task description" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "New priority level",
        },
      },
      required: ["taskId"],
    },
    destructive: false,
    tauriCommand: "update_task",
  },
  {
    name: "update_task_status",
    description:
      "Change a task's status (todo, in_progress, done, or cancelled).",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task to update" },
        status: {
          type: "string",
          enum: ["todo", "in_progress", "done", "cancelled"],
          description: "New task status",
        },
      },
      required: ["taskId", "status"],
    },
    destructive: false,
    tauriCommand: "update_task_status",
  },
  {
    name: "delete_task",
    description: "Permanently delete a task. This action cannot be undone.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task to delete" },
      },
      required: ["taskId"],
    },
    destructive: true,
    tauriCommand: "delete_task",
  },
  {
    name: "update_phase_status",
    description: "Update a project phase's status.",
    inputSchema: {
      type: "object",
      properties: {
        phaseId: { type: "string", description: "ID of the phase to update" },
        status: { type: "string", description: "New phase status" },
      },
      required: ["phaseId", "status"],
    },
    destructive: false,
    tauriCommand: "update_phase_status",
  },
  {
    name: "create_project",
    description: "Create a new project with a name and optional description.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        description: {
          type: "string",
          description: "Project description",
        },
      },
      required: ["name"],
    },
    destructive: false,
    tauriCommand: "create_project",
  },
  {
    name: "create_theme",
    description:
      "Create a new theme (top-level category) with a name and color.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Theme name" },
        color: { type: "string", description: "Theme color (hex or named)" },
      },
      required: ["name", "color"],
    },
    destructive: false,
    tauriCommand: "create_theme",
  },
  {
    name: "create_file",
    description:
      "Create a new file in a project's linked directory with the given content.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to project directory",
        },
        content: { type: "string", description: "File content to write" },
        projectId: {
          type: "string",
          description: "Project ID whose directory to write in",
        },
      },
      required: ["path", "content", "projectId"],
    },
    destructive: false,
    tauriCommand: "create_file",
  },
  {
    name: "reschedule_day",
    description:
      "Regenerate today's schedule after the user reports lost time or changed priorities. Returns an updated task list for the day.",
    inputSchema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Brief description of why the schedule needs updating",
        },
      },
      required: ["reason"],
    },
    destructive: false,
    tauriCommand: "generate_schedule",
  },
  {
    name: "execute_shell",
    description:
      "Execute a shell command from the allowlist (git, npm, ls, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute (must be on the allowlist)",
        },
      },
      required: ["command"],
    },
    destructive: true,
    tauriCommand: "execute_bot_shell",
  },
];

/**
 * Generate LLM-compatible tool definitions from the registry (per D-03).
 * Returns array of { name, description, input_schema } objects.
 */
export function getToolDefinitions(): {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}[] {
  return ACTION_REGISTRY.map((entry) => ({
    name: entry.name,
    description: entry.description,
    input_schema: entry.inputSchema,
  }));
}

/**
 * Find an action definition by name.
 */
export function getAction(name: string): ActionDefinition | undefined {
  return ACTION_REGISTRY.find((entry) => entry.name === name);
}

/**
 * Check if an action is flagged as destructive.
 * Returns false for unknown action names.
 */
export function isDestructive(name: string): boolean {
  const action = getAction(name);
  return action?.destructive ?? false;
}
