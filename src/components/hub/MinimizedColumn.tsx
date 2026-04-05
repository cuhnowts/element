import { Minus, Plus } from "lucide-react";
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
        "flex flex-col items-center py-2 gap-1.5 w-8 h-full bg-card shrink-0",
        side === "left" ? "border-r border-border" : "border-l border-border",
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

interface ColumnRibbonProps {
  label: string;
  onMinimize: () => void;
}

export function ColumnRibbon({ label, onMinimize }: ColumnRibbonProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-card/50 shrink-0">
      <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={onMinimize}
        aria-label={`Minimize ${label}`}
        className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
      >
        <Minus className="size-3" />
      </button>
    </div>
  );
}
