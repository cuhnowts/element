import { describe, it, expect, beforeEach } from "vitest";
import { useWorkspaceStore } from "./useWorkspaceStore";

describe("useWorkspaceStore per-project state", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      projectStates: {},
      terminalSessionKey: 0,
      terminalInitialCommand: null,
      drawerOpen: true,
      activeDrawerTab: "logs",
    });
  });

  it("getProjectState returns defaults for unknown project", () => {
    const state = useWorkspaceStore.getState().getProjectState("unknown-id");
    expect(state).toEqual({
      centerTab: "detail",
      drawerOpen: true,
      drawerTab: "logs",
    });
  });

  it("setProjectCenterTab persists and getProjectState retrieves", () => {
    useWorkspaceStore.getState().setProjectCenterTab("proj-1", "files");
    const state = useWorkspaceStore.getState().getProjectState("proj-1");
    expect(state.centerTab).toBe("files");
  });

  it("different projects have independent state", () => {
    useWorkspaceStore.getState().setProjectCenterTab("proj-1", "files");
    useWorkspaceStore.getState().setProjectCenterTab("proj-2", "detail");

    expect(useWorkspaceStore.getState().getProjectState("proj-1").centerTab).toBe("files");
    expect(useWorkspaceStore.getState().getProjectState("proj-2").centerTab).toBe("detail");
  });

  it("launchTerminalCommand increments session key and stores command", () => {
    expect(useWorkspaceStore.getState().terminalSessionKey).toBe(0);

    useWorkspaceStore.getState().launchTerminalCommand("claude", ["context.md"]);

    const state = useWorkspaceStore.getState();
    expect(state.terminalSessionKey).toBe(1);
    expect(state.terminalInitialCommand).toEqual({
      command: "claude",
      args: ["context.md"],
    });
    expect(state.drawerOpen).toBe(true);
    expect(state.activeDrawerTab).toBe("terminal");
  });

  it("projectStates is not in partialize (session-only)", () => {
    // Set some project state
    useWorkspaceStore.getState().setProjectCenterTab("proj-1", "files");

    // Get the partialize function and check its output
    const options = useWorkspaceStore.persist.getOptions();
    const partialize = options.partialize!;
    const fullState = useWorkspaceStore.getState();
    const persisted = partialize(fullState);

    // Session-only fields must NOT appear in persisted output
    expect(persisted).not.toHaveProperty("projectStates");
    expect(persisted).not.toHaveProperty("terminalSessionKey");
    expect(persisted).not.toHaveProperty("terminalInitialCommand");

    // Persisted fields should still be present
    expect(persisted).toHaveProperty("drawerHeight");
    expect(persisted).toHaveProperty("drawerOpen");
    expect(persisted).toHaveProperty("calendarVisible");
  });
});
