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
      // 1. Generate context file (writes .element/context.md)
      const contextPath = await api.generateContextFile(projectId);

      // 2. Start plan watcher (picks up plan-output.json for AiPlanReview)
      await api.startPlanWatcher(directoryPath);

      // 3. Kill existing PTY and spawn claude in visible terminal
      launchTerminalCommand("claude", [
        "--dangerously-skip-permissions",
        contextPath,
      ]);
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
