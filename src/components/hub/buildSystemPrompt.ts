/**
 * System prompt assembly for HubChat.
 * Extracted for testability — builds the dynamic prompt from built-in actions and plugin tools.
 */
import type { ActionDefinition } from "@/lib/actionRegistry";
import type { PluginToolDefinition } from "@/lib/pluginToolRegistry";

const SYSTEM_PREAMBLE = `You are Element — a desktop project management app's built-in orchestrator.
You ARE the app. When the user talks to you, they are talking to Element itself.
Never reference your own code, backend, database, or implementation. You are seamless.
Never suggest running sqlite3, querying a database, or reading source code. You don't have those.
You only have the tools listed below — nothing else.

Your job: help the user manage their work — create tasks, update progress, organize projects,
and answer questions about their current state. You already know everything about their projects
because you have their current status below.`;

const BEHAVIOR_RULES = `**Identity:**
- You are Element. Say "I" when referring to what the app can do.
- Never mention tools, JSON, ACTION blocks, databases, APIs, or implementation details.
- Never suggest workarounds like "you could run sqlite3" or "check the backend code."

**Task Completion vs Deletion:**
- When a user says a task is "done", "finished", or "complete" → use update_task_status with status "done". Do NOT delete it.
- Only use delete_task when the user explicitly says "delete", "remove permanently", or "get rid of."
- Completed tasks are tracked for history. Deletion is permanent and loses that history.

**Shell Commands:**
- When the user says "run git status" or "run ls" → use execute_shell. Do NOT answer from the project status or memory.
- Show the actual command output to the user.

**Clarification:**
- If you need info (which project? what task?), ask naturally using project/task names from the status above.
- If a task needs to be found first, use search_tasks, then tell the user what you found and take action.

**Tone:**
- Be concise. One sentence when possible. No preamble, no filler.

## Rescheduling

When the user says they lost time (e.g., "I lost 2 hours", "meeting ran over"), have new priorities (e.g., "prioritize auth instead"), or want to adjust their day:

1. Acknowledge the change briefly
2. Use the reschedule_day tool to generate an updated plan
3. Present the updated schedule as a summary -- list tasks that still fit and tasks that got bumped
4. NEVER auto-apply schedule changes. Only present the suggestion.

**Rescheduling Tool:**
- reschedule_day: Regenerate today's schedule with adjusted parameters. Input: {"reason":"brief description of change"}. Returns an updated task list for the day.`;

export function formatToolsSection(
  builtinActions: ActionDefinition[],
  pluginTools: PluginToolDefinition[],
): string {
  const lines: string[] = [];

  const lookupTools = builtinActions.filter((a) => a.name === "search_tasks");
  const taskTools = builtinActions.filter((a) =>
    ["create_task", "update_task", "update_task_status", "delete_task"].includes(a.name),
  );
  const projectTools = builtinActions.filter((a) =>
    ["create_project", "create_theme", "update_phase_status"].includes(a.name),
  );
  const calendarTools = builtinActions.filter((a) =>
    [
      "list_calendar_events",
      "get_available_slots",
      "create_work_block",
      "move_work_block",
      "delete_work_block",
      "reschedule_day",
    ].includes(a.name),
  );
  const shellTools = builtinActions.filter((a) => a.name === "execute_shell");
  const fileTools = builtinActions.filter((a) => a.name === "create_file");

  const formatOne = (a: ActionDefinition): string => {
    const schema = a.inputSchema as {
      properties?: Record<string, { type?: string; description?: string; enum?: string[] }>;
      required?: string[];
    };
    const params = schema.properties
      ? Object.entries(schema.properties)
          .map(([k, v]) => `"${k}":"${v.description || v.type || "string"}"`)
          .join(",")
      : "";
    const required = schema.required ? ` Required: ${schema.required.join(", ")}.` : "";
    return `- ${a.name}: ${a.description} Input: {${params}}.${required}`;
  };

  if (lookupTools.length) {
    lines.push("**Lookup (use before update/delete):**");
    lines.push(...lookupTools.map(formatOne));
    lines.push("");
  }
  if (taskTools.length) {
    lines.push("**Task Management:**");
    lines.push(...taskTools.map(formatOne));
    lines.push("");
  }
  if (projectTools.length) {
    lines.push("**Project/Theme Management:**");
    lines.push(...projectTools.map(formatOne));
    lines.push("");
  }
  if (calendarTools.length) {
    lines.push("**Calendar & Scheduling:**");
    lines.push(...calendarTools.map(formatOne));
    lines.push("");
  }
  if (fileTools.length) {
    lines.push("**File Management:**");
    lines.push(...fileTools.map(formatOne));
    lines.push("");
  }
  if (shellTools.length) {
    lines.push("**Shell Commands:**");
    lines.push(...shellTools.map(formatOne));
    lines.push("");
  }

  // Plugin tools grouped by plugin name (per D-03, include all)
  if (pluginTools.length > 0) {
    const byPlugin = new Map<string, PluginToolDefinition[]>();
    for (const pt of pluginTools) {
      const existing = byPlugin.get(pt.pluginName) ?? [];
      existing.push(pt);
      byPlugin.set(pt.pluginName, existing);
    }
    for (const [pluginName, tools] of byPlugin) {
      const label = pluginName.charAt(0).toUpperCase() + pluginName.slice(1);
      lines.push(`**${label} Plugin:**`);
      for (const t of tools) {
        const schema = t.inputSchema as {
          properties?: Record<string, { type?: string; description?: string }>;
          required?: string[];
        };
        const params = schema.properties
          ? Object.entries(schema.properties)
              .map(([k, v]) => `"${k}":"${v.description || v.type || "string"}"`)
              .join(",")
          : "";
        lines.push(`- ${t.prefixedName}: ${t.description} Input: {${params}}.`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function buildSystemPrompt(
  manifest: string,
  builtinActions: ActionDefinition[],
  pluginTools: PluginToolDefinition[],
): string {
  const toolsSection = formatToolsSection(builtinActions, pluginTools);
  return `${SYSTEM_PREAMBLE}

## Current Project Status

${manifest || "(No projects yet)"}

## Taking Actions

When the user asks you to DO something, respond with BOTH a brief confirmation AND an action block.

Output the action block on its own line in exactly this format:
ACTION:{"name":"<tool_name>","input":{<parameters>}}

You may output multiple ACTION blocks if needed (e.g., search then act on results).

### Available Tools

${toolsSection}
## Behavior Rules

${BEHAVIOR_RULES}`;
}
