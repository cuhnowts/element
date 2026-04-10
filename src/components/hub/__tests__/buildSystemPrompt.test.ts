import { describe, expect, it } from "vitest";
import type { ActionDefinition } from "@/lib/actionRegistry";
import type { PluginToolDefinition } from "@/lib/pluginToolRegistry";
import { buildSystemPrompt, formatToolsSection } from "../buildSystemPrompt";

const MOCK_BUILTIN: ActionDefinition[] = [
  {
    name: "search_tasks",
    description: "Search tasks by title",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    destructive: false,
    tauriCommand: "search_tasks",
  },
  {
    name: "create_task",
    description: "Create a new task",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
    destructive: true,
    tauriCommand: "create_task",
  },
];

const MOCK_PLUGIN_TOOLS: PluginToolDefinition[] = [
  {
    prefixedName: "knowledge:query",
    description: "Query the wiki",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string" } },
    },
    destructive: false,
    pluginName: "knowledge",
    outputSchema: {},
  },
  {
    prefixedName: "knowledge:ingest",
    description: "Add content to wiki",
    inputSchema: {
      type: "object",
      properties: { content: { type: "string" } },
    },
    destructive: true,
    pluginName: "knowledge",
    outputSchema: {},
  },
];

describe("formatToolsSection", () => {
  it("produces only built-in sections when no plugin tools", () => {
    const result = formatToolsSection(MOCK_BUILTIN, []);
    expect(result).toContain("**Lookup (use before update/delete):**");
    expect(result).toContain("search_tasks");
    expect(result).toContain("**Task Management:**");
    expect(result).toContain("create_task");
    expect(result).not.toContain("Plugin:");
  });

  it("adds plugin section grouped by pluginName with capitalized label", () => {
    const result = formatToolsSection(MOCK_BUILTIN, MOCK_PLUGIN_TOOLS);
    expect(result).toContain("**Knowledge Plugin:**");
    expect(result).toContain("knowledge:query");
    expect(result).toContain("knowledge:ingest");
  });

  it("groups multiple plugins separately", () => {
    const multiPluginTools: PluginToolDefinition[] = [
      ...MOCK_PLUGIN_TOOLS,
      {
        prefixedName: "notes:create",
        description: "Create a note",
        inputSchema: {},
        destructive: false,
        pluginName: "notes",
        outputSchema: {},
      },
    ];
    const result = formatToolsSection(MOCK_BUILTIN, multiPluginTools);
    expect(result).toContain("**Knowledge Plugin:**");
    expect(result).toContain("**Notes Plugin:**");
  });
});

describe("buildSystemPrompt", () => {
  it("includes manifest in system prompt", () => {
    const result = buildSystemPrompt("Project: Test", MOCK_BUILTIN, []);
    expect(result).toContain("Project: Test");
  });

  it("includes Available Tools section", () => {
    const result = buildSystemPrompt("", MOCK_BUILTIN, []);
    expect(result).toContain("### Available Tools");
    expect(result).toContain("search_tasks");
  });

  it("includes plugin tools when provided", () => {
    const result = buildSystemPrompt("", MOCK_BUILTIN, MOCK_PLUGIN_TOOLS);
    expect(result).toContain("Knowledge Plugin:");
    expect(result).toContain("knowledge:query");
  });

  it("includes behavior rules section", () => {
    const result = buildSystemPrompt("", MOCK_BUILTIN, []);
    expect(result).toContain("## Behavior Rules");
    expect(result).toContain("You are Element");
  });
});
