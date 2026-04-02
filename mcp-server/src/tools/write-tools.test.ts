import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { mkdirSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  handleCreateTask,
  handleUpdateTask,
  handleUpdateTaskStatus,
  handleDeleteTask,
  handleUpdatePhaseStatus,
  handleCreateProject,
  handleCreateTheme,
  handleCreateFile,
  emitDataChanged,
} from "./write-tools.js";

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      project_id TEXT,
      phase_id TEXT,
      theme_id TEXT,
      estimated_minutes INTEGER,
      due_date TEXT,
      scheduled_date TEXT,
      scheduled_time TEXT,
      duration_minutes INTEGER,
      recurrence_rule TEXT,
      external_path TEXT,
      context TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      directory TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE phases (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      sort_order INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

let testDir: string;
let dbPath: string;

beforeEach(() => {
  testDir = join(tmpdir(), `write-tools-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
  dbPath = join(testDir, "element.db");
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe("handleCreateTask", () => {
  it("inserts a row and returns JSON with id and title", () => {
    const db = createTestDb();
    const result = handleCreateTask(db, dbPath, { title: "Test task" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBeDefined();
    expect(parsed.title).toBe("Test task");
    expect(parsed.status).toBe("todo");

    const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(parsed.id) as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.title).toBe("Test task");
    db.close();
  });

  it("creates task with defaults: status todo, priority medium", () => {
    const db = createTestDb();
    const result = handleCreateTask(db, dbPath, { title: "Defaults task" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("todo");
    expect(parsed.priority).toBe("medium");
    db.close();
  });

  it("associates task with projectId", () => {
    const db = createTestDb();
    const result = handleCreateTask(db, dbPath, { title: "Project task", projectId: "proj-1" });
    const parsed = JSON.parse(result.content[0].text);
    const row = db.prepare("SELECT project_id FROM tasks WHERE id = ?").get(parsed.id) as Record<string, unknown>;
    expect(row.project_id).toBe("proj-1");
    db.close();
  });
});

describe("handleUpdateTask", () => {
  it("updates title field on existing task", () => {
    const db = createTestDb();
    handleCreateTask(db, dbPath, { title: "Original" });
    const created = JSON.parse(
      handleCreateTask(db, dbPath, { title: "To update" }).content[0].text
    );

    const result = handleUpdateTask(db, dbPath, { taskId: created.id, title: "Updated title" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.updated).toBe(true);

    const row = db.prepare("SELECT title FROM tasks WHERE id = ?").get(created.id) as Record<string, unknown>;
    expect(row.title).toBe("Updated title");
    db.close();
  });
});

describe("handleUpdateTaskStatus", () => {
  it("changes status to done on existing task", () => {
    const db = createTestDb();
    const created = JSON.parse(
      handleCreateTask(db, dbPath, { title: "Status task" }).content[0].text
    );

    const result = handleUpdateTaskStatus(db, dbPath, { taskId: created.id, status: "done" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("done");

    const row = db.prepare("SELECT status FROM tasks WHERE id = ?").get(created.id) as Record<string, unknown>;
    expect(row.status).toBe("done");
    db.close();
  });

  it("rejects invalid status values", () => {
    const db = createTestDb();
    const created = JSON.parse(
      handleCreateTask(db, dbPath, { title: "Status task" }).content[0].text
    );

    const result = handleUpdateTaskStatus(db, dbPath, { taskId: created.id, status: "invalid" });
    expect(result.isError).toBe(true);
    db.close();
  });
});

describe("handleDeleteTask", () => {
  it("removes task from database", () => {
    const db = createTestDb();
    const created = JSON.parse(
      handleCreateTask(db, dbPath, { title: "To delete" }).content[0].text
    );

    const result = handleDeleteTask(db, dbPath, { taskId: created.id });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.deleted).toBe(true);

    const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(created.id);
    expect(row).toBeUndefined();
    db.close();
  });
});

describe("handleUpdatePhaseStatus", () => {
  it("returns descriptive message about phase status", () => {
    const db = createTestDb();
    const result = handleUpdatePhaseStatus(db, dbPath, { phaseId: "phase-1", status: "complete" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.phaseId).toBe("phase-1");
    expect(parsed.status).toBe("complete");
    db.close();
  });
});

describe("handleCreateProject", () => {
  it("inserts a row into projects table and returns JSON with id and name", () => {
    const db = createTestDb();
    const result = handleCreateProject(db, dbPath, { name: "Test Project" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBeDefined();
    expect(parsed.name).toBe("Test Project");

    const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(parsed.id) as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.name).toBe("Test Project");
    db.close();
  });
});

describe("handleCreateTheme", () => {
  it("inserts a row into themes table and returns JSON with id, name, color", () => {
    const db = createTestDb();
    const result = handleCreateTheme(db, dbPath, { name: "Work", color: "#FF0000" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBeDefined();
    expect(parsed.name).toBe("Work");
    expect(parsed.color).toBe("#FF0000");

    const row = db.prepare("SELECT * FROM themes WHERE id = ?").get(parsed.id) as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.name).toBe("Work");
    expect(row.color).toBe("#FF0000");
    db.close();
  });
});

describe("handleCreateFile", () => {
  it("writes a file to disk at specified path within project directory", () => {
    const db = createTestDb();
    const projDir = join(testDir, "project-dir");
    mkdirSync(projDir, { recursive: true });
    const now = new Date().toISOString();
    db.prepare("INSERT INTO projects (id, name, directory, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run("proj-1", "Test", projDir, now, now);

    const result = handleCreateFile(db, dbPath, {
      path: "src/hello.txt",
      content: "Hello World",
      projectId: "proj-1",
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.created).toBe(true);
    expect(existsSync(join(projDir, "src/hello.txt"))).toBe(true);
    expect(readFileSync(join(projDir, "src/hello.txt"), "utf-8")).toBe("Hello World");
    db.close();
  });

  it("returns error when project has no linked directory", () => {
    const db = createTestDb();
    const now = new Date().toISOString();
    db.prepare("INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .run("proj-2", "No Dir", now, now);

    const result = handleCreateFile(db, dbPath, {
      path: "test.txt",
      content: "data",
      projectId: "proj-2",
    });
    expect(result.isError).toBe(true);
    db.close();
  });
});

describe("return format", () => {
  it("all handlers return { content: [{ type: text, text: ... }] } format", () => {
    const db = createTestDb();
    const results = [
      handleCreateTask(db, dbPath, { title: "t" }),
      handleCreateProject(db, dbPath, { name: "p" }),
      handleCreateTheme(db, dbPath, { name: "th", color: "#000" }),
    ];
    for (const result of results) {
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(typeof result.content[0].text).toBe("string");
    }
    db.close();
  });
});

describe("emitDataChanged", () => {
  it("writes a data-changed notification file to the agent queue notifications directory", () => {
    emitDataChanged(dbPath, "task-created");

    const notifDir = join(testDir, "agent-queue", "notifications");
    expect(existsSync(notifDir)).toBe(true);
    const files = readdirSync(notifDir).filter((f) => f.startsWith("data-changed-"));
    expect(files.length).toBeGreaterThanOrEqual(1);

    const content = JSON.parse(readFileSync(join(notifDir, files[0]), "utf-8"));
    expect(content.type).toBe("data-changed");
    expect(content.event).toBe("task-created");
    expect(content.timestamp).toBeDefined();
  });
});
