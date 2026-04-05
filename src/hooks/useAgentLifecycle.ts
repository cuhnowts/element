import { appDataDir } from "@tauri-apps/api/path";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAgentMcp } from "@/hooks/useAgentMcp";
import { api } from "@/lib/tauri";
import { useAgentStore } from "@/stores/useAgentStore";

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
            .replace(/\u2014/g, "--")
            .replace(/\u2013/g, "--")
            .split(/\s+/)
            .filter(Boolean)
        : [];

      // 4. Try to generate MCP config + prompt (best-effort — don't block agent start)
      const extraArgs: string[] = [];
      try {
        const dataDir = await appDataDir();
        const dbPath = `${dataDir}/element.db`;
        const configPath = await generateMcpConfig(dbPath);
        extraArgs.push("--mcp-config", configPath);
      } catch {
        // MCP config failed — agent starts without Element tools
      }
      try {
        const promptPath = await generateSystemPrompt();
        extraArgs.push(`@${promptPath}`);
      } catch {
        // System prompt failed — agent starts without custom prompt
      }

      // 5. Store command/args for AgentTerminalTab to consume
      setAgentCommand(command);
      setAgentArgs([...userArgs, ...extraArgs]);

      // 6. Set running and reset restart count
      setStatus("running");
      resetRestartCount();
    } catch (err) {
      setStatus("stopped");
      toast(`Agent failed to start: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [
    setStatus,
    resetRestartCount,
    setAgentCommand,
    setAgentArgs,
    generateMcpConfig,
    generateSystemPrompt,
  ]);

  const handleAgentExit = useCallback(
    (exitCode: number) => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      if (exitCode === 0) {
        setStatus("idle");
        return;
      }

      const { restartCount } = useAgentStore.getState();

      if (restartCount >= MAX_RETRIES) {
        setStatus("stopped");
        toast("Agent failed to start after 3 attempts. Click Restart to try again.");
        return;
      }

      setStatus("error");
      incrementRestart();
      const delay = BACKOFF_MS[restartCount] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
      restartTimerRef.current = setTimeout(startAgent, delay);
    },
    [setStatus, incrementRestart, startAgent],
  );

  const restartAgent = useCallback(async () => {
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
