import { describe, it } from "vitest";

describe("ActionChipBar", () => {
  // BRIEF-01: Action chip triggers briefing
  describe("Run Daily Briefing chip", () => {
    it.todo("calls onRunBriefing when clicked");
    it.todo("shows Sparkles icon in default state");
    it.todo("shows spinning Loader2 icon and 'Generating briefing...' when isGenerating is true");
    it.todo("is disabled when isGenerating is true");
  });

  describe("placeholder chips", () => {
    it.todo("renders 'Organize Calendar' chip as disabled");
    it.todo("renders 'Organize Goals' chip as disabled");
    it.todo("shows 'Coming soon' title on disabled chips");
  });
});
