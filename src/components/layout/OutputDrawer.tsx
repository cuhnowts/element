import { useState } from "react";
import { useTaskStore } from "@/stores/useTaskStore";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { LogViewer } from "@/components/output/LogViewer";
import { ExecutionHistory } from "@/components/output/ExecutionHistory";
import { RunHistoryList } from "@/components/output/RunHistoryList";
import { RunHistoryDetail } from "@/components/output/RunHistoryDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type Tab = "logs" | "history" | "runs";

export function OutputDrawer() {
  const [activeTab, setActiveTab] = useState<Tab>("logs");
  const executionLogs = useTaskStore((s) => s.executionLogs);
  const executionHistory = useTaskStore((s) => s.executionHistory);
  const fetchExecutionLogs = useTaskStore((s) => s.fetchExecutionLogs);
  const clearLogs = useTaskStore((s) => s.clearLogs);

  const drawerOpen = useWorkspaceStore((s) => s.drawerOpen);
  const toggleDrawer = useWorkspaceStore((s) => s.toggleDrawer);

  const selectedWorkflowId = useWorkflowStore((s) => s.selectedWorkflowId);
  const runs = useWorkflowStore((s) => s.runs);
  const selectedRun = useWorkflowStore((s) => s.selectedRun);
  const selectedRunSteps = useWorkflowStore((s) => s.selectedRunSteps);
  const selectRun = useWorkflowStore((s) => s.selectRun);

  const hasWorkflow = selectedWorkflowId !== null;

  const tabClass = (tab: Tab) =>
    `text-xs font-semibold tracking-wide uppercase px-2 py-1 rounded transition-colors ${
      activeTab === tab
        ? "text-foreground bg-muted"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col h-full bg-card border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setActiveTab("logs")} className={tabClass("logs")}>
            Logs
          </button>
          <button type="button" onClick={() => setActiveTab("history")} className={tabClass("history")}>
            History
          </button>
          {hasWorkflow && (
            <button
              type="button"
              onClick={() => {
                selectRun(null);
                setActiveTab("runs");
              }}
              className={tabClass("runs")}
            >
              Run History
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "logs" && executionLogs.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={clearLogs}>
              Clear Logs
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-xs" onClick={toggleDrawer}>
            {drawerOpen ? "Hide Output" : "Show Output"}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === "logs" ? (
          <LogViewer entries={executionLogs} />
        ) : activeTab === "history" ? (
          <ExecutionHistory
            records={executionHistory}
            onSelectExecution={(executionId) => {
              fetchExecutionLogs(executionId);
              setActiveTab("logs");
            }}
          />
        ) : activeTab === "runs" && selectedRun ? (
          <div className="h-full overflow-auto">
            <div className="px-4 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectRun(null)}
                className="text-muted-foreground -ml-2"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                All runs
              </Button>
            </div>
            <RunHistoryDetail run={selectedRun} steps={selectedRunSteps} />
          </div>
        ) : (
          <RunHistoryList
            runs={runs}
            selectedRunId={selectedRun?.id}
            onSelectRun={(run) => selectRun(run)}
          />
        )}
      </div>
    </div>
  );
}
