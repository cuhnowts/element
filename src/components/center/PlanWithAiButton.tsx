import { Sparkles } from "lucide-react";
import { Button } from "../ui/button";

interface PlanWithAiButtonProps {
  onPlanWithAi: () => void;
  onAddPhaseManually: () => void;
}

export function PlanWithAiButton({ onPlanWithAi, onAddPhaseManually }: PlanWithAiButtonProps) {
  return (
    <div className="bg-card rounded-lg p-8 text-center max-w-md mx-auto mt-12">
      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-base font-semibold mb-2">No phases yet</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Get an AI-generated project plan based on your scope and goals.
      </p>
      <Button onClick={onPlanWithAi} className="mb-3">
        Plan with AI
      </Button>
      <div>
        <Button variant="ghost" size="sm" onClick={onAddPhaseManually} className="text-sm">
          + Add phase manually
        </Button>
      </div>
    </div>
  );
}
