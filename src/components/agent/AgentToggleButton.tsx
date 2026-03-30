import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAgentStore } from "@/stores/useAgentStore";

export function AgentToggleButton() {
  const togglePanel = useAgentStore((s) => s.togglePanel);
  const pendingApprovalCount = useAgentStore((s) => s.pendingApprovalCount);
  const count = pendingApprovalCount();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="relative size-7 p-0"
            onClick={togglePanel}
          />
        }
      >
        <Bot className="size-3.5" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="size-4 p-0 text-[10px] justify-center absolute -top-1 -right-1"
          >
            {count > 9 ? "9+" : count}
          </Badge>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Toggle Agent Panel (Cmd+Shift+A)
      </TooltipContent>
    </Tooltip>
  );
}
