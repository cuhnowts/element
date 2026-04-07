import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { loadPluginTools } from "../plugin-loader.js";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "plugin-loader-test-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("loadPluginTools", () => {
  it("returns empty array for nonexistent directory", () => {
    const result = loadPluginTools(join(tempDir, "nonexistent"));
    expect(result).toEqual([]);
  });

  it("returns empty array for empty directory", () => {
    const pluginsDir = join(tempDir, "plugins");
    mkdirSync(pluginsDir);
    const result = loadPluginTools(pluginsDir);
    expect(result).toEqual([]);
  });

  it("returns empty array when plugin has no mcp_tools field", () => {
    const pluginsDir = join(tempDir, "plugins");
    const pluginDir = join(pluginsDir, "my-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "plugin.json"),
      JSON.stringify({ name: "my-plugin", version: "1.0.0" })
    );
    const result = loadPluginTools(pluginsDir);
    expect(result).toEqual([]);
  });

  it("returns namespace-prefixed tool definitions from manifest", () => {
    const pluginsDir = join(tempDir, "plugins");
    const pluginDir = join(pluginsDir, "knowledge");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "plugin.json"),
      JSON.stringify({
        name: "knowledge",
        mcp_tools: [
          {
            name: "wiki_query",
            description: "Query the wiki",
            input_schema: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
            },
            handler: "mcp-handlers.js#handleWikiQuery",
          },
          {
            name: "wiki_ingest",
            description: "Ingest a file into the wiki",
            input_schema: {
              type: "object",
              properties: { filePath: { type: "string" } },
              required: ["filePath"],
            },
            handler: "mcp-handlers.js#handleWikiIngest",
          },
        ],
      })
    );

    const result = loadPluginTools(pluginsDir);

    expect(result).toHaveLength(2);

    expect(result[0].name).toBe("knowledge:wiki_query");
    expect(result[0].description).toBe("Query the wiki");
    expect(result[0].inputSchema).toEqual({
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    });
    expect(result[0].handlerModule).toBe(
      resolve(pluginsDir, "knowledge", "mcp-handlers.js")
    );
    expect(result[0].handlerFunction).toBe("handleWikiQuery");

    expect(result[1].name).toBe("knowledge:wiki_ingest");
    expect(result[1].handlerFunction).toBe("handleWikiIngest");
  });

  it("tool names contain colon separator for namespace safety", () => {
    const pluginsDir = join(tempDir, "plugins");
    const pluginDir = join(pluginsDir, "test-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "plugin.json"),
      JSON.stringify({
        name: "test-plugin",
        mcp_tools: [
          {
            name: "do_thing",
            description: "Does a thing",
            input_schema: { type: "object", properties: {} },
            handler: "handlers.js#doThing",
          },
        ],
      })
    );

    const result = loadPluginTools(pluginsDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toContain(":");
    expect(result[0].name).toBe("test-plugin:do_thing");
  });

  it("splits handler string into module and function", () => {
    const pluginsDir = join(tempDir, "plugins");
    const pluginDir = join(pluginsDir, "myplugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "plugin.json"),
      JSON.stringify({
        name: "myplugin",
        mcp_tools: [
          {
            name: "action",
            description: "An action",
            input_schema: { type: "object", properties: {} },
            handler: "lib/handlers.js#performAction",
          },
        ],
      })
    );

    const result = loadPluginTools(pluginsDir);
    expect(result[0].handlerModule).toBe(
      resolve(pluginsDir, "myplugin", "lib/handlers.js")
    );
    expect(result[0].handlerFunction).toBe("performAction");
  });

  it("skips plugins with invalid JSON manifest", () => {
    const pluginsDir = join(tempDir, "plugins");
    const pluginDir = join(pluginsDir, "broken");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, "plugin.json"), "not valid json{{{");

    const result = loadPluginTools(pluginsDir);
    expect(result).toEqual([]);
  });

  it("skips handler entries without # separator", () => {
    const pluginsDir = join(tempDir, "plugins");
    const pluginDir = join(pluginsDir, "bad-handler");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "plugin.json"),
      JSON.stringify({
        name: "bad-handler",
        mcp_tools: [
          {
            name: "broken",
            description: "Broken handler",
            input_schema: { type: "object", properties: {} },
            handler: "no-hash-separator",
          },
        ],
      })
    );

    const result = loadPluginTools(pluginsDir);
    expect(result).toEqual([]);
  });

  it("loads tools from multiple plugins", () => {
    const pluginsDir = join(tempDir, "plugins");

    const pluginA = join(pluginsDir, "alpha");
    mkdirSync(pluginA, { recursive: true });
    writeFileSync(
      join(pluginA, "plugin.json"),
      JSON.stringify({
        name: "alpha",
        mcp_tools: [
          {
            name: "tool_a",
            description: "Tool A",
            input_schema: { type: "object", properties: {} },
            handler: "a.js#handleA",
          },
        ],
      })
    );

    const pluginB = join(pluginsDir, "beta");
    mkdirSync(pluginB, { recursive: true });
    writeFileSync(
      join(pluginB, "plugin.json"),
      JSON.stringify({
        name: "beta",
        mcp_tools: [
          {
            name: "tool_b",
            description: "Tool B",
            input_schema: { type: "object", properties: {} },
            handler: "b.js#handleB",
          },
        ],
      })
    );

    const result = loadPluginTools(pluginsDir);
    expect(result).toHaveLength(2);
    const names = result.map((t) => t.name);
    expect(names).toContain("alpha:tool_a");
    expect(names).toContain("beta:tool_b");
  });
});
