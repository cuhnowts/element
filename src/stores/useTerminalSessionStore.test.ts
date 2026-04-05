import { beforeEach, describe, expect, it, vi } from "vitest";
import { gracefulKillPty, useTerminalSessionStore } from "./useTerminalSessionStore";

describe("useTerminalSessionStore", () => {
  beforeEach(() => {
    useTerminalSessionStore.setState({
      sessions: {},
      activeSessionId: {},
    });
  });

  it("project isolation: sessions for different projects are separate", () => {
    const store = useTerminalSessionStore.getState();
    store.createSession("projA", "Shell A", "shell");
    store.createSession("projB", "Shell B", "shell");

    const sessionsA = useTerminalSessionStore.getState().getProjectSessions("projA");
    const sessionsB = useTerminalSessionStore.getState().getProjectSessions("projB");

    expect(sessionsA).toHaveLength(1);
    expect(sessionsA[0].name).toBe("Shell A");
    expect(sessionsB).toHaveLength(1);
    expect(sessionsB[0].name).toBe("Shell B");
  });

  it("session name and type are stored correctly", () => {
    useTerminalSessionStore.getState().createSession("proj1", "Dev Server", "shell");
    const sessions = useTerminalSessionStore.getState().getProjectSessions("proj1");

    expect(sessions).toHaveLength(1);
    expect(sessions[0].name).toBe("Dev Server");
    expect(sessions[0].type).toBe("shell");
    expect(sessions[0].projectId).toBe("proj1");
    expect(sessions[0].status).toBe("running");
  });

  it("findAiSession returns the ai session", () => {
    const store = useTerminalSessionStore.getState();
    store.createSession("proj1", "AI Session", "ai");
    store.createSession("proj1", "Shell 1", "shell");

    const aiSession = useTerminalSessionStore.getState().findAiSession("proj1");
    expect(aiSession).toBeDefined();
    expect(aiSession?.type).toBe("ai");
    expect(aiSession?.name).toBe("AI Session");
  });

  it("switchSession changes the active session", () => {
    const store = useTerminalSessionStore.getState();
    const _id1 = store.createSession("proj1", "Shell 1", "shell");
    const id2 = store.createSession("proj1", "Shell 2", "shell");

    useTerminalSessionStore.getState().switchSession("proj1", id2);
    const active = useTerminalSessionStore.getState().getActiveSession("proj1");

    expect(active).toBeDefined();
    expect(active?.id).toBe(id2);
  });

  it("graceful kill sends SIGTERM then SIGKILL after timeout", async () => {
    vi.useFakeTimers();
    const killFn = vi.fn();
    const onExitFn = vi.fn();
    const mockPty = {
      kill: killFn,
      onExit: onExitFn,
    };

    const promise = gracefulKillPty(mockPty);

    expect(killFn).toHaveBeenCalledWith("SIGTERM");

    // Advance past the 3 second timeout
    vi.advanceTimersByTime(3000);
    await promise;

    expect(killFn).toHaveBeenCalledWith("SIGKILL");
    vi.useRealTimers();
  });

  it("removeAllForProject removes only that project's sessions", () => {
    const store = useTerminalSessionStore.getState();
    store.createSession("proj1", "Shell 1", "shell");
    store.createSession("proj1", "Shell 2", "shell");
    store.createSession("proj2", "Shell A", "shell");

    useTerminalSessionStore.getState().removeAllForProject("proj1");

    expect(useTerminalSessionStore.getState().getProjectSessions("proj1")).toHaveLength(0);
    expect(useTerminalSessionStore.getState().getProjectSessions("proj2")).toHaveLength(1);
  });

  it("markExited sets session status to exited", () => {
    const store = useTerminalSessionStore.getState();
    const id = store.createSession("proj1", "Shell 1", "shell");

    useTerminalSessionStore.getState().markExited("proj1", id);

    const sessions = useTerminalSessionStore.getState().getProjectSessions("proj1");
    expect(sessions[0].status).toBe("exited");
  });

  it("auto-select: first session becomes active", () => {
    const store = useTerminalSessionStore.getState();
    const id = store.createSession("proj1", "Shell 1", "shell");

    const active = useTerminalSessionStore.getState().getActiveSession("proj1");
    expect(active).toBeDefined();
    expect(active?.id).toBe(id);
  });

  it("close active re-selects nearest remaining session", () => {
    const store = useTerminalSessionStore.getState();
    const id1 = store.createSession("proj1", "Shell 1", "shell");
    const id2 = store.createSession("proj1", "Shell 2", "shell");
    const _id3 = store.createSession("proj1", "Shell 3", "shell");

    // Make id2 active
    useTerminalSessionStore.getState().switchSession("proj1", id2);

    // Close id2 - should select id1 (prefer earlier/left neighbor)
    useTerminalSessionStore.getState().closeSession("proj1", id2);

    const remaining = useTerminalSessionStore.getState().getProjectSessions("proj1");
    expect(remaining).toHaveLength(2);

    const active = useTerminalSessionStore.getState().getActiveSession("proj1");
    expect(active).toBeDefined();
    expect(active?.id).toBe(id1);
  });

  it("getAllSessions returns flat array across all projects", () => {
    const store = useTerminalSessionStore.getState();
    store.createSession("proj1", "Shell 1", "shell");
    store.createSession("proj1", "Shell 2", "shell");
    store.createSession("proj2", "Shell A", "shell");

    const all = useTerminalSessionStore.getState().getAllSessions();
    expect(all).toHaveLength(3);
  });

  it("removeSession removes a specific session", () => {
    const store = useTerminalSessionStore.getState();
    const id1 = store.createSession("proj1", "Shell 1", "shell");
    const id2 = store.createSession("proj1", "Shell 2", "shell");

    useTerminalSessionStore.getState().removeSession("proj1", id1);

    const sessions = useTerminalSessionStore.getState().getProjectSessions("proj1");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(id2);
  });

  it("findAiSession ignores exited ai sessions", () => {
    const store = useTerminalSessionStore.getState();
    const id = store.createSession("proj1", "AI Session", "ai");
    useTerminalSessionStore.getState().markExited("proj1", id);

    const aiSession = useTerminalSessionStore.getState().findAiSession("proj1");
    expect(aiSession).toBeUndefined();
  });

  it("graceful kill resolves early if process exits before timeout", async () => {
    vi.useFakeTimers();
    const killFn = vi.fn();
    let exitCallback: ((exit: { exitCode: number }) => void) | null = null;
    const mockPty = {
      kill: killFn,
      onExit: (cb: (exit: { exitCode: number }) => void) => {
        exitCallback = cb;
      },
    };

    const promise = gracefulKillPty(mockPty);

    expect(killFn).toHaveBeenCalledWith("SIGTERM");

    // Simulate process exiting before timeout
    exitCallback?.({ exitCode: 0 });
    await promise;

    // SIGKILL should NOT have been called
    expect(killFn).not.toHaveBeenCalledWith("SIGKILL");
    vi.useRealTimers();
  });
});
