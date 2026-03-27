-- Migration 010: Planning tier on projects, sync source tagging on phases and tasks

-- Add planning_tier to projects (replaces dead ai_mode conceptually, per D-09)
-- NULL = no tier selected yet; values: quick, medium, full (per D-10)
ALTER TABLE projects ADD COLUMN planning_tier TEXT
    CHECK(planning_tier IN ('quick', 'medium', 'full'));

-- Add source tagging to phases for sync (per D-13, D-14)
ALTER TABLE phases ADD COLUMN source TEXT NOT NULL DEFAULT 'user'
    CHECK(source IN ('user', 'sync'));

-- Add source tagging to tasks for sync (per D-13, D-14)
ALTER TABLE tasks ADD COLUMN source TEXT NOT NULL DEFAULT 'user'
    CHECK(source IN ('user', 'sync'));
