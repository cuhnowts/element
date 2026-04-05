import { X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TerminalSession } from "@/stores/useTerminalSessionStore";

interface SessionTabProps {
  session: TerminalSession;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

export function SessionTab({ session, isActive, onClick, onClose }: SessionTabProps) {
  const displayName = session.status === "exited" ? "Process exited" : session.name;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            className={`group flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold tracking-wide uppercase transition-colors ${
              isActive ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground"
            }`}
          />
        }
      >
        <span className="truncate max-w-[160px]">{displayName}</span>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: interactive element with click handler */}
        <span
          // biome-ignore lint/a11y/noNoninteractiveTabindex: custom interactive element needs focus
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onClose();
            }
          }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
        >
          <X className="size-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{session.name}</TooltipContent>
    </Tooltip>
  );
}
