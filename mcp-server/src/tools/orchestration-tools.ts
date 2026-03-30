import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type Database from "better-sqlite3";

function getQueueDir(dbPath: string): string {
  return join(dirname(dbPath), "agent-queue");
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${timestamp}-${random}`;
}

// --- Approval Tools ---

export function handleRequestApproval(
  _db: Database.Database,
  dbPath: string,
  args: {
    projectId: string;
    projectName: string;
    phaseName: string;
    reason: string;
  }
) {
  const queueDir = getQueueDir(dbPath);
  const approvalsDir = join(queueDir, "approvals");
  ensureDir(approvalsDir);

  const approvalId = generateId("approval");
  const payload = {
    id: approvalId,
    projectId: args.projectId,
    projectName: args.projectName,
    phaseName: args.phaseName,
    reason: args.reason,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  writeFileSync(
    join(approvalsDir, `${approvalId}.json`),
    JSON.stringify(payload, null, 2)
  );

  return {
    content: [
      {
        type: "text" as const,
        text: `Approval request created: ${approvalId}`,
      },
    ],
  };
}

export function handleCheckApprovalStatus(
  _db: Database.Database,
  dbPath: string,
  args: { approvalId: string }
) {
  const queueDir = getQueueDir(dbPath);
  const filePath = join(queueDir, "approvals", `${args.approvalId}.json`);

  if (!existsSync(filePath)) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Approval not found with id "${args.approvalId}"`,
        },
      ],
      isError: true,
    };
  }

  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  const result = {
    id: data.id,
    status: data.status,
    decidedAt: data.decidedAt ?? null,
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}

// --- Notification Tool ---

export function handleSendNotification(
  _db: Database.Database,
  dbPath: string,
  args: {
    title: string;
    body: string;
    priority: string;
    projectId?: string;
    projectName?: string;
  }
) {
  const validPriorities = ["critical", "informational", "silent"];
  if (!validPriorities.includes(args.priority)) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Invalid priority "${args.priority}". Must be one of: ${validPriorities.join(", ")}`,
        },
      ],
      isError: true,
    };
  }

  const queueDir = getQueueDir(dbPath);
  const notificationsDir = join(queueDir, "notifications");
  ensureDir(notificationsDir);

  const fileId = generateId("notif");
  const payload = {
    id: fileId,
    title: args.title,
    body: args.body,
    priority: args.priority,
    projectId: args.projectId ?? null,
    projectName: args.projectName ?? null,
    createdAt: new Date().toISOString(),
  };

  writeFileSync(
    join(notificationsDir, `${fileId}.json`),
    JSON.stringify(payload, null, 2)
  );

  return {
    content: [
      { type: "text" as const, text: `Notification sent: ${fileId}` },
    ],
  };
}

// --- Status Report Tool ---

export function handleReportStatus(
  _db: Database.Database,
  dbPath: string,
  args: {
    action: string;
    status: string;
    projectId?: string;
    details?: string;
  }
) {
  const validStatuses = ["completed", "failed", "blocked"];
  if (!validStatuses.includes(args.status)) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Invalid status "${args.status}". Must be one of: ${validStatuses.join(", ")}`,
        },
      ],
      isError: true,
    };
  }

  const queueDir = getQueueDir(dbPath);
  const statusDir = join(queueDir, "status");
  ensureDir(statusDir);

  const fileId = generateId("status");
  const payload = {
    id: fileId,
    action: args.action,
    status: args.status,
    projectId: args.projectId ?? null,
    details: args.details ?? null,
    createdAt: new Date().toISOString(),
  };

  writeFileSync(
    join(statusDir, `${fileId}.json`),
    JSON.stringify(payload, null, 2)
  );

  return {
    content: [
      { type: "text" as const, text: `Status reported: ${fileId}` },
    ],
  };
}

// --- Spawn Project Session Tool ---

export function handleSpawnProjectSession(
  _db: Database.Database,
  dbPath: string,
  args: { projectId: string; sessionName: string }
) {
  const queueDir = getQueueDir(dbPath);
  const sessionsDir = join(queueDir, "sessions");
  ensureDir(sessionsDir);

  const fileId = generateId("session");
  const payload = {
    id: fileId,
    projectId: args.projectId,
    sessionName: args.sessionName,
    createdAt: new Date().toISOString(),
  };

  writeFileSync(
    join(sessionsDir, `${fileId}.json`),
    JSON.stringify(payload, null, 2)
  );

  return {
    content: [
      {
        type: "text" as const,
        text: `Session request created: ${fileId}`,
      },
    ],
  };
}
