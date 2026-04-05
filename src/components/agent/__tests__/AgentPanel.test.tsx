import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Hoist mocks
const { mockStartAgent, mockRestartAgent } = vi.hoisted(() => ({
  mockStartAgent: vi.fn(),
  mockRestartAgent: vi.fn(),
}));

vi.mock("@/hooks/useAgentLifecycle", () => ({
  useAgentLifecycle: () => ({
    startAgent: mockStartAgent,
    restartAgent: mockRestartAgent,
  }),
}));

vi.mock("@/hooks/useTerminal", () => ({
  useTerminal: () => ({ isReady: true, error: null }),
}));

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn().mockResolvedValue("/Users/test"),
}));

vi.mock("@/hooks/useAgentQueue", () => ({
  writeApprovalDecision: vi.fn().mockResolvedValue(undefined),
}));

import { useAgentStore } from "@/stores/useAgentStore";
import { AgentPanel } from "@/components/agent/AgentPanel";

describe("AgentPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAgentStore.setState({
      activeTab: "activity",
      status: "running",
      restartCount: 0,
      entries: [],
    });
  });

  it("renders with Agent heading text", () => {
    render(<AgentPanel />);
    expect(screen.getByText("Agent")).toBeInTheDocument();
  });

  it("shows Activity tab as selected by default", () => {
    render(<AgentPanel />);
    const activityButton = screen.getByRole("button", { name: /activity/i });
    // Activity tab should have the selected styling class
    expect(activityButton.className).toContain("text-foreground");
  });

  it("shows empty state when no entries", () => {
    render(<AgentPanel />);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("switches to Terminal tab when clicked", async () => {
    const user = userEvent.setup();
    render(<AgentPanel />);

    const terminalButton = screen.getByRole("button", { name: /terminal/i });
    await user.click(terminalButton);

    expect(useAgentStore.getState().activeTab).toBe("terminal");
  });

  it("renders entries with correct titles when entries exist", () => {
    useAgentStore.setState({
      entries: [
        {
          id: "entry-1",
          type: "execution_start",
          title: "Starting Phase 1",
          description: "Executing plan 1",
          timestamp: Date.now(),
        },
        {
          id: "entry-2",
          type: "execution_complete",
          title: "Phase 1 Complete",
          description: "All tasks done",
          timestamp: Date.now(),
        },
      ],
    });

    render(<AgentPanel />);
    expect(screen.getByText("Starting Phase 1")).toBeInTheDocument();
    expect(screen.getByText("Phase 1 Complete")).toBeInTheDocument();
  });

  it("renders Approve and Reject buttons for pending approval entry", () => {
    useAgentStore.setState({
      entries: [
        {
          id: "approval-1",
          type: "approval_request",
          title: "Approve Phase 2",
          description: "Phase 2 is ready",
          timestamp: Date.now(),
          approvalStatus: "pending",
        },
      ],
    });

    render(<AgentPanel />);
    expect(screen.getByText("Approve Phase 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("calls startAgent on mount", () => {
    render(<AgentPanel />);
    expect(mockStartAgent).toHaveBeenCalled();
  });

  it("shows status indicator in header", () => {
    useAgentStore.setState({ status: "running" });
    render(<AgentPanel />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("shows Restart Agent button when stopped", () => {
    useAgentStore.setState({ status: "stopped" });
    render(<AgentPanel />);
    expect(
      screen.getByRole("button", { name: /restart agent/i })
    ).toBeInTheDocument();
  });
});
