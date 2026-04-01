import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MinimizedColumnProps {
  label: string;
  side: "left" | "right";
  onExpand: () => void;
}

export function MinimizedColumn({ label, side, onExpand }: MinimizedColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center py-3 gap-2 w-10 h-full bg-card shrink-0",
        side === "left" ? "border-r border-border" : "border-l border-border"
      )}
    >
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Expand ${label} column`}
        className="p-1 rounded hover:bg-secondary text-primary"
      >
        <Plus className="size-4" />
      </button>
      <span
        className="text-xs text-muted-foreground font-medium"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        {label}
      </span>
    </div>
  );
}
