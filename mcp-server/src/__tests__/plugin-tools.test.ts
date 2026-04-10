import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { loadPluginToolsFromDb, dispatchPluginTool } from "../plugin-tools.js";

let db: DatabaseType;

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(`
    CREATE TABLE plugin_mcp_tools (
      prefixed_name TEXT PRIMARY KEY,
      plugin_name TEXT NOT NULL,
      description TEXT NOT NULL,
      input_schema TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0
    )
  `);
});

afterEach(() => {
  db.close();
});

describe("loadPluginToolsFromDb", () => {
  it("returns empty array when table has no rows", () => {
    const result = loadPluginToolsFromDb(db);
    expect(result).toEqual([]);
  });

  it("returns empty array when all rows are disabled", () => {
    db.prepare(
      "INSERT INTO plugin_mcp_tools (prefixed_name, plugin_name, description, input_schema, enabled) VALUES (?, ?, ?, ?, ?)",
    ).run(
      "core-knowledge:wiki_query",
      "core-knowledge",
      "Query the wiki",
      JSON.stringify({ type: "object", properties: { query: { type: "string" } } }),
      0,
    );

    const result = loadPluginToolsFromDb(db);
    expect(result).toEqual([]);
  });

  it("returns enabled rows as PluginToolDef objects", () => {
    db.prepare(
      "INSERT INTO plugin_mcp_tools (prefixed_name, plugin_name, description, input_schema, enabled) VALUES (?, ?, ?, ?, ?)",
    ).run(
      "core-knowledge:wiki_query",
      "core-knowledge",
      "Query the wiki",
      JSON.stringify({
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      }),
      1,
    );

    const result = loadPluginToolsFromDb(db);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      prefixedName: "core-knowledge:wiki_query",
      pluginName: "core-knowledge",
      toolName: "wiki_query",
      description: "Query the wiki",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    });
  });

  it("parses input_schema JSON string into object", () => {
    const schema = {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Path to file" },
      },
      required: ["filePath"],
    };

    db.prepare(
      "INSERT INTO plugin_mcp_tools (prefixed_name, plugin_name, description, input_schema, enabled) VALUES (?, ?, ?, ?, ?)",
    ).run(
      "core-knowledge:wiki_ingest",
      "core-knowledge",
      "Ingest a file",
      JSON.stringify(schema),
      1,
    );

    const result = loadPluginToolsFromDb(db);
    expect(result[0].inputSchema).toEqual(schema);
  });

  it("derives toolName by splitting prefixedName on first colon", () => {
    db.prepare(
      "INSERT INTO plugin_mcp_tools (prefixed_name, plugin_name, description, input_schema, enabled) VALUES (?, ?, ?, ?, ?)",
    ).run(
      "my-plugin:sub:tool_name",
      "my-plugin",
      "A tool with colons",
      JSON.stringify({ type: "object", properties: {} }),
      1,
    );

    const result = loadPluginToolsFromDb(db);
    expect(result[0].toolName).toBe("sub:tool_name");
  });

  it("returns multiple enabled tools and skips disabled ones", () => {
    const insert = db.prepare(
      "INSERT INTO plugin_mcp_tools (prefixed_name, plugin_name, description, input_schema, enabled) VALUES (?, ?, ?, ?, ?)",
    );

    insert.run("core-knowledge:wiki_query", "core-knowledge", "Query", '{"type":"object","properties":{}}', 1);
    insert.run("core-knowledge:wiki_ingest", "core-knowledge", "Ingest", '{"type":"object","properties":{}}', 1);
    insert.run("other-plugin:disabled_tool", "other-plugin", "Disabled", '{"type":"object","properties":{}}', 0);

    const result = loadPluginToolsFromDb(db);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.prefixedName)).toEqual([
      "core-knowledge:wiki_query",
      "core-knowledge:wiki_ingest",
    ]);
  });
});

describe("dispatchPluginTool", () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "plugin-tools-dispatch-"));
    dbPath = join(tempDir, "element.db");
    // Create .knowledge dir with index for wiki_query tests
    const knowledgeDir = join(tempDir, ".knowledge");
    const wikiDir = join(knowledgeDir, "wiki");
    mkdirSync(wikiDir, { recursive: true });
    writeFileSync(
      join(knowledgeDir, "index.md"),
      "- [Setup Guide](wiki/setup.md)\n",
    );
    writeFileSync(join(wikiDir, "setup.md"), "# Setup Guide\n\nHow to set up.");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("dispatches core-knowledge:wiki_query to handleWikiQuery", async () => {
    const result = await dispatchPluginTool(
      "core-knowledge:wiki_query",
      dbPath,
      join(tempDir, "plugins"),
      { query: "setup" },
    );

    expect(result.isError).toBeUndefined();
    const articles = JSON.parse(result.content[0].text);
    expect(articles).toHaveLength(1);
    expect(articles[0].path).toBe("wiki/setup.md");
  });

  it("dispatches core-knowledge:wiki_ingest to handleWikiIngest", async () => {
    const sourceFile = join(tempDir, "source.md");
    writeFileSync(sourceFile, "# Source Content");

    const result = await dispatchPluginTool(
      "core-knowledge:wiki_ingest",
      dbPath,
      join(tempDir, "plugins"),
      { filePath: sourceFile },
    );

    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0].text);
    expect(response.operationId).toMatch(/^wiki-ingest-/);
    expect(response.status).toBe("accepted");
  });

  it("throws for unknown core plugin tool names", async () => {
    await expect(
      dispatchPluginTool(
        "core-knowledge:unknown_tool",
        dbPath,
        join(tempDir, "plugins"),
        {},
      ),
    ).rejects.toThrow('No handler for tool "core-knowledge:unknown_tool"');
  });

  it("throws for completely unknown prefixed names with no manifest", async () => {
    await expect(
      dispatchPluginTool(
        "nonexistent-plugin:some_tool",
        dbPath,
        join(tempDir, "plugins"),
        {},
      ),
    ).rejects.toThrow('No handler for tool "nonexistent-plugin:some_tool"');
  });

  it("throws for tool names without colon separator", async () => {
    await expect(
      dispatchPluginTool(
        "nocolon",
        dbPath,
        join(tempDir, "plugins"),
        {},
      ),
    ).rejects.toThrow('No handler for tool "nocolon"');
  });
});
