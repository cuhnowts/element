import type Database from "better-sqlite3";

interface PhaseRow {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  source: string;
  created_at: string;
  updated_at: string;
}

interface TaskCountRow {
  total: number;
  completed: number;
}

export function handleListPhases(
  db: Database.Database,
  args: { projectId: string }
) {
  const rows = db
    .prepare(
      "SELECT id, project_id, name, sort_order, source, created_at, updated_at FROM phases WHERE project_id = ? ORDER BY sort_order ASC"
    )
    .all(args.projectId) as PhaseRow[];

  return {
    content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
  };
}

export function handleGetPhaseStatus(
  db: Database.Database,
  args: { projectId: string }
) {
  const phases = db
    .prepare(
      "SELECT id, project_id, name, sort_order, source, created_at, updated_at FROM phases WHERE project_id = ? ORDER BY sort_order ASC"
    )
    .all(args.projectId) as PhaseRow[];

  const result = phases.map((phase) => {
    const counts = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as completed
        FROM tasks WHERE phase_id = ?`
      )
      .get(phase.id) as TaskCountRow;

    return {
      id: phase.id,
      name: phase.name,
      sortOrder: phase.sort_order,
      totalTasks: counts.total,
      completedTasks: counts.completed,
      isComplete: counts.completed === counts.total && counts.total > 0,
    };
  });

  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}
