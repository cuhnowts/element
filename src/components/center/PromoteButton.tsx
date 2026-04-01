import { useState } from "react";
import type { Workflow } from "@/types/workflow";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Zap, GitBranch, Loader2 } from "lucide-react";

interface PromoteButtonProps {
  taskId: string;
  variant?: "button" | "menu-item";
  onPromoted?: (workflow: Workflow) => void;
}

export function PromoteButton({
  taskId,
  variant = "button",
  onPromoted,
}: PromoteButtonProps) {
  const [isPromoting, setIsPromoting] = useState(false);

  const handlePromote = async () => {
    setIsPromoting(true);
    try {
      const workflow = await useWorkflowStore.getState().promoteTask(taskId);
      await useWorkflowStore.getState().selectWorkflow(workflow.id);
      useStore.getState().setActiveView('workflow');
      // Deselect task so CenterPanel shows workflow
      useWorkspaceStore.getState().selectTask(null);
      onPromoted?.(workflow);
    } catch (error) {
      console.error("Failed to promote task to workflow:", error);
    } finally {
      setIsPromoting(false);
    }
  };

  if (variant === "menu-item") {
    return (
      <button
        type="button"
        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={handlePromote}
        disabled={isPromoting}
      >
        <GitBranch className="h-4 w-4" />
        {isPromoting ? "Converting..." : "Convert to Workflow"}
      </button>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handlePromote}
      disabled={isPromoting}
    >
      {isPromoting ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <Zap className="h-4 w-4 mr-1" />
      )}
      Automate
    </Button>
  );
}
