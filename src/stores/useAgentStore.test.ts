import { beforeEach, describe, expect, it } from "vitest";
import { useAgentStore } from "./useAgentStore";

const INITIAL_STATE = {
  activeTab: "activity" as const,
  status: "starting" as const,
  restartCount: 0,
  agentCommand: null as string | null,
  agentArgs: null as string[] | null,
  entries: [],
};

describe("useAgentStore", () => {
  beforeEach(() => {
    useAgentStore.setState(INITIAL_STATE);
  });

  it("initializes with correct defaults", () => {
    const state = useAgentStore.getState();
    expect(state.activeTab).toBe("activity");
    expect(state.status).toBe("starting");
    expect(state.restartCount).toBe(0);
    expect(state.agentCommand).toBe(null);
    expect(state.agentArgs).toBe(null);
    expect(state.entries).toEqual([]);
  });

  it("setAgentCommand stores command string", () => {
    useAgentStore.getState().setAgentCommand("claude");
    expect(useAgentStore.getState().agentCommand).toBe("claude");
  });

  it("setAgentArgs stores args array", () => {
    useAgentStore.getState().setAgentArgs(["--mcp-config", "/path/to/config"]);
    expect(useAgentStore.getState().agentArgs).toEqual(["--mcp-config", "/path/to/config"]);
  });

  it("setActiveTab changes activeTab to terminal", () => {
    useAgentStore.getState().setActiveTab("terminal");
    expect(useAgentStore.getState().activeTab).toBe("terminal");
  });

  it("setStatus changes status to running", () => {
    useAgentStore.getState().setStatus("running");
    expect(useAgentStore.getState().status).toBe("running");
  });

  it("addEntry creates entry with auto id and timestamp", () => {
    useAgentStore.getState().addEntry({
      type: "execution_start",
      title: "Starting execution",
      description: "Phase 1 plan 1",
    });

    const entries = useAgentStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBeDefined();
    expect(typeof entries[0].id).toBe("string");
    expect(entries[0].id.length).toBeGreaterThan(0);
    expect(entries[0].timestamp).toBeDefined();
    expect(typeof entries[0].timestamp).toBe("number");
    expect(entries[0].type).toBe("execution_start");
    expect(entries[0].title).toBe("Starting execution");
  });

  it("addEntry prepends entries (newest first)", () => {
    useAgentStore.getState().addEntry({
      type: "execution_start",
      title: "First",
      description: "First entry",
    });
    useAgentStore.getState().addEntry({
      type: "execution_complete",
      title: "Second",
      description: "Second entry",
    });

    const entries = useAgentStore.getState().entries;
    expect(entries).toHaveLength(2);
    expect(entries[0].title).toBe("Second");
    expect(entries[1].title).toBe("First");
  });

  it("pendingApprovalCount counts pending approval_request entries", () => {
    useAgentStore.getState().addEntry({
      type: "approval_request",
      title: "Approve this",
      description: "Needs approval",
      approvalStatus: "pending",
    });
    useAgentStore.getState().addEntry({
      type: "approval_request",
      title: "Approve that",
      description: "Also needs approval",
      approvalStatus: "pending",
    });
    useAgentStore.getState().addEntry({
      type: "execution_start",
      title: "Not an approval",
      description: "Regular entry",
    });

    expect(useAgentStore.getState().pendingApprovalCount()).toBe(2);
  });

  it("approveEntry changes pending to approved and decreases pendingApprovalCount", () => {
    useAgentStore.getState().addEntry({
      type: "approval_request",
      title: "Approve this",
      description: "Needs approval",
      approvalStatus: "pending",
    });

    const entryId = useAgentStore.getState().entries[0].id;
    expect(useAgentStore.getState().pendingApprovalCount()).toBe(1);

    useAgentStore.getState().approveEntry(entryId);

    expect(useAgentStore.getState().entries[0].approvalStatus).toBe("approved");
    expect(useAgentStore.getState().pendingApprovalCount()).toBe(0);
  });

  it("rejectEntry changes pending to rejected and decreases pendingApprovalCount", () => {
    useAgentStore.getState().addEntry({
      type: "approval_request",
      title: "Reject this",
      description: "Needs rejection",
      approvalStatus: "pending",
    });

    const entryId = useAgentStore.getState().entries[0].id;
    useAgentStore.getState().rejectEntry(entryId);

    expect(useAgentStore.getState().entries[0].approvalStatus).toBe("rejected");
    expect(useAgentStore.getState().pendingApprovalCount()).toBe(0);
  });

  it("approveEntry on already-approved entry is a no-op (idempotent)", () => {
    useAgentStore.getState().addEntry({
      type: "approval_request",
      title: "Approve this",
      description: "Already approved",
      approvalStatus: "pending",
    });

    const entryId = useAgentStore.getState().entries[0].id;
    useAgentStore.getState().approveEntry(entryId);
    expect(useAgentStore.getState().entries[0].approvalStatus).toBe("approved");

    // Second approve should be no-op
    useAgentStore.getState().approveEntry(entryId);
    expect(useAgentStore.getState().entries[0].approvalStatus).toBe("approved");
  });

  it("clearEntries resets entries to empty array", () => {
    useAgentStore.getState().addEntry({
      type: "execution_start",
      title: "Entry",
      description: "Will be cleared",
    });
    expect(useAgentStore.getState().entries).toHaveLength(1);

    useAgentStore.getState().clearEntries();
    expect(useAgentStore.getState().entries).toEqual([]);
  });

  it("incrementRestart increases restartCount by 1", () => {
    expect(useAgentStore.getState().restartCount).toBe(0);
    useAgentStore.getState().incrementRestart();
    expect(useAgentStore.getState().restartCount).toBe(1);
    useAgentStore.getState().incrementRestart();
    expect(useAgentStore.getState().restartCount).toBe(2);
  });

  it("resetRestartCount sets restartCount to 0", () => {
    useAgentStore.getState().incrementRestart();
    useAgentStore.getState().incrementRestart();
    expect(useAgentStore.getState().restartCount).toBe(2);

    useAgentStore.getState().resetRestartCount();
    expect(useAgentStore.getState().restartCount).toBe(0);
  });
});
