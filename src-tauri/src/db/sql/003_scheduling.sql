ALTER TABLE tasks ADD COLUMN due_date TEXT;
ALTER TABLE tasks ADD COLUMN scheduled_date TEXT;
ALTER TABLE tasks ADD COLUMN scheduled_time TEXT;
ALTER TABLE tasks ADD COLUMN duration_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
