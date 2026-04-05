import { useCallback, useRef } from "react";
import { useAgentStore } from "@/stores/useAgentStore";
import { useAgentMcp } from "@/hooks/useAgentMcp";
import { api } from "@/lib/tauri";
import { appDataDir } from "@tauri-apps/api/path";
import { toast } from "sonner";

const BACKOFF_MS = [2000, 4000, 8000]; // D-04: 2s, 4s, 8s
const MAX_RETRIES = 3;

export function useAgentLifecycle() {
  const setStatus = useAgentStore((s) => s.setStatus);
  const incrementRestart = useAgentStore((s) => s.incrementRestart);
  const resetRestartCount = useAgentStore((s) => s.resetRestartCount);
  const setAgentCommand = useAgentStore((s) => s.setAgentCommand);
  const setAgentArgs = useAgentStore((s) => s.setAgentArgs);

  const { generateMcpConfig, generateSystemPrompt } = useAgentMcp();

  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAgent = useCallback(async () => {
    setStatus("starting");

    try {
      // 1. Read CLI settings
      const command = await api.getAppSetting("cli_command");
      if (!command) {
        setStatus("stopped");
        toast("No AI tool configured. Set one in Settings > AI.");
        return;
      }

      // 2. Validate CLI tool
      const isValid = await api.validateCliTool(command);
      if (!isValid) {
        setStatus("stopped");
        toast(`AI tool "${command}" not found or not executable.`);
        return;
      }

      // 3. Get user-configured args
      const rawArgs = await api.getAppSetting("cli_args");
      const userArgs = rawArgs
        ? rawArgs
            // Sanitize em-dashes (copy-paste from docs often converts -- to em-dash)
            .replace(/\u2014/g, "--")
            .replace(/\u2013/g, "--")
            .split(/\s+/)
            .filter(Boolean)
        : [];

      // 4. Get DB path for MCP server
      const dataDir = await appDataDir();
      const dbPath = `${dataDir}/element.db`;

      // 5. Generate MCP config and system prompt
      const configPath = await generateMcpConfig(dbPath);
      const promptPath = await generateSystemPrompt();

      // 6. Build agent launch args
      const agentArgs = [
        ...userArgs,
        "--mcp-config",
        configPath,
        `@${promptPath}`,
      ];

      // 7. Store command/args for AgentTerminalTab to consume
      setAgentCommand(command);
      setAgentArgs(agentArgs);

      // 8. Set running and reset restart count
      setStatus("running");
      resetRestartCount();
    } catch (err) {
      setStatus("stopped");
      toast(`Agent failed to start: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [setStatus, resetRestartCount, setAgentCommand, setAgentArgs, generateMcpConfig, generateSystemPrompt]);

  const handleAgentExit = useCallback(
    (exitCode: number) => {
      // Clear any existing restart timer
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      // Graceful exit
      if (exitCode === 0) {
        setStatus("idle");
        return;
      }

      // Check restart count from store
      const { restartCount } = useAgentStore.getState();

      // Max retries exceeded
      if (restartCount >= MAX_RETRIES) {
        setStatus("stopped");
        toast(
          "Agent failed to start after 3 attempts. Click Restart to try again."
        );
        return;
      }

      // Schedule restart with backoff
      setStatus("error");
      incrementRestart();
      const delay = BACKOFF_MS[restartCount] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
      restartTimerRef.current = setTimeout(startAgent, delay);
    },
    [setStatus, incrementRestart, startAgent]
  );

  const restartAgent = useCallback(async () => {
    // Clear any pending restart timer
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    resetRestartCount();
    await startAgent();
  }, [resetRestartCount, startAgent]);

  return {
    startAgent,
    restartAgent,
    handleAgentExit,
  };
}
