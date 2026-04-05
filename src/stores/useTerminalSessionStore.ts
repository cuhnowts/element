import { create } from "zustand";

export interface TerminalSession {
  id: string;
  projectId: string;
  name: string;
  type: "ai" | "shell";
  status: "running" | "exited";
  initialCommand?: { command: string; args: string[] } | null;
  createdAt: number;
}

export interface TerminalSessionState {
  sessions: Record<string, TerminalSession[]>;
  activeSessionId: Record<string, string | null>;

  createSession: (
    projectId: string,
    name: string,
    type: "ai" | "shell",
    initialCommand?: { command: string; args: string[] } | null,
  ) => string;
  closeSession: (projectId: string, sessionId: string) => void;
  switchSession: (projectId: string, sessionId: string) => void;
  getProjectSessions: (projectId: string) => TerminalSession[];
  getActiveSession: (projectId: string) => TerminalSession | undefined;
  findAiSession: (projectId: string) => TerminalSession | undefined;
  markExited: (projectId: string, sessionId: string) => void;
  removeSession: (projectId: string, sessionId: string) => void;
  removeAllForProject: (projectId: string) => void;
  getAllSessions: () => TerminalSession[];
}

export const useTerminalSessionStore = create<TerminalSessionState>()((set, get) => ({
  sessions: {},
  activeSessionId: {},

  createSession: (projectId, name, type, initialCommand) => {
    const id = crypto.randomUUID();
    const session: TerminalSession = {
      id,
      projectId,
      name,
      type,
      status: "running",
      initialCommand: initialCommand ?? null,
      createdAt: Date.now(),
    };

    set((s) => {
      const projectSessions = [...(s.sessions[projectId] ?? []), session];
      const isFirst = projectSessions.length === 1;
      return {
        sessions: { ...s.sessions, [projectId]: projectSessions },
        activeSessionId: isFirst ? { ...s.activeSessionId, [projectId]: id } : s.activeSessionId,
      };
    });

    return id;
  },

  closeSession: (projectId, sessionId) => {
    set((s) => {
      const projectSessions = s.sessions[projectId] ?? [];
      const closingIndex = projectSessions.findIndex((ses) => ses.id === sessionId);
      const remaining = projectSessions.filter((ses) => ses.id !== sessionId);

      let newActiveId = s.activeSessionId[projectId];
      if (newActiveId === sessionId) {
        if (remaining.length === 0) {
          newActiveId = null;
        } else {
          // Prefer left/earlier neighbor
          const newIndex = Math.max(0, closingIndex - 1);
          newActiveId = remaining[newIndex].id;
        }
      }

      return {
        sessions: { ...s.sessions, [projectId]: remaining },
        activeSessionId: { ...s.activeSessionId, [projectId]: newActiveId },
      };
    });
  },

  switchSession: (projectId, sessionId) => {
    set((s) => ({
      activeSessionId: { ...s.activeSessionId, [projectId]: sessionId },
    }));
  },

  getProjectSessions: (projectId) => {
    return get().sessions[projectId] ?? [];
  },

  getActiveSession: (projectId) => {
    const state = get();
    const activeId = state.activeSessionId[projectId];
    if (!activeId) return undefined;
    return (state.sessions[projectId] ?? []).find((s) => s.id === activeId);
  },

  findAiSession: (projectId) => {
    const sessions = get().sessions[projectId] ?? [];
    return sessions.find((s) => s.type === "ai" && s.status === "running");
  },

  markExited: (projectId, sessionId) => {
    set((s) => {
      const projectSessions = (s.sessions[projectId] ?? []).map((ses) =>
        ses.id === sessionId ? { ...ses, status: "exited" as const } : ses,
      );
      return {
        sessions: { ...s.sessions, [projectId]: projectSessions },
      };
    });
  },

  removeSession: (projectId, sessionId) => {
    set((s) => {
      const remaining = (s.sessions[projectId] ?? []).filter((ses) => ses.id !== sessionId);
      return {
        sessions: { ...s.sessions, [projectId]: remaining },
      };
    });
  },

  removeAllForProject: (projectId) => {
    set((s) => {
      const { [projectId]: _removed, ...remainingSessions } = s.sessions;
      const { [projectId]: _removedActive, ...remainingActive } = s.activeSessionId;
      return {
        sessions: remainingSessions,
        activeSessionId: remainingActive,
      };
    });
  },

  getAllSessions: () => {
    const sessions = get().sessions;
    return Object.values(sessions).flat();
  },
}));

/**
 * Gracefully kill a PTY process: SIGTERM first, then SIGKILL after 3 seconds if still alive.
 */
export async function gracefulKillPty(pty: {
  kill: (signal?: string) => void;
  onExit: (cb: (exit: { exitCode: number }) => void) => void;
}): Promise<void> {
  try {
    pty.kill("SIGTERM");
  } catch {
    return;
  }
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      try {
        pty.kill("SIGKILL");
      } catch {
        /* already dead */
      }
      resolve();
    }, 3000);
    pty.onExit(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
