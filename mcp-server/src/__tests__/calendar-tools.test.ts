import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";

// Mock emitDataChanged before importing calendar-tools
vi.mock("../tools/write-tools.js", () => ({
  emitDataChanged: vi.fn(),
}));

import {
  handleListCalendarEvents,
  handleGetAvailableSlots,
  handleCreateWorkBlock,
  handleMoveWorkBlock,
  handleDeleteWorkBlock,
} from "../tools/calendar-tools.js";

let db: InstanceType<typeof Database>;

function createTables(testDb: InstanceType<typeof Database>) {
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      location TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      all_day INTEGER NOT NULL DEFAULT 0,
      attendees TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'confirmed',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_blocks (
      id TEXT PRIMARY KEY,
      schedule_date TEXT NOT NULL,
      task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      block_type TEXT NOT NULL CHECK(block_type IN ('work', 'meeting', 'buffer')),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_confirmed INTEGER NOT NULL DEFAULT 0,
      source_event_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_hours (
      id INTEGER PRIMARY KEY,
      start_time TEXT NOT NULL DEFAULT '09:00',
      end_time TEXT NOT NULL DEFAULT '17:00',
      work_days TEXT NOT NULL DEFAULT 'mon,tue,wed,thu,fri',
      buffer_minutes INTEGER NOT NULL DEFAULT 10,
      min_block_minutes INTEGER NOT NULL DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      project_id TEXT,
      phase_id TEXT,
      estimated_minutes INTEGER,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

describe("calendar-tools", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    createTables(db);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  // --- handleListCalendarEvents ---

  describe("handleListCalendarEvents", () => {
    it("returns events within date range", () => {
      db.exec(`
        INSERT INTO calendar_events (id, account_id, title, description, location, start_time, end_time, all_day, status, updated_at)
        VALUES ('evt-1', 'acc-1', 'Morning Standup', 'Daily standup', 'Room A', '2026-04-03T09:00:00', '2026-04-03T09:30:00', 0, 'confirmed', '2026-04-03T00:00:00');
      `);

      const result = handleListCalendarEvents(db, {
        startDate: "2026-04-03",
        endDate: "2026-04-03",
      });

      const events = JSON.parse(result.content[0].text);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe("evt-1");
      expect(events[0].title).toBe("Morning Standup");
      expect(events[0].description).toBe("Daily standup");
      expect(events[0].location).toBe("Room A");
      expect(events[0].start_time).toBe("2026-04-03T09:00:00");
      expect(events[0].end_time).toBe("2026-04-03T09:30:00");
      expect(events[0].all_day).toBe(0);
      expect(events[0].status).toBe("confirmed");
    });

    it("returns empty array when no events match", () => {
      const result = handleListCalendarEvents(db, {
        startDate: "2026-04-03",
        endDate: "2026-04-03",
      });

      const events = JSON.parse(result.content[0].text);
      expect(events).toEqual([]);
    });

    it("excludes events outside date range", () => {
      db.exec(`
        INSERT INTO calendar_events (id, account_id, title, start_time, end_time, updated_at)
        VALUES ('evt-1', 'acc-1', 'Yesterday', '2026-04-02T10:00:00', '2026-04-02T11:00:00', '2026-04-02T00:00:00');
        INSERT INTO calendar_events (id, account_id, title, start_time, end_time, updated_at)
        VALUES ('evt-2', 'acc-1', 'Today', '2026-04-03T10:00:00', '2026-04-03T11:00:00', '2026-04-03T00:00:00');
      `);

      const result = handleListCalendarEvents(db, {
        startDate: "2026-04-03",
        endDate: "2026-04-03",
      });

      const events = JSON.parse(result.content[0].text);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Today");
    });
  });

  // --- handleGetAvailableSlots ---

  describe("handleGetAvailableSlots", () => {
    it("returns single full-day gap with no events and no blocks", () => {
      const result = handleGetAvailableSlots(db, { date: "2026-04-03" });
      const slots = JSON.parse(result.content[0].text);

      expect(slots).toHaveLength(1);
      expect(slots[0].start).toBe("09:00");
      expect(slots[0].end).toBe("17:00");
      expect(slots[0].duration_minutes).toBe(480);
    });

    it("returns gaps around a calendar event with buffer", () => {
      db.exec(`
        INSERT INTO calendar_events (id, account_id, title, start_time, end_time, updated_at)
        VALUES ('evt-1', 'acc-1', 'Meeting', '2026-04-03T10:00:00', '2026-04-03T11:00:00', '2026-04-03T00:00:00');
      `);

      const result = handleGetAvailableSlots(db, { date: "2026-04-03" });
      const slots = JSON.parse(result.content[0].text);

      expect(slots).toHaveLength(2);
      // Before: 09:00 to 09:50 (50 min, 10 min buffer before event)
      expect(slots[0].start).toBe("09:00");
      expect(slots[0].end).toBe("09:50");
      expect(slots[0].duration_minutes).toBe(50);
      // After: 11:10 to 17:00 (350 min, 10 min buffer after event)
      expect(slots[1].start).toBe("11:10");
      expect(slots[1].end).toBe("17:00");
      expect(slots[1].duration_minutes).toBe(350);
    });

    it("treats existing confirmed scheduled_blocks as occupied without buffer", () => {
      db.exec(`
        INSERT INTO scheduled_blocks (id, schedule_date, task_id, block_type, start_time, end_time, is_confirmed, created_at)
        VALUES ('blk-1', '2026-04-03', NULL, 'work', '10:00', '11:00', 1, '2026-04-03T00:00:00');
      `);

      const result = handleGetAvailableSlots(db, { date: "2026-04-03" });
      const slots = JSON.parse(result.content[0].text);

      expect(slots).toHaveLength(2);
      // Before block: 09:00-10:00 (no buffer on work blocks)
      expect(slots[0].start).toBe("09:00");
      expect(slots[0].end).toBe("10:00");
      expect(slots[0].duration_minutes).toBe(60);
      // After block: 11:00-17:00 (no buffer on work blocks)
      expect(slots[1].start).toBe("11:00");
      expect(slots[1].end).toBe("17:00");
      expect(slots[1].duration_minutes).toBe(360);
    });

    it("uses defaults when no work_hours row exists", () => {
      // No work_hours inserted -- should use 09:00-17:00 defaults
      const result = handleGetAvailableSlots(db, { date: "2026-04-03" });
      const slots = JSON.parse(result.content[0].text);

      expect(slots).toHaveLength(1);
      expect(slots[0].start).toBe("09:00");
      expect(slots[0].end).toBe("17:00");
    });

    it("uses custom work_hours when configured", () => {
      db.exec(`
        INSERT INTO work_hours (id, start_time, end_time, work_days, buffer_minutes, min_block_minutes)
        VALUES (1, '08:00', '16:00', 'mon,tue,wed,thu,fri', 5, 15);
      `);

      const result = handleGetAvailableSlots(db, { date: "2026-04-03" });
      const slots = JSON.parse(result.content[0].text);

      expect(slots).toHaveLength(1);
      expect(slots[0].start).toBe("08:00");
      expect(slots[0].end).toBe("16:00");
      expect(slots[0].duration_minutes).toBe(480);
    });

    it("ignores unconfirmed scheduled_blocks", () => {
      db.exec(`
        INSERT INTO scheduled_blocks (id, schedule_date, task_id, block_type, start_time, end_time, is_confirmed, created_at)
        VALUES ('blk-1', '2026-04-03', NULL, 'work', '10:00', '11:00', 0, '2026-04-03T00:00:00');
      `);

      const result = handleGetAvailableSlots(db, { date: "2026-04-03" });
      const slots = JSON.parse(result.content[0].text);

      // Unconfirmed block should be ignored -- full day available
      expect(slots).toHaveLength(1);
      expect(slots[0].duration_minutes).toBe(480);
    });
  });

  // --- handleCreateWorkBlock ---

  describe("handleCreateWorkBlock", () => {
    it("creates a work block and returns its data", () => {
      db.exec(`INSERT INTO tasks (id, title) VALUES ('task-1', 'Test Task')`);

      const result = handleCreateWorkBlock(db, "/tmp/test.db", {
        date: "2026-04-03",
        taskId: "task-1",
        startTime: "09:00",
        endTime: "10:00",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBeDefined();
      expect(data.date).toBe("2026-04-03");
      expect(data.taskId).toBe("task-1");
      expect(data.startTime).toBe("09:00");
      expect(data.endTime).toBe("10:00");

      // Verify DB row
      const row = db
        .prepare("SELECT * FROM scheduled_blocks WHERE id = ?")
        .get(data.id) as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row.block_type).toBe("work");
      expect(row.is_confirmed).toBe(1);
    });

    it("returns error for non-existent taskId", () => {
      const result = handleCreateWorkBlock(db, "/tmp/test.db", {
        date: "2026-04-03",
        taskId: "does-not-exist",
        startTime: "09:00",
        endTime: "10:00",
      });

      expect(result.content[0].text).toContain("Error");
      expect((result as { isError?: boolean }).isError).toBe(true);
    });

    it("calls emitDataChanged after creation", async () => {
      db.exec(`INSERT INTO tasks (id, title) VALUES ('task-1', 'Test Task')`);

      handleCreateWorkBlock(db, "/tmp/test.db", {
        date: "2026-04-03",
        taskId: "task-1",
        startTime: "09:00",
        endTime: "10:00",
      });

      const { emitDataChanged } = await import("../tools/write-tools.js");
      expect(emitDataChanged).toHaveBeenCalledWith(
        "/tmp/test.db",
        "schedule-changed"
      );
    });
  });

  // --- handleMoveWorkBlock ---

  describe("handleMoveWorkBlock", () => {
    it("moves an existing block to new times", () => {
      db.exec(`
        INSERT INTO scheduled_blocks (id, schedule_date, task_id, block_type, start_time, end_time, is_confirmed, created_at)
        VALUES ('blk-1', '2026-04-03', NULL, 'work', '09:00', '10:00', 1, '2026-04-03T00:00:00');
      `);

      const result = handleMoveWorkBlock(db, "/tmp/test.db", {
        blockId: "blk-1",
        startTime: "14:00",
        endTime: "15:00",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.blockId).toBe("blk-1");
      expect(data.startTime).toBe("14:00");
      expect(data.endTime).toBe("15:00");

      // Verify DB updated
      const row = db
        .prepare("SELECT start_time, end_time FROM scheduled_blocks WHERE id = ?")
        .get("blk-1") as { start_time: string; end_time: string };
      expect(row.start_time).toBe("14:00");
      expect(row.end_time).toBe("15:00");
    });

    it("returns error for non-existent blockId", () => {
      const result = handleMoveWorkBlock(db, "/tmp/test.db", {
        blockId: "does-not-exist",
        startTime: "14:00",
        endTime: "15:00",
      });

      expect(result.content[0].text).toContain("Error");
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handleDeleteWorkBlock ---

  describe("handleDeleteWorkBlock", () => {
    it("deletes an existing block", () => {
      db.exec(`
        INSERT INTO scheduled_blocks (id, schedule_date, task_id, block_type, start_time, end_time, is_confirmed, created_at)
        VALUES ('blk-1', '2026-04-03', NULL, 'work', '09:00', '10:00', 1, '2026-04-03T00:00:00');
      `);

      const result = handleDeleteWorkBlock(db, "/tmp/test.db", {
        blockId: "blk-1",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.blockId).toBe("blk-1");
      expect(data.deleted).toBe(true);

      // Verify row deleted
      const row = db
        .prepare("SELECT id FROM scheduled_blocks WHERE id = ?")
        .get("blk-1");
      expect(row).toBeUndefined();
    });

    it("returns error for non-existent blockId", () => {
      const result = handleDeleteWorkBlock(db, "/tmp/test.db", {
        blockId: "does-not-exist",
      });

      expect(result.content[0].text).toContain("Error");
      expect((result as { isError?: boolean }).isError).toBe(true);
    });

    it("calls emitDataChanged after deletion", async () => {
      db.exec(`
        INSERT INTO scheduled_blocks (id, schedule_date, task_id, block_type, start_time, end_time, is_confirmed, created_at)
        VALUES ('blk-1', '2026-04-03', NULL, 'work', '09:00', '10:00', 1, '2026-04-03T00:00:00');
      `);

      handleDeleteWorkBlock(db, "/tmp/test.db", { blockId: "blk-1" });

      const { emitDataChanged } = await import("../tools/write-tools.js");
      expect(emitDataChanged).toHaveBeenCalledWith(
        "/tmp/test.db",
        "schedule-changed"
      );
    });
  });
});
