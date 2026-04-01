import { useMemo } from "react";
import { useStore } from "@/stores";
import { useTaskStore } from "@/stores/useTaskStore";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useTerminalSessionStore } from "@/stores/useTerminalSessionStore";
import { LogViewer } from "@/components/output/LogViewer";
import { ExecutionHistory } from "@/components/output/ExecutionHistory";
import { RunHistoryList } from "@/components/output/RunHistoryList";
import { RunHistoryDetail } from "@/components/output/RunHistoryDetail";
import { TerminalPane } from "@/components/output/TerminalPane";
import { SessionTabBar } from "@/components/output/SessionTabBar";
import { TerminalEmptyState } from "@/components/output/TerminalEmptyState";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";

const EMPTY_SESSIONS: import("@/stores/useTerminalSessionStore").TerminalSession[] = [];

export function OutputDrawer() {
  const executionLogs = useTaskStore((s) => s.executionLogs);
  const executionHistory = useTaskStore((s) => s.executionHistory);
  const fetchExecutionLogs = useTaskStore((s) => s.fetchExecutionLogs);

  const activeDrawerTab = useWorkspaceStore((s) => s.activeDrawerTab);
  const setActiveDrawerTab = useWorkspaceStore((s) => s.setActiveDrawerTab);

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

  const sessions = useTerminalSessionStore(
    (s) => s.sessions[selectedProjectId ?? ""] ?? EMPTY_SESSIONS
  );
  const activeSessionId = useTerminalSessionStore(
    (s) => s.activeSessionId[selectedProjectId ?? ""] ?? null
  );

  // All project IDs that have sessions — render hidden TerminalPanes to keep PTYs alive
  const allSessions = useTerminalSessionStore((s) => s.sessions);
  const allSessionProjectIds = useMemo(
    () => Object.keys(allSessions).filter((pid) => allSessions[pid].length > 0),
    [allSessions]
  );

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
            onSelectExecution={(executionId: string) => {
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
          {directoryPath && selectedProjectId ? (
            <div className="h-full flex flex-col">
              <SessionTabBar
                projectId={selectedProjectId}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSwitch={(sessionId) =>
                  useTerminalSessionStore
                    .getState()
                    .switchSession(selectedProjectId, sessionId)
                }
                onClose={(sessionId) =>
                  useTerminalSessionStore
                    .getState()
                    .closeSession(selectedProjectId, sessionId)
                }
                onCreate={() => {
                  const nextNum =
                    sessions.filter((s) => s.type === "shell").length + 1;
                  useTerminalSessionStore
                    .getState()
                    .createSession(
                      selectedProjectId,
                      `Shell ${nextNum}`,
                      "shell"
                    );
                }}
              />
              <div className="flex-1 overflow-hidden relative">
                {allSessionProjectIds.map((pid) => {
                  const proj = projects.find((p) => p.id === pid);
                  if (!proj?.directoryPath) return null;
                  return (
                    <div
                      key={pid}
                      style={{ display: pid === selectedProjectId ? "block" : "none" }}
                      className="h-full w-full absolute inset-0"
                    >
                      <TerminalPane
                        projectId={pid}
                        directoryPath={proj.directoryPath}
                        isVisible={activeDrawerTab === "terminal" && pid === selectedProjectId}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
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
