import { useStore } from "@/stores";
import { useTaskStore } from "@/stores/useTaskStore";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { LogViewer } from "@/components/output/LogViewer";
import { ExecutionHistory } from "@/components/output/ExecutionHistory";
import { RunHistoryList } from "@/components/output/RunHistoryList";
import { RunHistoryDetail } from "@/components/output/RunHistoryDetail";
import { TerminalTab } from "@/components/output/TerminalTab";
import { TerminalEmptyState } from "@/components/output/TerminalEmptyState";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";

export function OutputDrawer() {
  const executionLogs = useTaskStore((s) => s.executionLogs);
  const executionHistory = useTaskStore((s) => s.executionHistory);
  const fetchExecutionLogs = useTaskStore((s) => s.fetchExecutionLogs);

  const activeDrawerTab = useWorkspaceStore((s) => s.activeDrawerTab);
  const setActiveDrawerTab = useWorkspaceStore((s) => s.setActiveDrawerTab);
  const terminalSessionKey = useWorkspaceStore((s) => s.terminalSessionKey);
  const terminalInitialCommand = useWorkspaceStore((s) => s.terminalInitialCommand);

  const selectedWorkflowId = useWorkflowStore((s) => s.selectedWorkflowId);
  const runs = useWorkflowStore((s) => s.runs);
  const selectedRun = useWorkflowStore((s) => s.selectedRun);
  const selectedRunSteps = useWorkflowStore((s) => s.selectedRunSteps);
  const selectRun = useWorkflowStore((s) => s.selectRun);

  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const projects = useStore((s) => s.projects);
  const linkDirectory = useStore((s) => s.linkDirectory);

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;
  const directoryPath = selectedProject?.directoryPath ?? null;

  const hasWorkflow = selectedWorkflowId !== null;


  const handleLinkDirectory = async () => {
    if (!selectedProjectId) return;
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select project directory",
    });
    if (typeof selected === "string") {
      linkDirectory(selectedProjectId, selected);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex-1 overflow-hidden relative">
        <div style={{ display: activeDrawerTab === "logs" ? "block" : "none" }} className="h-full">
          <LogViewer entries={executionLogs} />
        </div>
        <div style={{ display: activeDrawerTab === "history" ? "block" : "none" }} className="h-full">
          <ExecutionHistory
            records={executionHistory}
            onSelectExecution={(executionId) => {
              fetchExecutionLogs(executionId);
              setActiveDrawerTab("logs");
            }}
          />
        </div>
        <div style={{ display: activeDrawerTab === "runs" ? "block" : "none" }} className="h-full">
          {hasWorkflow && selectedRun ? (
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
          ) : hasWorkflow ? (
            <RunHistoryList
              runs={runs}
              selectedRunId={selectedRun?.id}
              onSelectRun={(run) => selectRun(run)}
            />
          ) : null}
        </div>
        <div style={{ display: activeDrawerTab === "terminal" ? "block" : "none" }} className="h-full">
          {directoryPath ? (
            <TerminalTab
              key={`terminal-${selectedProjectId}-${directoryPath}-${terminalSessionKey}`}
              cwd={directoryPath}
              isVisible={activeDrawerTab === "terminal"}
              initialCommand={terminalInitialCommand}
            />
          ) : (
            <TerminalEmptyState
              hasProject={!!selectedProjectId}
              onLinkDirectory={handleLinkDirectory}
            />
          )}
        </div>
      </div>
    </div>
  );
}
