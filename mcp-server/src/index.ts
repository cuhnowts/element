import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { dirname, join } from "node:path";
import { db, dbPath } from "./db.js";
import { loadPluginToolsFromDb, dispatchPluginTool, type PluginToolDef } from "./plugin-tools.js";
import { handleListProjects, handleGetProjectDetail } from "./tools/project-tools.js";
import { handleListPhases, handleGetPhaseStatus } from "./tools/phase-tools.js";
import { handleListTasks } from "./tools/task-tools.js";
import {
  handleRequestApproval,
  handleCheckApprovalStatus,
  handleSendNotification,
  handleReportStatus,
  handleSpawnProjectSession,
} from "./tools/orchestration-tools.js";
import {
  handleCreateTask,
  handleUpdateTask,
  handleUpdateTaskStatus,
  handleDeleteTask,
  handleUpdatePhaseStatus,
  handleCreateProject,
  handleCreateTheme,
  handleCreateFile,
} from "./tools/write-tools.js";
import {
  handleListCalendarEvents,
  handleGetAvailableSlots,
  handleCreateWorkBlock,
  handleMoveWorkBlock,
  handleDeleteWorkBlock,
} from "./tools/calendar-tools.js";

const server = new Server(
  { name: "element-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Load plugin-contributed MCP tools from DB
const pluginsDir = join(dirname(dbPath), "plugins");
const pluginTools: PluginToolDef[] = loadPluginToolsFromDb(db);
if (pluginTools.length > 0) {
  console.error(
    `Loaded ${pluginTools.length} plugin tool(s): ${pluginTools.map((t) => t.prefixedName).join(", ")}`
  );
}

// --- List Tools ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_projects",
      description: "List all projects with their current state",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "get_project_detail",
      description:
        "Get detailed info for a single project including phase and task counts",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project ID" },
        },
        required: ["projectId"],
      },
    },
    {
      name: "list_phases",
      description: "List all phases for a project ordered by sort_order",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project ID" },
        },
        required: ["projectId"],
      },
    },
    {
      name: "get_phase_status",
      description:
        "Get completion status of all phases for a project (total tasks, completed tasks, isComplete)",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project ID" },
        },
        required: ["projectId"],
      },
    },
    {
      name: "list_tasks",
      description:
        "List tasks for a project, optionally filtered by phase",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project ID" },
          phaseId: {
            type: "string",
            description: "Optional phase ID to filter by",
          },
        },
        required: ["projectId"],
      },
    },
    {
      name: "request_approval",
      description:
        "Request user approval before executing a phase. Returns an approval ID to poll with check_approval_status.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project ID" },
          projectName: {
            type: "string",
            description: "Project display name",
          },
          phaseName: {
            type: "string",
            description: "Phase name to execute",
          },
          reason: {
            type: "string",
            description: "Why this phase is ready for execution",
          },
        },
        required: ["projectId", "projectName", "phaseName", "reason"],
      },
    },
    {
      name: "check_approval_status",
      description:
        "Check the status of a previously submitted approval request",
      inputSchema: {
        type: "object" as const,
        properties: {
          approvalId: {
            type: "string",
            description: "Approval ID from request_approval",
          },
        },
        required: ["approvalId"],
      },
    },
    {
      name: "send_notification",
      description:
        "Send a notification to the user via the Element notification system",
      inputSchema: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "Notification title" },
          body: { type: "string", description: "Notification body text" },
          priority: {
            type: "string",
            description:
              'Notification priority: "critical", "informational", or "silent"',
          },
          projectId: {
            type: "string",
            description: "Optional project ID for context",
          },
          projectName: {
            type: "string",
            description: "Optional project name for context",
          },
        },
        required: ["title", "body", "priority"],
      },
    },
    {
      name: "report_status",
      description:
        "Report the status of an action (completed, failed, or blocked)",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: {
            type: "string",
            description: "Description of the action taken",
          },
          status: {
            type: "string",
            description:
              'Action outcome: "completed", "failed", or "blocked"',
          },
          projectId: {
            type: "string",
            description: "Optional project ID for context",
          },
          details: {
            type: "string",
            description: "Optional additional details",
          },
        },
        required: ["action", "status"],
      },
    },
    {
      name: "spawn_project_session",
      description:
        "Request Element to spawn a new named terminal session for a project",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project ID" },
          sessionName: {
            type: "string",
            description: "Name for the terminal session",
          },
        },
        required: ["projectId", "sessionName"],
      },
    },
    {
      name: "create_task",
      description: "Create a new task",
      inputSchema: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "Task title" },
          projectId: { type: "string", description: "Optional project ID" },
          description: { type: "string", description: "Task description" },
          priority: {
            type: "string",
            description: 'Task priority: "low", "medium", "high", or "urgent"',
          },
          phaseId: { type: "string", description: "Optional phase ID" },
        },
        required: ["title"],
      },
    },
    {
      name: "update_task",
      description: "Update an existing task's fields",
      inputSchema: {
        type: "object" as const,
        properties: {
          taskId: { type: "string", description: "Task ID to update" },
          title: { type: "string", description: "New title" },
          description: { type: "string", description: "New description" },
          priority: { type: "string", description: "New priority" },
        },
        required: ["taskId"],
      },
    },
    {
      name: "update_task_status",
      description: "Update a task's status",
      inputSchema: {
        type: "object" as const,
        properties: {
          taskId: { type: "string", description: "Task ID to update" },
          status: {
            type: "string",
            description: 'New status: "todo", "in_progress", "done", or "cancelled"',
            enum: ["todo", "in_progress", "done", "cancelled"],
          },
        },
        required: ["taskId", "status"],
      },
    },
    {
      name: "delete_task",
      description: "Delete a task (requires approval)",
      inputSchema: {
        type: "object" as const,
        properties: {
          taskId: { type: "string", description: "Task ID to delete" },
        },
        required: ["taskId"],
      },
    },
    {
      name: "update_phase_status",
      description: "Report phase status",
      inputSchema: {
        type: "object" as const,
        properties: {
          phaseId: { type: "string", description: "Phase ID" },
          status: { type: "string", description: "Status to report" },
        },
        required: ["phaseId", "status"],
      },
    },
    {
      name: "create_project",
      description: "Create a new project",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Project name" },
          description: { type: "string", description: "Project description" },
        },
        required: ["name"],
      },
    },
    {
      name: "create_theme",
      description: "Create a new theme",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Theme name" },
          color: { type: "string", description: "Theme color (hex)" },
        },
        required: ["name", "color"],
      },
    },
    {
      name: "create_file",
      description: "Create a file in a project's linked directory",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string", description: "Relative file path within project directory" },
          content: { type: "string", description: "File content" },
          projectId: { type: "string", description: "Project ID" },
        },
        required: ["path", "content", "projectId"],
      },
    },
    {
      name: "list_calendar_events",
      description: "List calendar events for a date range",
      inputSchema: {
        type: "object" as const,
        properties: {
          startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
          endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
    {
      name: "get_available_slots",
      description: "Get available time slots for a given day",
      inputSchema: {
        type: "object" as const,
        properties: {
          date: { type: "string", description: "Date (YYYY-MM-DD)" },
        },
        required: ["date"],
      },
    },
    {
      name: "create_work_block",
      description: "Create a work block on the calendar for a specific task and time slot",
      inputSchema: {
        type: "object" as const,
        properties: {
          date: { type: "string", description: "Date (YYYY-MM-DD)" },
          taskId: { type: "string", description: "Task ID to assign to this block" },
          startTime: { type: "string", description: "Start time (HH:mm)" },
          endTime: { type: "string", description: "End time (HH:mm)" },
        },
        required: ["date", "taskId", "startTime", "endTime"],
      },
    },
    {
      name: "move_work_block",
      description: "Move an existing work block to a new time slot",
      inputSchema: {
        type: "object" as const,
        properties: {
          blockId: { type: "string", description: "Scheduled block ID" },
          startTime: { type: "string", description: "New start time (HH:mm)" },
          endTime: { type: "string", description: "New end time (HH:mm)" },
        },
        required: ["blockId", "startTime", "endTime"],
      },
    },
    {
      name: "delete_work_block",
      description: "Delete a work block from the calendar",
      inputSchema: {
        type: "object" as const,
        properties: {
          blockId: { type: "string", description: "Scheduled block ID" },
        },
        required: ["blockId"],
      },
    },

    // Plugin-contributed tools (dynamically loaded from DB)
    ...pluginTools.map((t) => ({
      name: t.prefixedName,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  ],
}));

// --- Call Tool Dispatch ---

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "list_projects":
      return handleListProjects(db);

    case "get_project_detail":
      return handleGetProjectDetail(db, args as { projectId: string });

    case "list_phases":
      return handleListPhases(db, args as { projectId: string });

    case "get_phase_status":
      return handleGetPhaseStatus(db, args as { projectId: string });

    case "list_tasks":
      return handleListTasks(
        db,
        args as { projectId: string; phaseId?: string }
      );

    case "request_approval":
      return handleRequestApproval(
        db,
        dbPath,
        args as {
          projectId: string;
          projectName: string;
          phaseName: string;
          reason: string;
        }
      );

    case "check_approval_status":
      return handleCheckApprovalStatus(
        db,
        dbPath,
        args as { approvalId: string }
      );

    case "send_notification":
      return handleSendNotification(
        db,
        dbPath,
        args as {
          title: string;
          body: string;
          priority: string;
          projectId?: string;
          projectName?: string;
        }
      );

    case "report_status":
      return handleReportStatus(
        db,
        dbPath,
        args as {
          action: string;
          status: string;
          projectId?: string;
          details?: string;
        }
      );

    case "spawn_project_session":
      return handleSpawnProjectSession(
        db,
        dbPath,
        args as { projectId: string; sessionName: string }
      );

    case "create_task":
      return handleCreateTask(
        db,
        dbPath,
        args as {
          title: string;
          projectId?: string;
          description?: string;
          priority?: string;
          phaseId?: string;
        }
      );

    case "update_task":
      return handleUpdateTask(
        db,
        dbPath,
        args as {
          taskId: string;
          title?: string;
          description?: string;
          priority?: string;
        }
      );

    case "update_task_status":
      return handleUpdateTaskStatus(
        db,
        dbPath,
        args as { taskId: string; status: string }
      );

    case "delete_task":
      return handleDeleteTask(
        db,
        dbPath,
        args as { taskId: string }
      );

    case "update_phase_status":
      return handleUpdatePhaseStatus(
        db,
        dbPath,
        args as { phaseId: string; status: string }
      );

    case "create_project":
      return handleCreateProject(
        db,
        dbPath,
        args as { name: string; description?: string }
      );

    case "create_theme":
      return handleCreateTheme(
        db,
        dbPath,
        args as { name: string; color: string }
      );

    case "create_file":
      return handleCreateFile(
        db,
        dbPath,
        args as { path: string; content: string; projectId: string }
      );

    case "list_calendar_events":
      return handleListCalendarEvents(
        db,
        args as { startDate: string; endDate: string }
      );

    case "get_available_slots":
      return handleGetAvailableSlots(
        db,
        args as { date: string }
      );

    case "create_work_block":
      return handleCreateWorkBlock(
        db,
        dbPath,
        args as { date: string; taskId: string; startTime: string; endTime: string }
      );

    case "move_work_block":
      return handleMoveWorkBlock(
        db,
        dbPath,
        args as { blockId: string; startTime: string; endTime: string }
      );

    case "delete_work_block":
      return handleDeleteWorkBlock(
        db,
        dbPath,
        args as { blockId: string }
      );

    default: {
      const pluginTool = pluginTools.find((t) => t.prefixedName === name);
      if (pluginTool) {
        try {
          return await dispatchPluginTool(
            pluginTool.prefixedName,
            dbPath,
            pluginsDir,
            args as Record<string, unknown>,
          );
        } catch (err) {
          return {
            content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
            isError: true,
          };
        }
      }
      return { content: [{ type: "text" as const, text: `Error: Unknown tool "${name}"` }], isError: true };
    }
  }
});

// --- Start Server ---

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("Element MCP server started");
