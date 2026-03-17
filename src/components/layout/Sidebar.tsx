import { Settings } from "lucide-react";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { CalendarToggle } from "@/components/sidebar/CalendarToggle";
import { MiniCalendar } from "@/components/sidebar/MiniCalendar";
import { ProjectList } from "@/components/sidebar/ProjectList";
import { TaskList } from "@/components/sidebar/TaskList";
import { WorkflowList } from "@/components/sidebar/WorkflowList";

export function Sidebar() {
  const calendarVisible = useWorkspaceStore((s) => s.calendarVisible);
  const openSettings = useStore((s) => s.openSettings);

  return (
    <div className="flex flex-col h-full bg-card">
      <CalendarToggle />
      {calendarVisible && <MiniCalendar />}
      <div className="border-b border-border" />
      <ProjectList />
      <div className="border-b border-border" />
      <div className="flex-1 overflow-hidden">
        <TaskList />
      </div>
      <div className="border-b border-border" />
      <div className="max-h-[200px]">
        <WorkflowList />
      </div>
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => openSettings()}
        >
          <Settings className="size-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
