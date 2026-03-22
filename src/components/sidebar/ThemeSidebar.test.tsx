import { describe, it } from "vitest";

describe("ThemeSidebar", () => {
  it.todo("renders THEMES header with + button");
  it.todo("renders empty state when no themes and no uncategorized items");
  it.todo("renders ThemeSection for each theme");
  it.todo("renders UncategorizedSection for null-themed items");
  it.todo("groups projects by themeId into correct sections");
  it.todo("groups standalone tasks (no projectId) by themeId");
  it.todo("standalone tasks with no themeId appear in uncategorized bucket");
  it.todo("opening CreateThemeDialog via + button");
  it.todo("drag-and-drop reorder calls reorderThemes with new order");
});
