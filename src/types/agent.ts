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
  // Panel
  panelOpen: boolean;
  activeTab: "activity" | "terminal";

  // Agent lifecycle
  status: AgentStatus;
  restartCount: number;

  // Activity
  entries: AgentActivityEntry[];

  // Computed
  pendingApprovalCount: () => number;

  // Actions
  togglePanel: () => void;
  setActiveTab: (tab: "activity" | "terminal") => void;
  setStatus: (status: AgentStatus) => void;
  addEntry: (entry: Omit<AgentActivityEntry, "id" | "timestamp"> & { id?: string }) => void;
  approveEntry: (entryId: string) => void;
  rejectEntry: (entryId: string) => void;
  clearEntries: () => void;
  incrementRestart: () => void;
  resetRestartCount: () => void;
}
