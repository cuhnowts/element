import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { useEffect, useRef } from "react";
import { useAgentStore } from "@/stores/useAgentStore";
import type { AgentEntryType } from "@/types/agent";

// --- Tauri fs invoke helpers ---

interface DirEntry {
  name: string | null;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
}

async function fsReadDir(path: string): Promise<DirEntry[]> {
  return invoke<DirEntry[]>("plugin:fs|read_dir", { path });
}

async function fsReadTextFile(path: string): Promise<string> {
  return invoke<string>("plugin:fs|read_text_file", { path });
}

async function fsWriteTextFile(path: string, contents: string): Promise<void> {
  await invoke("plugin:fs|write_text_file", { path, contents });
}

async function fsMkdir(path: string): Promise<void> {
  await invoke("plugin:fs|mkdir", { path, options: { recursive: true } }).catch(() => {
    // directory may already exist
  });
}

async function fsExists(path: string): Promise<boolean> {
  try {
    await invoke("plugin:fs|stat", { path });
    return true;
  } catch {
    return false;
  }
}

// --- Queue directory helpers ---

let cachedQueueDir: string | null = null;

async function getQueueDir(): Promise<string> {
  if (cachedQueueDir) return cachedQueueDir;
  const base = await appDataDir();
  cachedQueueDir = `${base}agent-queue`;
  return cachedQueueDir;
}

async function ensureQueueDirs(): Promise<void> {
  const queueDir = await getQueueDir();
  for (const sub of ["approvals", "notifications", "status", "sessions"]) {
    await fsMkdir(`${queueDir}/${sub}`);
  }
}

// --- Priority / status mappers ---

function mapPriorityToEntryType(priority: string): AgentEntryType {
  switch (priority) {
    case "critical":
      return "human_needed";
    case "informational":
      return "execution_complete";
    case "silent":
      return "context_seeded";
    default:
      return "execution_complete";
  }
}

function mapStatusToEntryType(status: string, _action: string): AgentEntryType {
  switch (status) {
    case "completed":
      return "execution_complete";
    case "failed":
      return "error";
    case "blocked":
      return "human_needed";
    default:
      return "execution_complete";
  }
}

// --- Poll logic ---

async function scanApprovals(queueDir: string, processedIds: Set<string>): Promise<void> {
  const dir = `${queueDir}/approvals`;
  const dirExists = await fsExists(dir);
  if (!dirExists) return;

  const entries = await fsReadDir(dir);
  for (const entry of entries) {
    if (!entry.name?.endsWith(".json")) continue;
    const fileId = entry.name.replace(".json", "");
    if (processedIds.has(fileId)) continue;

    try {
      const raw = await fsReadTextFile(`${dir}/${entry.name}`);
      const data = JSON.parse(raw) as {
        id: string;
        projectId: string;
        projectName: string;
        phaseName: string;
        reason: string;
        status: string;
      };

      if (data.status === "pending") {
        useAgentStore.getState().addEntry({
          id: data.id,
          type: "approval_request",
          title: `Approve: ${data.phaseName}`,
          description: `${data.projectName} is ready to auto-execute ${data.phaseName}. No human blockers detected.`,
          projectId: data.projectId,
          projectName: data.projectName,
          phaseName: data.phaseName,
          approvalStatus: "pending",
        });
      }
      processedIds.add(fileId);
    } catch {
      // Ignore malformed files
    }
  }
}

async function scanNotifications(queueDir: string, processedIds: Set<string>): Promise<void> {
  const dir = `${queueDir}/notifications`;
  const dirExists = await fsExists(dir);
  if (!dirExists) return;

  const entries = await fsReadDir(dir);
  for (const entry of entries) {
    if (!entry.name?.endsWith(".json")) continue;
    const fileId = entry.name.replace(".json", "");
    if (processedIds.has(fileId)) continue;

    try {
      const raw = await fsReadTextFile(`${dir}/${entry.name}`);
      const data = JSON.parse(raw) as {
        title: string;
        body: string;
        priority: string;
        projectId?: string;
        projectName?: string;
      };

      useAgentStore.getState().addEntry({
        type: mapPriorityToEntryType(data.priority),
        title: data.title,
        description: data.body,
        projectId: data.projectId ?? undefined,
        projectName: data.projectName ?? undefined,
      });
      processedIds.add(fileId);
    } catch {
      // Ignore malformed files
    }
  }
}

async function scanStatus(queueDir: string, processedIds: Set<string>): Promise<void> {
  const dir = `${queueDir}/status`;
  const dirExists = await fsExists(dir);
  if (!dirExists) return;

  const entries = await fsReadDir(dir);
  for (const entry of entries) {
    if (!entry.name?.endsWith(".json")) continue;
    const fileId = entry.name.replace(".json", "");
    if (processedIds.has(fileId)) continue;

    try {
      const raw = await fsReadTextFile(`${dir}/${entry.name}`);
      const data = JSON.parse(raw) as {
        action: string;
        status: string;
        projectId?: string;
        details?: string;
      };

      useAgentStore.getState().addEntry({
        type: mapStatusToEntryType(data.status, data.action),
        title: data.action,
        description: data.details ?? "",
        projectId: data.projectId ?? undefined,
      });
      processedIds.add(fileId);
    } catch {
      // Ignore malformed files
    }
  }
}

async function scanSessions(queueDir: string, processedIds: Set<string>): Promise<void> {
  const dir = `${queueDir}/sessions`;
  const dirExists = await fsExists(dir);
  if (!dirExists) return;

  const entries = await fsReadDir(dir);
  for (const entry of entries) {
    if (!entry.name?.endsWith(".json")) continue;
    const fileId = entry.name.replace(".json", "");
    if (processedIds.has(fileId)) continue;

    try {
      const raw = await fsReadTextFile(`${dir}/${entry.name}`);
      const data = JSON.parse(raw) as {
        projectId: string;
        sessionName: string;
      };

      // TODO(Phase 19): When multi-terminal session infrastructure is available,
      // replace this with an actual terminal spawn call via Phase 19's API
      // (e.g., spawnNamedSession(projectId, sessionName)). For now, the session
      // request is logged as an activity entry only.
      useAgentStore.getState().addEntry({
        type: "context_seeded",
        title: `Session: ${data.sessionName}`,
        description: "Agent requested terminal session for project.",
        projectId: data.projectId,
      });
      processedIds.add(fileId);
    } catch {
      // Ignore malformed files
    }
  }
}

// --- Write-back functions ---

export async function writeApprovalDecision(
  approvalId: string,
  decision: "approved" | "rejected",
): Promise<void> {
  const queueDir = await getQueueDir();
  const filePath = `${queueDir}/approvals/${approvalId}.json`;
  const fileExists = await fsExists(filePath);
  if (!fileExists) return;

  const raw = await fsReadTextFile(filePath);
  const data = JSON.parse(raw);
  data.status = decision;
  data.decidedAt = new Date().toISOString();
  await fsWriteTextFile(filePath, JSON.stringify(data, null, 2));
}

export async function writeSessionRequest(projectId: string, sessionName: string): Promise<void> {
  const queueDir = await getQueueDir();
  const dir = `${queueDir}/sessions`;
  await fsMkdir(dir);

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  const fileId = `${timestamp}-${random}`;
  const payload = {
    projectId,
    sessionName,
    createdAt: new Date().toISOString(),
  };
  await fsWriteTextFile(`${dir}/${fileId}.json`, JSON.stringify(payload, null, 2));
}

// --- Hook ---

export function useAgentQueue() {
  const processedIds = useRef(new Set<string>());
  const initialized = useRef(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function init() {
      await ensureQueueDirs();
      initialized.current = true;

      // Immediate first poll
      await pollQueue();

      // 2-second poll interval
      intervalId = setInterval(pollQueue, 2000);
    }

    async function pollQueue() {
      if (!initialized.current) return;
      try {
        const queueDir = await getQueueDir();
        await scanApprovals(queueDir, processedIds.current);
        await scanNotifications(queueDir, processedIds.current);
        await scanStatus(queueDir, processedIds.current);
        await scanSessions(queueDir, processedIds.current);
      } catch {
        // Silently handle poll errors -- will retry on next interval
      }
    }

    init();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return { writeApprovalDecision, writeSessionRequest };
}
