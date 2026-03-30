import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { db, dbPath } from "./db.js";
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

const server = new Server(
  { name: "element-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

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

    default:
      return {
        content: [
          { type: "text" as const, text: `Error: Unknown tool "${name}"` },
        ],
        isError: true,
      };
  }
});

// --- Start Server ---

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("Element MCP server started");
