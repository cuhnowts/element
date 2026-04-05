import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAgentStore } from "@/stores/useAgentStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function AgentToggleButton() {
  // togglePanel removed (D-14) -- now opens drawer to elementai tab
  const toggleDrawer = useWorkspaceStore((s) => s.toggleDrawer);
  const openDrawerToTab = useWorkspaceStore((s) => s.openDrawerToTab);
  const drawerOpen = useWorkspaceStore((s) => s.drawerOpen);
  const activeDrawerTab = useWorkspaceStore((s) => s.activeDrawerTab);
  const pendingApprovalCount = useAgentStore((s) => s.pendingApprovalCount);
  const count = pendingApprovalCount();

  const handleClick = () => {
    if (drawerOpen && activeDrawerTab === "elementai") {
      toggleDrawer();
    } else {
      openDrawerToTab("elementai");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="relative size-7 p-0"
            onClick={handleClick}
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
