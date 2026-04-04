import { useState, useCallback } from "react";
import { usePanelRef, type PanelSize } from "react-resizable-panels";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { HubCenterPanel } from "@/components/hub/HubCenterPanel";
import { HubCalendar } from "@/components/hub/calendar/HubCalendar";
import { MinimizedColumn, ColumnRibbon } from "@/components/hub/MinimizedColumn";
import { GoalsTreePanel } from "@/components/hub/GoalsTreePanel";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

const GOALS_PANEL_ID = "hub-goals";
const CENTER_PANEL_ID = "hub-center";
const CALENDAR_PANEL_ID = "hub-calendar";

export function HubView() {
  const hubLayout = useWorkspaceStore((s) => s.hubLayout);
  const setHubLayout = useWorkspaceStore((s) => s.setHubLayout);

  const goalsPanelRef = usePanelRef();
  const centerPanelRef = usePanelRef();
  const calendarPanelRef = usePanelRef();

  const [goalsCollapsed, setGoalsCollapsed] = useState(hubLayout.goalsCollapsed);
  const [centerCollapsed, setCenterCollapsed] = useState(false);
  const [calendarCollapsed, setCalendarCollapsed] = useState(hubLayout.calendarCollapsed);

  const handleGoalsResize = useCallback(
    (panelSize: PanelSize) => {
      const collapsed = panelSize.asPercentage === 0;
      setGoalsCollapsed(collapsed);
      setHubLayout({ goalsCollapsed: collapsed, goalsPanelSize: panelSize.asPercentage });
    },
    [setHubLayout]
  );

  const handleCenterResize = useCallback(
    (panelSize: PanelSize) => {
      const collapsed = panelSize.asPercentage === 0;
      setCenterCollapsed(collapsed);
      setHubLayout({ centerPanelSize: panelSize.asPercentage });
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

  return (
    <div className="h-full flex">
      {goalsCollapsed && (
        <MinimizedColumn
          label="Goals"
          side="left"
          onExpand={() => goalsPanelRef.current?.expand()}
        />
      )}
      {centerCollapsed && (
        <MinimizedColumn
          label="Briefing"
          side="left"
          onExpand={() => centerPanelRef.current?.expand()}
        />
      )}
      <div className="flex-1 h-full">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            id={GOALS_PANEL_ID}
            panelRef={goalsPanelRef}
            defaultSize={hubLayout.goalsPanelSize}
            minSize={10}
            collapsible
            collapsedSize={0}
            onResize={handleGoalsResize}
          >
            <div className="h-full flex flex-col">
              <ColumnRibbon label="Goals" onMinimize={() => goalsPanelRef.current?.collapse()} />
              <div className="flex-1 min-h-0 overflow-auto">
                <GoalsTreePanel />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            id={CENTER_PANEL_ID}
            panelRef={centerPanelRef}
            defaultSize={hubLayout.centerPanelSize}
            minSize={15}
            collapsible
            collapsedSize={0}
            onResize={handleCenterResize}
          >
            <div className="h-full flex flex-col">
              <ColumnRibbon label="Briefing" onMinimize={() => centerPanelRef.current?.collapse()} />
              <div className="flex-1 min-h-0">
                <HubCenterPanel />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            id={CALENDAR_PANEL_ID}
            panelRef={calendarPanelRef}
            defaultSize={hubLayout.calendarPanelSize}
            minSize={10}
            collapsible
            collapsedSize={0}
            onResize={handleCalendarResize}
          >
            <div className="h-full flex flex-col">
              <ColumnRibbon label="Calendar" onMinimize={() => calendarPanelRef.current?.collapse()} />
              <div className="flex-1 min-h-0">
                <HubCalendar />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      {calendarCollapsed && (
        <MinimizedColumn
          label="Calendar"
          side="right"
          onExpand={() => calendarPanelRef.current?.expand()}
        />
      )}
    </div>
  );
}
