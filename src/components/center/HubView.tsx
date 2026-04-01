import { useState, useCallback } from "react";
import { usePanelRef, type PanelSize } from "react-resizable-panels";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { HubCenterPanel } from "@/components/hub/HubCenterPanel";
import { CalendarPlaceholder } from "@/components/hub/CalendarPlaceholder";
import { MinimizedColumn } from "@/components/hub/MinimizedColumn";
import { GoalsTreePanel } from "@/components/hub/GoalsTreePanel";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

const GOALS_PANEL_ID = "hub-goals";
const CENTER_PANEL_ID = "hub-center";
const CALENDAR_PANEL_ID = "hub-calendar";

export function HubView() {
  const hubLayout = useWorkspaceStore((s) => s.hubLayout);
  const setHubLayout = useWorkspaceStore((s) => s.setHubLayout);

  const goalsPanelRef = usePanelRef();
  const calendarPanelRef = usePanelRef();

  const [goalsCollapsed, setGoalsCollapsed] = useState(hubLayout.goalsCollapsed);
  const [calendarCollapsed, setCalendarCollapsed] = useState(hubLayout.calendarCollapsed);

  const handleGoalsResize = useCallback(
    (panelSize: PanelSize) => {
      const collapsed = panelSize.asPercentage === 0;
      setGoalsCollapsed(collapsed);
      setHubLayout({ goalsCollapsed: collapsed, goalsPanelSize: panelSize.asPercentage });
    },
    [setHubLayout]
  );

  const handleCalendarResize = useCallback(
    (panelSize: PanelSize) => {
      const collapsed = panelSize.asPercentage === 0;
      setCalendarCollapsed(collapsed);
      setHubLayout({ calendarCollapsed: collapsed, calendarPanelSize: panelSize.asPercentage });
    },
    [setHubLayout]
  );

  const handleCenterResize = useCallback(
    (panelSize: PanelSize) => {
      setHubLayout({ centerPanelSize: panelSize.asPercentage });
    },
    [setHubLayout]
  );

  return (
    <div className="h-full flex">
      {goalsCollapsed && (
        <MinimizedColumn
          label="Goals"
          side="left"
          onExpand={() => {
            goalsPanelRef.current?.expand();
          }}
        />
      )}
      <div className="flex-1 h-full">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            id={GOALS_PANEL_ID}
            panelRef={goalsPanelRef}
            defaultSize={hubLayout.goalsPanelSize}
            minSize={15}
            collapsible
            collapsedSize={0}
            onResize={handleGoalsResize}
          >
            <GoalsTreePanel />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            id={CENTER_PANEL_ID}
            defaultSize={hubLayout.centerPanelSize}
            minSize={30}
            onResize={handleCenterResize}
          >
            <HubCenterPanel />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            id={CALENDAR_PANEL_ID}
            panelRef={calendarPanelRef}
            defaultSize={hubLayout.calendarPanelSize}
            minSize={15}
            collapsible
            collapsedSize={0}
            onResize={handleCalendarResize}
          >
            <CalendarPlaceholder />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      {calendarCollapsed && (
        <MinimizedColumn
          label="Calendar"
          side="right"
          onExpand={() => {
            calendarPanelRef.current?.expand();
          }}
        />
      )}
    </div>
  );
}
