import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepInsertButtonProps {
  onClick: () => void;
}

export function StepInsertButton({ onClick }: StepInsertButtonProps) {
  return (
    <div className="flex justify-center py-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/10"
        onClick={onClick}
        aria-label="Insert step"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
