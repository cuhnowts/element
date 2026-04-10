import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Database as DatabaseType } from "better-sqlite3";
import { handleWikiQuery, handleWikiIngest } from "./tools/wiki-tools.js";

export interface PluginToolDef {
  prefixedName: string; // "core-knowledge:wiki_query"
  pluginName: string; // "core-knowledge"
  toolName: string; // "wiki_query"
  description: string;
  inputSchema: Record<string, unknown>;
}

type McpResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

type PluginHandler = (
  dbPath: string,
  args: Record<string, unknown>,
) => McpResult;

const CORE_HANDLERS: Record<string, PluginHandler> = {
  "core-knowledge:wiki_query": (dbPath, args) =>
    handleWikiQuery(dbPath, args as { query: string }),
  "core-knowledge:wiki_ingest": (dbPath, args) =>
    handleWikiIngest(dbPath, args as { filePath: string }),
};

interface PluginMcpToolRow {
  prefixed_name: string;
  plugin_name: string;
  description: string;
  input_schema: string;
}

export function loadPluginToolsFromDb(db: DatabaseType): PluginToolDef[] {
  const rows = db
    .prepare(
      "SELECT prefixed_name, plugin_name, description, input_schema FROM plugin_mcp_tools WHERE enabled = 1",
    )
    .all() as PluginMcpToolRow[];

  return rows.map((row) => ({
    prefixedName: row.prefixed_name,
    pluginName: row.plugin_name,
    toolName: row.prefixed_name.substring(
      row.prefixed_name.indexOf(":") + 1,
    ),
    description: row.description,
    inputSchema: JSON.parse(row.input_schema) as Record<string, unknown>,
  }));
}

interface PluginManifestTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  handler: string; // "file.js#functionName"
}

interface PluginManifest {
  name: string;
  mcp_tools?: PluginManifestTool[];
}

export async function dispatchPluginTool(
  prefixedName: string,
  dbPath: string,
  pluginsDir: string,
  args: Record<string, unknown>,
): Promise<McpResult> {
  // Check core handlers first
  const coreHandler = CORE_HANDLERS[prefixedName];
  if (coreHandler) {
    return coreHandler(dbPath, args);
  }

  // User plugin fallback: extract pluginName, read plugin.json for handler
  const colonIdx = prefixedName.indexOf(":");
  if (colonIdx === -1) {
    throw new Error(`No handler for tool "${prefixedName}"`);
  }

  const pluginName = prefixedName.substring(0, colonIdx);
  const toolName = prefixedName.substring(colonIdx + 1);

  const manifestPath = join(pluginsDir, pluginName, "plugin.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`No handler for tool "${prefixedName}"`);
  }

  let manifest: PluginManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch {
    throw new Error(`No handler for tool "${prefixedName}"`);
  }

  const mcpTool = manifest.mcp_tools?.find((t) => t.name === toolName);
  if (!mcpTool) {
    throw new Error(`No handler for tool "${prefixedName}"`);
  }

  const [fileName, functionName] = mcpTool.handler.split("#");
  if (!fileName || !functionName) {
    throw new Error(`No handler for tool "${prefixedName}"`);
  }

  const modulePath = resolve(pluginsDir, pluginName, fileName);
  const mod = await import(modulePath);
  const handler = mod[functionName];
  if (typeof handler !== "function") {
    throw new Error(
      `Handler "${functionName}" not found in plugin module`,
    );
  }

  return handler(dbPath, args) as McpResult;
}
