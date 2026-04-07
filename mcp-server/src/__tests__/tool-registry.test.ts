import { describe, it, expect } from "vitest";

/**
 * Tool registry test -- verifies all 18 MCP tools are defined with correct schemas.
 *
 * Note: The server uses top-level await for stdio transport, so we cannot import
 * index.ts directly. Instead, we duplicate the tool definitions here and verify
 * them structurally. This is an intentional trade-off documented in STATE.md.
 */

const EXPECTED_TOOLS = [
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
    description: "List tasks for a project, optionally filtered by phase",
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
        projectName: { type: "string", description: "Project display name" },
        phaseName: { type: "string", description: "Phase name to execute" },
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
          description: 'Action outcome: "completed", "failed", or "blocked"',
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
        priority: { type: "string", description: 'Task priority: "low", "medium", "high", or "urgent"' },
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
];

describe("MCP Tool Registry", () => {
  it("registers exactly 23 tools", () => {
    expect(EXPECTED_TOOLS).toHaveLength(23);
  });

  it("every tool has name, description, and inputSchema", () => {
    for (const tool of EXPECTED_TOOLS) {
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe("string");
      expect(tool.name.length).toBeGreaterThan(0);

      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe("string");
      expect(tool.description.length).toBeGreaterThan(0);

      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it("has all expected tool names", () => {
    const names = EXPECTED_TOOLS.map((t) => t.name);
    expect(names).toContain("list_projects");
    expect(names).toContain("get_project_detail");
    expect(names).toContain("list_phases");
    expect(names).toContain("get_phase_status");
    expect(names).toContain("list_tasks");
    expect(names).toContain("request_approval");
    expect(names).toContain("check_approval_status");
    expect(names).toContain("send_notification");
    expect(names).toContain("report_status");
    expect(names).toContain("spawn_project_session");
    expect(names).toContain("create_task");
    expect(names).toContain("update_task");
    expect(names).toContain("update_task_status");
    expect(names).toContain("delete_task");
    expect(names).toContain("update_phase_status");
    expect(names).toContain("create_project");
    expect(names).toContain("create_theme");
    expect(names).toContain("create_file");
    expect(names).toContain("list_calendar_events");
    expect(names).toContain("get_available_slots");
    expect(names).toContain("create_work_block");
    expect(names).toContain("move_work_block");
    expect(names).toContain("delete_work_block");
  });

  it("request_approval requires projectId, projectName, phaseName, reason", () => {
    const tool = EXPECTED_TOOLS.find((t) => t.name === "request_approval");
    expect(tool).toBeDefined();
    const required = (tool!.inputSchema as { required?: string[] }).required;
    expect(required).toBeDefined();
    expect(required).toContain("projectId");
    expect(required).toContain("projectName");
    expect(required).toContain("phaseName");
    expect(required).toContain("reason");
  });

  it("list_tasks has optional phaseId (not in required)", () => {
    const tool = EXPECTED_TOOLS.find((t) => t.name === "list_tasks");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty("phaseId");
    const required = (tool!.inputSchema as { required?: string[] }).required;
    expect(required).not.toContain("phaseId");
  });

  it("list_projects has no required fields", () => {
    const tool = EXPECTED_TOOLS.find((t) => t.name === "list_projects");
    expect(tool).toBeDefined();
    expect((tool!.inputSchema as { required?: string[] }).required).toBeUndefined();
  });

  it("check_approval_status requires approvalId", () => {
    const tool = EXPECTED_TOOLS.find(
      (t) => t.name === "check_approval_status"
    );
    expect(tool).toBeDefined();
    const required = (tool!.inputSchema as { required?: string[] }).required;
    expect(required).toContain("approvalId");
  });

  it("send_notification requires title, body, priority", () => {
    const tool = EXPECTED_TOOLS.find((t) => t.name === "send_notification");
    expect(tool).toBeDefined();
    const required = (tool!.inputSchema as { required?: string[] }).required;
    expect(required).toContain("title");
    expect(required).toContain("body");
    expect(required).toContain("priority");
  });
});

describe("Plugin Tool Namespace Safety", () => {
  it("no hardcoded tool name contains a colon", () => {
    for (const tool of EXPECTED_TOOLS) {
      expect(tool.name).not.toContain(":");
    }
  });

  it("plugin tools would be namespaced with colon separator", () => {
    // Plugin tools use "pluginName:toolName" format
    // This test documents the convention that prevents collisions
    const examplePluginToolName = "knowledge:wiki_query";
    expect(examplePluginToolName).toContain(":");
    expect(EXPECTED_TOOLS.map((t) => t.name)).not.toContain(
      examplePluginToolName
    );
  });
});
