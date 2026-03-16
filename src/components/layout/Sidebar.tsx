import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { CalendarToggle } from "@/components/sidebar/CalendarToggle";
import { MiniCalendar } from "@/components/sidebar/MiniCalendar";
import { ProjectList } from "@/components/sidebar/ProjectList";
import { TaskList } from "@/components/sidebar/TaskList";
import { WorkflowList } from "@/components/sidebar/WorkflowList";

export function Sidebar() {
  const calendarVisible = useWorkspaceStore((s) => s.calendarVisible);

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
    </div>
  );
}
