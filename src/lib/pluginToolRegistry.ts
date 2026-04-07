/**
 * Plugin tool registry for dynamically loaded plugin skills.
 * Separate from ACTION_REGISTRY per D-01.
 */
import { invoke } from "@tauri-apps/api/core";

export interface PluginToolDefinition {
  /** Namespaced skill name, e.g. "knowledge:ingest" */
  name: string;
  /** Human-readable description for LLM */
  description: string;
  /** JSON Schema for tool input */
  input_schema: Record<string, unknown>;
  /** Whether this skill requires confirmation (writes to filesystem) */
  destructive: boolean;
  /** Plugin that owns this skill */
  plugin_name: string;
}

/**
 * Fetch plugin skill definitions from the Tauri backend.
 * Calls `list_plugin_skills` which returns skills from all enabled plugins.
 * Skills from disabled plugins are excluded by the backend.
 */
export async function getPluginToolDefinitions(): Promise<PluginToolDefinition[]> {
  try {
    return await invoke<PluginToolDefinition[]>("list_plugin_skills");
  } catch {
    return [];
  }
}

/**
 * Dispatch a plugin skill invocation to the Tauri backend.
 * Routes to `dispatch_plugin_skill` which resolves the plugin handler.
 */
export async function dispatchPluginSkill(
  skillName: string,
  input: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const result = await invoke("dispatch_plugin_skill", {
      skillName,
      input: JSON.stringify(input),
    });
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
