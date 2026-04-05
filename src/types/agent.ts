export type AgentStatus = "starting" | "running" | "idle" | "error" | "stopped";

export type AgentEntryType =
  | "execution_start"
  | "execution_complete"
  | "planning_complete"
  | "context_seeded"
  | "human_needed"
  | "error"
  | "approval_request";

export interface AgentActivityEntry {
  id: string;
  type: AgentEntryType;
  title: string;
  description: string;
  projectId?: string;
  projectName?: string;
  phaseId?: string;
  phaseName?: string;
  timestamp: number;
  approvalStatus?: "pending" | "approved" | "rejected";
}

export interface AgentState {
  // Panel -- panelOpen REMOVED per D-14
  activeTab: "activity" | "terminal";

  // Agent lifecycle
  status: AgentStatus;
  restartCount: number;
  agentCommand: string | null;
  agentArgs: string[] | null;

  // Activity
  entries: AgentActivityEntry[];

  // Computed
  pendingApprovalCount: () => number;

  // Actions -- togglePanel REMOVED per D-14
  setActiveTab: (tab: "activity" | "terminal") => void;
  setStatus: (status: AgentStatus) => void;
  setAgentCommand: (cmd: string | null) => void;
  setAgentArgs: (args: string[] | null) => void;
  addEntry: (entry: Omit<AgentActivityEntry, "id" | "timestamp"> & { id?: string }) => void;
  approveEntry: (entryId: string) => void;
  rejectEntry: (entryId: string) => void;
  clearEntries: () => void;
  incrementRestart: () => void;
  resetRestartCount: () => void;
}
