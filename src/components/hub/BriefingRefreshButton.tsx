import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BriefingRefreshButtonProps {
  disabled: boolean;
  spinning: boolean;
  onClick: () => void;
}

export function BriefingRefreshButton({
  disabled,
  spinning,
  onClick,
}: BriefingRefreshButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label="Refresh briefing"
      title="Refresh briefing"
    >
      <RefreshCw className={cn("h-4 w-4", spinning && "animate-spin")} />
    </Button>
  );
}
