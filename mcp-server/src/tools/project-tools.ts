import type Database from "better-sqlite3";

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  directory_path: string | null;
  planning_tier: string | null;
  theme_id: string | null;
  created_at: string;
  updated_at: string;
}

export function handleListProjects(db: Database.Database) {
  const rows = db
    .prepare(
      "SELECT id, name, description, directory_path, planning_tier, theme_id, created_at, updated_at FROM projects ORDER BY created_at DESC"
    )
    .all() as ProjectRow[];

  return {
    content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
  };
}

export function handleGetProjectDetail(
  db: Database.Database,
  args: { projectId: string }
) {
  const project = db
    .prepare(
      "SELECT id, name, description, directory_path, planning_tier, theme_id, created_at, updated_at FROM projects WHERE id = ?"
    )
    .get(args.projectId) as ProjectRow | undefined;

  if (!project) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Project not found with id "${args.projectId}"`,
        },
      ],
      isError: true,
    };
  }

  const phaseCount = db
    .prepare("SELECT COUNT(*) as count FROM phases WHERE project_id = ?")
    .get(args.projectId) as { count: number };

  const taskCount = db
    .prepare("SELECT COUNT(*) as count FROM tasks WHERE project_id = ?")
    .get(args.projectId) as { count: number };

  const completedTaskCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND status = 'complete'"
    )
    .get(args.projectId) as { count: number };

  const result = {
    ...project,
    phaseCount: phaseCount.count,
    taskCount: taskCount.count,
    completedTaskCount: completedTaskCount.count,
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}
