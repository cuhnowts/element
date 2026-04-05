import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceStore } from "./useWorkspaceStore";

describe("useWorkspaceStore per-project state", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      projectStates: {},
      drawerOpen: true,
      activeDrawerTab: "logs",
    });
  });

  it("getProjectState returns defaults for unknown project", () => {
    const state = useWorkspaceStore.getState().getProjectState("unknown-id");
    expect(state).toEqual({
      centerTab: "detail",
      drawerOpen: true,
      drawerTab: "terminal",
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

  it("projectStates is not in partialize (session-only)", () => {
    // Set some project state
    useWorkspaceStore.getState().setProjectCenterTab("proj-1", "files");

    // Get the partialize function and check its output
    const options = useWorkspaceStore.persist.getOptions();
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed non-null in this context
    const partialize = options.partialize!;
    const fullState = useWorkspaceStore.getState();
    const persisted = partialize(fullState);

    // Session-only fields must NOT appear in persisted output
    expect(persisted).not.toHaveProperty("projectStates");

    // Persisted fields should still be present
    expect(persisted).toHaveProperty("drawerHeight");
    expect(persisted).toHaveProperty("drawerOpen");
    expect(persisted).toHaveProperty("calendarVisible");
  });
});
