import { useCallback } from "react";
import { resolveResource } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";

export function useAgentMcp() {
  /** Write a file relative to the app data directory. Returns the absolute path. */
  const writeAgentFile = useCallback(async (relativePath: string, contents: string): Promise<string> => {
    return invoke<string>("write_agent_file", { relativePath, contents });
  }, []);

  const generateMcpConfig = useCallback(
    async (dbPath: string): Promise<string> => {
      // Resolve the MCP server bundle path
      const mcpServerPath = await resolveResource(
        "mcp-server/dist/index.js"
      );

      const config = {
        mcpServers: {
          element: {
            type: "stdio",
            command: "node",
            args: [mcpServerPath, dbPath],
          },
        },
      };

      return writeAgentFile("agent/mcp-config.json", JSON.stringify(config, null, 2));
    },
    [writeAgentFile]
  );

  const generateSystemPrompt = useCallback(async (): Promise<string> => {

    const promptContent = `You are Element's central AI agent. You manage work across all projects.

## Your Tools
You have MCP tools to read project state and orchestrate work:
- list_projects: See all projects and their current state
- get_project_detail: Get detailed info about a specific project
- list_phases: Get phases for a project
- get_phase_status: Check phase completion status
- list_tasks: Get tasks for a project/phase
- request_approval: Ask the user to approve phase execution
- check_approval_status: Poll for approval decision
- report_status: Signal completion, failure, or blocked state
- send_notification: Trigger a user notification
- spawn_project_session: Create a named terminal for a project
- create_task: Create a new task in a project
- update_task: Update an existing task's fields
- update_task_status: Change a task's status (todo, in_progress, done, cancelled)
- delete_task: Delete a task (requires approval)
- update_phase_status: Report phase completion status
- create_project: Create a new project
- create_theme: Create a new theme
- create_file: Create a file in a project's linked directory
- list_calendar_events: List calendar events for a date range (returns titles, times, locations)
- get_available_slots: Get available time slots for a given day (returns gaps between meetings and work blocks)
- create_work_block: Schedule a work block for a task on the calendar (requires approval)
- move_work_block: Move an existing work block to a new time slot (requires approval)
- delete_work_block: Remove a work block from the calendar (requires approval)

## Operating Mode
You run in APPROVE-ONLY mode:
1. Scan projects for phases ready to execute
2. A phase is "ready" when all prior phases are complete and no human blockers exist
3. Call request_approval before executing any phase
4. Wait for approval via check_approval_status
5. On approval, proceed with execution
6. On rejection, skip and move to next candidate
7. Report status after each action

## Rules
- NEVER execute without approval
- ALWAYS use report_status to signal outcomes
- If you encounter an error, report it and wait for instructions
- Be concise in activity log messages`;

    return writeAgentFile("agent/AGENT.md", promptContent);
  }, [writeAgentFile]);

  return { generateMcpConfig, generateSystemPrompt };
}
