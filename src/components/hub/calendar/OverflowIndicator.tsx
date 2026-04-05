import { ChevronDown, ChevronUp } from "lucide-react";

interface OverflowIndicatorProps {
  count: number;
  direction: "earlier" | "later";
  onClick: () => void;
}

export function OverflowIndicator({ count, direction, onClick }: OverflowIndicatorProps) {
  if (count === 0) return null;

  const Icon = direction === "earlier" ? ChevronUp : ChevronDown;
  const label = `${count} ${direction}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1 w-full py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <Icon className="size-3" />
      <span>{label}</span>
    </button>
  );
}
