import { describe, it } from "vitest";

describe("HubCenterPanel", () => {
  // BRIEF-01: No auto-fire on hub load
  describe("initial load", () => {
    it.todo("renders greeting and action chips without triggering briefing generation");
    it.todo("does not call invoke('generate_briefing') on mount");
    it.todo("shows contextual summary from generate_context_summary invoke");
  });

  // BRIEF-04: Briefing + chat consolidated
  describe("unified interface", () => {
    it.todo("renders BriefingGreeting, ActionChipBar, and HubChat in single scrollable view");
    it.todo("renders briefing cards inline above chat messages when briefing data exists");
    it.todo("preserves chat messages when briefing is regenerated");
  });

  describe("briefing generation", () => {
    it.todo("calls requestBriefing and invoke on Run Daily Briefing click");
    it.todo("shows skeleton cards when briefingStatus is loading");
    it.todo("shows error message when briefingStatus is error");
  });

  describe("back to top", () => {
    it.todo("shows back-to-top button when scrolled past threshold");
    it.todo("scrolls to top on button click");
  });
});
