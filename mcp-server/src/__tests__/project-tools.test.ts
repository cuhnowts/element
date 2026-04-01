import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  handleListProjects,
  handleGetProjectDetail,
} from "../tools/project-tools.js";

let db: InstanceType<typeof Database>;

function seedDatabase(testDb: InstanceType<typeof Database>) {
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      directory_path TEXT,
      planning_tier TEXT,
      theme_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      project_id TEXT,
      phase_id TEXT,
      estimated_minutes INTEGER,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO projects (id, name, description, directory_path, planning_tier, theme_id)
    VALUES
      ('proj-1', 'Alpha Project', 'First test project', '/path/to/alpha', 'gsd', 'theme-1'),
      ('proj-2', 'Beta Project', 'Second test project', '/path/to/beta', 'medium', 'theme-1'),
      ('proj-3', 'Gamma Project', 'Third test project', NULL, 'quick', NULL);

    INSERT INTO phases (id, project_id, name, sort_order)
    VALUES
      ('phase-1', 'proj-1', 'Setup', 1),
      ('phase-2', 'proj-1', 'Build', 2);

    INSERT INTO tasks (id, title, description, status, project_id, phase_id)
    VALUES
      ('task-1', 'Init repo', 'Initialize repository', 'complete', 'proj-1', 'phase-1'),
      ('task-2', 'Add CI', 'Set up CI pipeline', 'pending', 'proj-1', 'phase-1'),
      ('task-3', 'Write code', 'Core implementation', 'pending', 'proj-1', 'phase-2');
  `);
}

describe("project-tools", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    seedDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("handleListProjects", () => {
    it("returns all projects ordered by created_at DESC", () => {
      const result = handleListProjects(db);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const projects = JSON.parse(result.content[0].text);
      expect(projects).toHaveLength(3);

      // Verify fields are present
      const first = projects[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("description");
      expect(first).toHaveProperty("directory_path");
      expect(first).toHaveProperty("planning_tier");
      expect(first).toHaveProperty("theme_id");
      expect(first).toHaveProperty("created_at");
      expect(first).toHaveProperty("updated_at");
    });

    it("returns correct project data", () => {
      const result = handleListProjects(db);
      const projects = JSON.parse(result.content[0].text);

      const alpha = projects.find(
        (p: { id: string }) => p.id === "proj-1"
      );
      expect(alpha).toBeDefined();
      expect(alpha.name).toBe("Alpha Project");
      expect(alpha.description).toBe("First test project");
      expect(alpha.directory_path).toBe("/path/to/alpha");
      expect(alpha.planning_tier).toBe("gsd");
    });

    it("returns empty array when no projects exist", () => {
      db.exec("DELETE FROM projects");
      const result = handleListProjects(db);
      const projects = JSON.parse(result.content[0].text);
      expect(projects).toEqual([]);
    });
  });

  describe("handleGetProjectDetail", () => {
    it("returns project with phase and task counts", () => {
      const result = handleGetProjectDetail(db, { projectId: "proj-1" });

      expect(result.content).toHaveLength(1);
      const detail = JSON.parse(result.content[0].text);

      expect(detail.id).toBe("proj-1");
      expect(detail.name).toBe("Alpha Project");
      expect(detail.phaseCount).toBe(2);
      expect(detail.taskCount).toBe(3);
      expect(detail.completedTaskCount).toBe(1);
    });

    it("returns zero counts for project with no phases or tasks", () => {
      const result = handleGetProjectDetail(db, { projectId: "proj-3" });
      const detail = JSON.parse(result.content[0].text);

      expect(detail.id).toBe("proj-3");
      expect(detail.name).toBe("Gamma Project");
      expect(detail.phaseCount).toBe(0);
      expect(detail.taskCount).toBe(0);
      expect(detail.completedTaskCount).toBe(0);
    });

    it("returns error for non-existent project", () => {
      const result = handleGetProjectDetail(db, {
        projectId: "does-not-exist",
      });

      expect(result.content[0].text).toContain("Error: Project not found");
      expect((result as { isError?: boolean }).isError).toBe(true);
    });

    it("handles null directory_path and theme_id", () => {
      const result = handleGetProjectDetail(db, { projectId: "proj-3" });
      const detail = JSON.parse(result.content[0].text);

      expect(detail.directory_path).toBeNull();
      expect(detail.theme_id).toBeNull();
    });
  });
});
