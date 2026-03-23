import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";

interface OnboardingWaitingCardProps {
  scope: string;
  planDetected: boolean;
  onCancel: () => void;
}

export function OnboardingWaitingCard({ scope, planDetected, onCancel }: OnboardingWaitingCardProps) {
  const truncatedScope = scope.length > 120 ? scope.slice(0, 120) + "..." : scope;
  return (
    <div className="bg-card rounded-lg p-12 text-center max-w-md mx-auto mt-12" role="status">
      {planDetected ? (
        <CheckCircle2 className="h-6 w-6 text-chart-2 mx-auto mb-4" />
      ) : (
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mx-auto mb-4" aria-label="AI planning in progress" />
      )}
      <h3 className="text-base font-semibold mb-3">
        {planDetected ? "Plan ready for review" : "AI setup in progress..."}
      </h3>
      <p className="text-xs text-muted-foreground mb-2">
        Scope: &ldquo;{truncatedScope}&rdquo;
      </p>
      {!planDetected && (
        <>
          <p className="text-xs text-muted-foreground mb-6">
            Check the Terminal tab to interact with the AI.
          </p>
          <Button variant="ghost" className="text-destructive" onClick={onCancel}>
            Stop AI setup
          </Button>
        </>
      )}
    </div>
  );
}
