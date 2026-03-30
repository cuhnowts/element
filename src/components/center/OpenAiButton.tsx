import { Bot } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/tauri";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { toast } from "sonner";

interface OpenAiButtonProps {
  projectId: string;
  directoryPath: string | null;
  planningTier: string | null;
  hasContent: boolean;
  onTierDialogOpen: () => void;
}

export function OpenAiButton({
  projectId,
  directoryPath,
  planningTier,
  hasContent,
  onTierDialogOpen,
}: OpenAiButtonProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const launchTerminalCommand = useWorkspaceStore((s) => s.launchTerminalCommand);

  const handleOpenAi = async () => {
    if (!directoryPath) {
      toast.error("Link a project directory first. The AI tool needs a directory to work in.");
      return;
    }

    // Phase 14: Check if tier dialog needed (per D-02)
    const needsTierDialog = !planningTier && !hasContent;
    if (needsTierDialog) {
      onTierDialogOpen();
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

      // 4. Generate context file with tier
      const effectiveTier = planningTier ?? "quick";
      const contextPath = await api.generateContextFile(projectId, effectiveTier);

      // 5. Start plan watcher only for Quick/Medium (D-09: skip GSD)
      // Explicit try/catch prevents watcher failure from falling into the
      // generic catch block, ensuring a descriptive toast and preventing
      // launchTerminalCommand from executing on a broken watcher state.
      if (effectiveTier !== "full") {
        try {
          await api.startPlanWatcher(directoryPath);
        } catch {
          toast.error("Could not start plan watcher. Please try again.");
          return;
        }
      }

      // 6. Build full command + args
      // Fix macOS smart-dash substitution: em-dash (—) back to double-hyphen (--)
      const fullArgs: string[] = [];
      if (args) {
        const sanitized = args.replace(/\u2014/g, "--").replace(/\u2013/g, "-");
        fullArgs.push(...sanitized.trim().split(/\s+/));
      }
      // Use @ prefix so Claude Code loads the file as context
      fullArgs.push(`@${contextPath}`);

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
