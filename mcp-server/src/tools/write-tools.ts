import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

// --- Helper: Emit data-changed notification ---

export function emitDataChanged(dbPath: string, event: string): void {
  const notifDir = join(dirname(dbPath), "agent-queue", "notifications");
  mkdirSync(notifDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const fileId = `data-changed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const payload = {
    type: "data-changed",
    event,
    timestamp,
  };

  writeFileSync(
    join(notifDir, `${fileId}.json`),
    JSON.stringify(payload, null, 2)
  );
}

// --- Task Tools ---

export function handleCreateTask(
  db: Database.Database,
  dbPath: string,
  args: {
    title: string;
    projectId?: string;
    description?: string;
    priority?: string;
    phaseId?: string;
  }
) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const status = "todo";
  const priority = args.priority ?? "medium";

  db.prepare(
    `INSERT INTO tasks (id, title, description, status, priority, project_id, phase_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    args.title,
    args.description ?? null,
    status,
    priority,
    args.projectId ?? null,
    args.phaseId ?? null,
    now,
    now
  );

  emitDataChanged(dbPath, "task-created");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ id, title: args.title, status, priority }),
      },
    ],
  };
}

export function handleUpdateTask(
  db: Database.Database,
  dbPath: string,
  args: {
    taskId: string;
    title?: string;
    description?: string;
    priority?: string;
  }
) {
  const setClauses: string[] = [];
  const values: (string | null)[] = [];

  if (args.title !== undefined) {
    setClauses.push("title = ?");
    values.push(args.title);
  }
  if (args.description !== undefined) {
    setClauses.push("description = ?");
    values.push(args.description);
  }
  if (args.priority !== undefined) {
    setClauses.push("priority = ?");
    values.push(args.priority);
  }

  if (setClauses.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ taskId: args.taskId, updated: false, reason: "No fields to update" }),
        },
      ],
      isError: true,
    };
  }

  const now = new Date().toISOString();
  setClauses.push("updated_at = ?");
  values.push(now);
  values.push(args.taskId);

  db.prepare(
    `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = ?`
  ).run(...values);

  emitDataChanged(dbPath, "task-updated");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ taskId: args.taskId, updated: true }),
      },
    ],
  };
}

export function handleUpdateTaskStatus(
  db: Database.Database,
  dbPath: string,
  args: { taskId: string; status: string }
) {
  const validStatuses = ["todo", "in_progress", "done", "cancelled"];
  if (!validStatuses.includes(args.status)) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Invalid status "${args.status}". Must be one of: ${validStatuses.join(", ")}`,
        },
      ],
      isError: true as const,
    };
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?`
  ).run(args.status, now, args.taskId);

  emitDataChanged(dbPath, "task-updated");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ taskId: args.taskId, status: args.status }),
      },
    ],
  };
}

export function handleDeleteTask(
  db: Database.Database,
  dbPath: string,
  args: { taskId: string }
) {
  db.prepare(`DELETE FROM tasks WHERE id = ?`).run(args.taskId);

  emitDataChanged(dbPath, "task-deleted");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ taskId: args.taskId, deleted: true }),
      },
    ],
  };
}

// --- Phase Tools ---

export function handleUpdatePhaseStatus(
  db: Database.Database,
  dbPath: string,
  args: { phaseId: string; status: string }
) {
  // Phases table does not have a status column directly.
  // Phase "status" is derived from task completion.
  // We report the requested status change as informational.
  emitDataChanged(dbPath, "phase-updated");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          phaseId: args.phaseId,
          status: args.status,
          note: "Phase status is derived from task completion",
        }),
      },
    ],
  };
}

// --- Project Tools ---

export function handleCreateProject(
  db: Database.Database,
  dbPath: string,
  args: { name: string; description?: string }
) {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO projects (id, name, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, args.name, args.description ?? null, now, now);

  emitDataChanged(dbPath, "project-created");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ id, name: args.name }),
      },
    ],
  };
}

// --- Theme Tools ---

export function handleCreateTheme(
  db: Database.Database,
  dbPath: string,
  args: { name: string; color: string }
) {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO themes (id, name, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, args.name, args.color, now, now);

  emitDataChanged(dbPath, "theme-created");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ id, name: args.name, color: args.color }),
      },
    ],
  };
}

// --- File Tools ---

export function handleCreateFile(
  db: Database.Database,
  dbPath: string,
  args: { path: string; content: string; projectId: string }
) {
  const row = db
    .prepare("SELECT directory FROM projects WHERE id = ?")
    .get(args.projectId) as { directory: string | null } | undefined;

  if (!row || !row.directory) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Project "${args.projectId}" has no linked directory. Cannot create file.`,
        },
      ],
      isError: true as const,
    };
  }

  const fullPath = join(row.directory, args.path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, args.content);

  emitDataChanged(dbPath, "file-created");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ path: fullPath, created: true }),
      },
    ],
  };
}
