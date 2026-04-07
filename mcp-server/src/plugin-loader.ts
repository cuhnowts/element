import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export interface PluginMcpTool {
  name: string; // "pluginName:toolName" (namespace-prefixed)
  description: string;
  inputSchema: Record<string, unknown>;
  handlerModule: string; // Absolute path to handler .js file
  handlerFunction: string; // Export name in that module
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

export function loadPluginTools(pluginsDir: string): PluginMcpTool[] {
  if (!existsSync(pluginsDir)) {
    return [];
  }

  const tools: PluginMcpTool[] = [];

  let entries: string[];
  try {
    entries = readdirSync(pluginsDir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const entryPath = join(pluginsDir, entry);

    // Skip non-directories
    try {
      if (!statSync(entryPath).isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }

    const manifestPath = join(entryPath, "plugin.json");
    if (!existsSync(manifestPath)) {
      continue;
    }

    let manifest: PluginManifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch {
      continue;
    }

    if (!manifest.mcp_tools || !Array.isArray(manifest.mcp_tools)) {
      continue;
    }

    for (const mcpTool of manifest.mcp_tools) {
      const [fileName, functionName] = mcpTool.handler.split("#");
      if (!fileName || !functionName) {
        continue;
      }

      tools.push({
        name: `${manifest.name}:${mcpTool.name}`,
        description: mcpTool.description,
        inputSchema: mcpTool.input_schema,
        handlerModule: resolve(pluginsDir, entry, fileName),
        handlerFunction: functionName,
      });
    }
  }

  return tools;
}
