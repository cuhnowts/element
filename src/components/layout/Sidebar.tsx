import { Settings } from "lucide-react";
import { CalendarToggle } from "@/components/sidebar/CalendarToggle";
import { MiniCalendar } from "@/components/sidebar/MiniCalendar";
import { ThemeSidebar } from "@/components/sidebar/ThemeSidebar";
import { WorkflowList } from "@/components/sidebar/WorkflowList";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function Sidebar() {
  const calendarVisible = useWorkspaceStore((s) => s.calendarVisible);
  const openSettings = useStore((s) => s.openSettings);

  return (
    <div className="flex flex-col h-full bg-card">
      <CalendarToggle />
      {calendarVisible && <MiniCalendar />}
      <div className="border-b border-border" />
      <div className="flex-1 overflow-hidden">
        <ThemeSidebar />
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
