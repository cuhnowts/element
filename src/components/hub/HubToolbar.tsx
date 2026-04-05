import { CalendarDays, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function HubToolbar() {
  const calendarOpen = useWorkspaceStore((s) => s.hubCalendarOpen);
  const goalsOpen = useWorkspaceStore((s) => s.hubGoalsOpen);
  const toggleCalendar = useWorkspaceStore((s) => s.toggleHubCalendar);
  const toggleGoals = useWorkspaceStore((s) => s.toggleHubGoals);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
      <Button
        variant={calendarOpen ? "default" : "ghost"}
        size="sm"
        onClick={toggleCalendar}
      >
        <CalendarDays className="mr-1.5 h-4 w-4" />
        Calendar
      </Button>
      <Button
        variant={goalsOpen ? "default" : "ghost"}
        size="sm"
        onClick={toggleGoals}
      >
        <Target className="mr-1.5 h-4 w-4" />
        Goals
      </Button>
    </div>
  );
}
