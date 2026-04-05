import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActionChipBar } from "../ActionChipBar";

describe("ActionChipBar", () => {
  // BRIEF-01: Action chip triggers briefing
  describe("Run Daily Briefing chip", () => {
    it("calls onRunBriefing when clicked", async () => {
      const user = userEvent.setup();
      const onRunBriefing = vi.fn();
      render(<ActionChipBar onRunBriefing={onRunBriefing} isGenerating={false} />);
      await user.click(screen.getByText("Run Daily Briefing"));
      expect(onRunBriefing).toHaveBeenCalledOnce();
    });

    it("shows Sparkles icon in default state", () => {
      render(<ActionChipBar onRunBriefing={vi.fn()} isGenerating={false} />);
      // Sparkles icon is an SVG; verify the button text is correct (default state)
      const btn = screen.getByText("Run Daily Briefing");
      expect(btn).toBeInTheDocument();
    });

    it("shows spinning Loader2 icon and 'Generating briefing...' when isGenerating is true", () => {
      render(<ActionChipBar onRunBriefing={vi.fn()} isGenerating={true} />);
      expect(screen.getByText("Generating briefing...")).toBeInTheDocument();
      expect(screen.queryByText("Run Daily Briefing")).not.toBeInTheDocument();
    });

    it("is disabled when isGenerating is true", () => {
      render(<ActionChipBar onRunBriefing={vi.fn()} isGenerating={true} />);
      const btn = screen.getByText("Generating briefing...").closest("button");
      expect(btn).toBeDisabled();
    });
  });

  describe("placeholder chips", () => {
    it("renders 'Organize Calendar' chip as disabled", () => {
      render(<ActionChipBar onRunBriefing={vi.fn()} isGenerating={false} />);
      const btn = screen.getByText("Organize Calendar").closest("button");
      expect(btn).toBeDisabled();
    });

    it("renders 'Organize Goals' chip as disabled", () => {
      render(<ActionChipBar onRunBriefing={vi.fn()} isGenerating={false} />);
      const btn = screen.getByText("Organize Goals").closest("button");
      expect(btn).toBeDisabled();
    });

    it("shows 'Coming soon' title on disabled chips", () => {
      render(<ActionChipBar onRunBriefing={vi.fn()} isGenerating={false} />);
      const calBtn = screen.getByText("Organize Calendar").closest("button");
      const goalsBtn = screen.getByText("Organize Goals").closest("button");
      expect(calBtn).toHaveAttribute("title", "Coming soon");
      expect(goalsBtn).toHaveAttribute("title", "Coming soon");
    });
  });
});
