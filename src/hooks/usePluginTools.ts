/**
 * Hook for loading plugin-contributed tools and dispatching plugin skills.
 * Fetches once on mount (D-02). Plugin changes take effect on next chat open.
 */
import { useCallback, useEffect, useState } from "react";
import {
  type PluginToolDefinition,
  dispatchPluginSkill,
  getPluginToolDefinitions,
} from "@/lib/pluginToolRegistry";

export function usePluginTools() {
  const [pluginTools, setPluginTools] = useState<PluginToolDefinition[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch plugin skills once on mount (per D-02)
  useEffect(() => {
    let cancelled = false;
    getPluginToolDefinitions().then((tools) => {
      if (!cancelled) {
        setPluginTools(tools);
        setIsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dispatch = useCallback(
    async (skillName: string, input: Record<string, unknown>) => {
      return dispatchPluginSkill(skillName, input);
    },
    [],
  );

  // Plugin tools use colon-separated namespace: "knowledge:query"
  const isPluginTool = useCallback(
    (name: string): boolean => pluginTools.some((t) => t.name === name),
    [pluginTools],
  );

  const isPluginToolDestructive = useCallback(
    (name: string): boolean =>
      pluginTools.find((t) => t.name === name)?.destructive ?? false,
    [pluginTools],
  );

  // Convert to LLM tool format for merging with getToolDefinitions()
  const getToolDefs = useCallback(
    (): { name: string; description: string; input_schema: Record<string, unknown> }[] =>
      pluginTools.map((pt) => ({
        name: pt.name,
        description: pt.description,
        input_schema: pt.input_schema,
      })),
    [pluginTools],
  );

  return {
    pluginTools,
    isLoaded,
    dispatch,
    isPluginTool,
    isPluginToolDestructive,
    getToolDefs,
  };
}
