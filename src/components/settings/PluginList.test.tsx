import { describe, it } from "vitest";

describe("PluginList", () => {
  describe("loading state", () => {
    it.todo("renders 3 skeleton cards when pluginsLoading is true");
  });

  describe("empty state", () => {
    it.todo("renders 'No plugins installed' heading when plugins array is empty");
    it.todo("renders 'Open Plugins Folder' button in empty state");
  });

  describe("populated state", () => {
    it.todo("renders a PluginCard for each plugin in the list");
    it.todo("shows green status dot for active plugins");
    it.todo("shows red status dot and error badge for error plugins");
    it.todo("shows muted text for disabled plugins");
  });

  describe("interactions", () => {
    it.todo("calls enablePlugin when Switch toggled on for disabled plugin");
    it.todo("calls disablePlugin when Switch toggled off for active plugin");
    it.todo("expands error detail when error badge is clicked");
    it.todo("calls reloadPlugin when 'Reload Plugin' button is clicked");
    it.todo("calls scanPlugins when 'Scan Plugins' button is clicked");
  });
});
