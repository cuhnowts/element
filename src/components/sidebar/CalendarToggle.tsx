import { Switch } from "@/components/ui/switch";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function CalendarToggle() {
  const calendarVisible = useWorkspaceStore((s) => s.calendarVisible);
  const toggleCalendar = useWorkspaceStore((s) => s.toggleCalendar);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        Calendar
      </span>
      <Switch
        checked={calendarVisible}
        onCheckedChange={toggleCalendar}
        aria-label="Toggle calendar visibility"
      />
    </div>
  );
}
