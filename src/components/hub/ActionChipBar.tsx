import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, Calendar, Target, Loader2 } from "lucide-react";

interface ActionChipBarProps {
  onRunBriefing: () => void;
  isGenerating: boolean;
}

export function ActionChipBar({
  onRunBriefing,
  isGenerating,
}: ActionChipBarProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={isGenerating ? "secondary" : "outline"}
          size="sm"
          onClick={onRunBriefing}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
          ) : (
            <Sparkles className="h-4 w-4" data-icon="inline-start" />
          )}
          {isGenerating ? "Generating briefing..." : "Run Daily Briefing"}
        </Button>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              variant="outline"
              size="sm"
              disabled
              aria-disabled="true"
            >
              <Calendar className="h-4 w-4" data-icon="inline-start" />
              Organize Calendar
            </Button>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              variant="outline"
              size="sm"
              disabled
              aria-disabled="true"
            >
              <Target className="h-4 w-4" data-icon="inline-start" />
              Organize Goals
            </Button>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
