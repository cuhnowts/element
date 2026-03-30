import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { SessionTab } from "@/components/output/SessionTab";
import type { TerminalSession } from "@/stores/useTerminalSessionStore";

interface SessionTabBarProps {
  projectId: string;
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onSwitch: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onCreate: () => void;
}

export function SessionTabBar({
  sessions,
  activeSessionId,
  onSwitch,
  onClose,
  onCreate,
}: SessionTabBarProps) {
  return (
    <div className="flex items-center h-8 border-b border-border px-4 gap-1">
      <div className="flex-1 overflow-x-auto flex items-center gap-1 scrollbar-hide">
        {sessions.map((session) => (
          <SessionTab
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onClick={() => onSwitch(session.id)}
            onClose={() => onClose(session.id)}
          />
        ))}
      </div>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onCreate}
            />
          }
        >
          <Plus className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          New Session
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
