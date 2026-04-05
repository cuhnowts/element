import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { HubToolbar } from "@/components/hub/HubToolbar";
import { HubCenterPanel } from "@/components/hub/HubCenterPanel";
import { SlideOverPanel } from "@/components/hub/SlideOverPanel";
import { GoalsTreePanel } from "@/components/hub/GoalsTreePanel";
import { HubCalendar } from "@/components/hub/calendar/HubCalendar";

export function HubView() {
  const calendarOpen = useWorkspaceStore((s) => s.hubCalendarOpen);
  const goalsOpen = useWorkspaceStore((s) => s.hubGoalsOpen);

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Toolbar -- per D-01, sits at top of HubView */}
      <HubToolbar />

      {/* Center content -- always full width per D-03 */}
      <div className="relative flex-1 min-h-0">
        <HubCenterPanel />

        {/* Overlay panels -- absolute positioned, float over center per D-03 */}
        <SlideOverPanel open={calendarOpen} side="left">
          <HubCalendar />
        </SlideOverPanel>
        <SlideOverPanel open={goalsOpen} side="right">
          <GoalsTreePanel />
        </SlideOverPanel>
      </div>
    </div>
  );
}
