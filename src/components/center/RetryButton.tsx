import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/stores/useWorkflowStore";

interface RetryButtonProps {
  workflowId: string;
  runId: string;
  stepIndex: number;
  onRetry: () => void;
}

export function RetryButton({ workflowId, runId, stepIndex, onRetry }: RetryButtonProps) {
  const retryStep = useWorkflowStore((s) => s.retryStep);

  const handleRetry = async () => {
    await retryStep(workflowId, runId, stepIndex);
    onRetry();
  };

  return (
    <Button variant="destructive" size="sm" onClick={handleRetry} aria-label="Retry step">
      <RotateCcw className="h-3 w-3 mr-1" />
      Retry Step
    </Button>
  );
}
