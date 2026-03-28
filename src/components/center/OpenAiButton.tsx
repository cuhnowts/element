import { Bot } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/tauri";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { toast } from "sonner";

interface OpenAiButtonProps {
  projectId: string;
  directoryPath: string | null;
}

export function OpenAiButton({ projectId, directoryPath }: OpenAiButtonProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const launchTerminalCommand = useWorkspaceStore((s) => s.launchTerminalCommand);

  const handleOpenAi = async () => {
    if (!directoryPath) {
      toast.error("Link a project directory first. The AI tool needs a directory to work in.");
      return;
    }

    setIsLaunching(true);
    try {
      // 1. Read CLI settings
      const command = await api.getAppSetting("cli_command");
      const args = await api.getAppSetting("cli_args");

      // 2. Check if CLI tool is configured
      if (!command) {
        toast.error("No AI tool configured. Set one up in Settings > AI.");
        return;
      }

      // 3. Validate tool exists on system
      const isValid = await api.validateCliTool(command);
      if (!isValid) {
        toast.error(`${command} not found on your system. Check the command in Settings > AI.`);
        return;
      }

      // 4. Generate context file (writes .element/context.md)
      const contextPath = await api.generateContextFile(projectId);

      // 5. Start plan watcher (picks up plan-output.json for AiPlanReview)
      await api.startPlanWatcher(directoryPath);

      // 6. Build full command + args
      const fullArgs: string[] = [];
      if (args) fullArgs.push(args.trim());
      // Claude CLI requires "--" before positional args to separate them from flags
      fullArgs.push("--");
      fullArgs.push(contextPath);

      launchTerminalCommand(command, fullArgs);
    } catch (e) {
      toast.error(`Failed to launch AI: ${e}`);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleOpenAi}
      disabled={isLaunching}
      className="gap-1.5"
    >
      <Bot className="size-3.5" />
      {isLaunching ? "Launching..." : "Open AI"}
    </Button>
  );
}
