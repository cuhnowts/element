import { Bot, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/tauri";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useTerminalSessionStore } from "@/stores/useTerminalSessionStore";
import { useAgentStore } from "@/stores/useAgentStore";
import { RefreshContextDialog } from "@/components/output/RefreshContextDialog";
import { toast } from "sonner";

export interface AiButtonState {
  label: "Link Directory" | "Plan Project" | "Check Progress" | "Open AI";
  disabled: boolean;
  tooltip: string | undefined;
  showSpinner: boolean;
}

export function getAiButtonState(project: {
  directoryPath: string | null;
  planningTier: string | null;
  hasContent: boolean;
  isExecuting: boolean;
}): AiButtonState {
  if (!project.directoryPath) {
    return { label: "Link Directory", disabled: true, tooltip: "Link a directory first", showSpinner: false };
  }
  if (!project.planningTier && !project.hasContent) {
    return { label: "Plan Project", disabled: false, tooltip: undefined, showSpinner: false };
  }
  if (project.isExecuting) {
    return { label: "Open AI", disabled: false, tooltip: undefined, showSpinner: true };
  }
  if (project.hasContent) {
    return { label: "Check Progress", disabled: false, tooltip: undefined, showSpinner: false };
  }
  return { label: "Open AI", disabled: false, tooltip: undefined, showSpinner: false };
}

interface OpenAiButtonProps {
  projectId: string;
  projectName?: string;
  directoryPath: string | null;
  planningTier: string | null;
  hasContent: boolean;
  onTierDialogOpen: () => void;
}

export function OpenAiButton({
  projectId,
  projectName,
  directoryPath,
  planningTier,
  hasContent,
  onTierDialogOpen,
}: OpenAiButtonProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<{ command: string; args: string[] } | null>(null);
  const openTerminal = useWorkspaceStore((s) => s.openTerminal);

  const buttonState = getAiButtonState({
    directoryPath,
    planningTier,
    hasContent,
    isExecuting: isLaunching,
  });

  const handleOpenAi = async () => {
    if (buttonState.disabled) return;

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

    // D-12: Delegate to agent when running -- write session request to queue
    const agentStatus = useAgentStore.getState().status;
    if (agentStatus === "running" || agentStatus === "idle") {
      try {
        const { writeSessionRequest } = await import("@/hooks/useAgentQueue");
        await writeSessionRequest(projectId, `AI: ${projectName ?? "Project"}`);
        toast.success("Session requested -- agent is setting up context");
      } catch (e) {
        toast.error(`Failed to request agent session: ${e}`);
      }
      return;
    }

    // Fallback: if agent not running, use existing direct launch behavior
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
      // session creation from executing on a broken watcher state.
      if (effectiveTier !== "full") {
        try {
          await api.startPlanWatcher(directoryPath);
        } catch {
          toast.error("Could not start plan watcher. Please try again.");
          return;
        }
      }

      // 6. Build full command + args
      // Fix macOS smart-dash substitution: em-dash (--) back to double-hyphen (--)
      const fullArgs: string[] = [];
      if (args) {
        const sanitized = args.replace(/\u2014/g, "--").replace(/\u2013/g, "-");
        fullArgs.push(...sanitized.trim().split(/\s+/));
      }
      // Use @ prefix so Claude Code loads the file as context
      fullArgs.push(`@${contextPath}`);

      // Check for existing AI session (D-01)
      const existingAiSession = useTerminalSessionStore.getState().findAiSession(projectId);
      if (existingAiSession) {
        // Store the command for after dialog resolution
        setPendingCommand({ command, args: fullArgs });
        setRefreshDialogOpen(true);
        return;
      }

      // No existing AI session -- create one directly
      const sessionName = "AI Planning";
      useTerminalSessionStore.getState().createSession(
        projectId, sessionName, "ai", { command, args: fullArgs }
      );
      openTerminal();
    } catch (e) {
      toast.error(`Failed to launch AI: ${e}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleRefresh = () => {
    if (!pendingCommand) return;
    const existingAiSession = useTerminalSessionStore.getState().findAiSession(projectId);
    if (existingAiSession) {
      useTerminalSessionStore.getState().closeSession(projectId, existingAiSession.id);
    }
    const sessionName = "AI Planning";
    useTerminalSessionStore.getState().createSession(
      projectId, sessionName, "ai", pendingCommand
    );
    openTerminal();
    setPendingCommand(null);
    setRefreshDialogOpen(false);
  };

  const handleKeepExisting = () => {
    const existingAiSession = useTerminalSessionStore.getState().findAiSession(projectId);
    if (existingAiSession) {
      useTerminalSessionStore.getState().switchSession(projectId, existingAiSession.id);
    }
    openTerminal();
    setPendingCommand(null);
    setRefreshDialogOpen(false);
  };

  if (buttonState.tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAi}
                aria-disabled={buttonState.disabled}
                className={`gap-1.5${buttonState.disabled ? " opacity-50 cursor-not-allowed" : ""}`}
              />
            }
          >
            {buttonState.showSpinner ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Bot className="size-3.5" />
            )}
            {buttonState.label}
          </TooltipTrigger>
          <TooltipContent>{buttonState.tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenAi}
        aria-disabled={buttonState.disabled}
        className={`gap-1.5${buttonState.disabled ? " opacity-50 cursor-not-allowed" : ""}`}
      >
        {buttonState.showSpinner ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Bot className="size-3.5" />
        )}
        {buttonState.label}
      </Button>
      <RefreshContextDialog
        open={refreshDialogOpen}
        onOpenChange={setRefreshDialogOpen}
        onRefresh={handleRefresh}
        onKeepExisting={handleKeepExisting}
      />
    </>
  );
}
