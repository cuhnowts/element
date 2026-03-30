import type Database from "better-sqlite3";

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  project_id: string | null;
  phase_id: string | null;
  estimated_minutes: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export function handleListTasks(
  db: Database.Database,
  args: { projectId: string; phaseId?: string }
) {
  let query =
    "SELECT id, title, description, status, priority, project_id, phase_id, estimated_minutes, due_date, created_at, updated_at FROM tasks WHERE project_id = ?";
  const params: (string | undefined)[] = [args.projectId];

  if (args.phaseId) {
    query += " AND phase_id = ?";
    params.push(args.phaseId);
  }

  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params) as TaskRow[];

  return {
    content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
  };
}
