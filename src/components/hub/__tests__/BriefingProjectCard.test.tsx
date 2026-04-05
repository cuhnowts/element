import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BriefingProject } from "@/types/briefing";
import { BriefingProjectCard } from "../BriefingProjectCard";

const baseProject: BriefingProject = {
  name: "Test Project",
  projectId: "abc-123",
  tags: ["on-track"],
  blockers: ["API endpoint failing"],
  deadlines: ["Feature due tomorrow"],
  wins: ["Shipped authentication"],
};

describe("BriefingProjectCard", () => {
  // BRIEF-02: Structured sections rendered from BriefingJSON
  describe("sections", () => {
    it("renders blockers section with AlertTriangle icon when blockers exist", () => {
      render(<BriefingProjectCard project={baseProject} onNavigate={vi.fn()} />);
      expect(screen.getByText("Blockers")).toBeInTheDocument();
      expect(screen.getByText("API endpoint failing")).toBeInTheDocument();
    });

    it("renders deadlines section with Clock icon when deadlines exist", () => {
      render(<BriefingProjectCard project={baseProject} onNavigate={vi.fn()} />);
      expect(screen.getByText("Deadlines")).toBeInTheDocument();
      expect(screen.getByText("Feature due tomorrow")).toBeInTheDocument();
    });

    it("renders wins section with Trophy icon when wins exist", () => {
      render(<BriefingProjectCard project={baseProject} onNavigate={vi.fn()} />);
      expect(screen.getByText("Wins")).toBeInTheDocument();
      // Wins is collapsed by default, items not visible until toggled
    });

    it("omits sections with empty arrays", () => {
      const noBlockers: BriefingProject = {
        ...baseProject,
        blockers: [],
        wins: [],
      };
      render(<BriefingProjectCard project={noBlockers} onNavigate={vi.fn()} />);
      expect(screen.queryByText("Blockers")).not.toBeInTheDocument();
      expect(screen.queryByText("Wins")).not.toBeInTheDocument();
      expect(screen.getByText("Deadlines")).toBeInTheDocument();
    });
  });

  // BRIEF-03: Visually distinct cards with hierarchy
  describe("visual hierarchy", () => {
    it("renders tag badges for each project tag", () => {
      const multiTag: BriefingProject = {
        ...baseProject,
        tags: ["overdue", "blocked"],
      };
      render(<BriefingProjectCard project={multiTag} onNavigate={vi.fn()} />);
      expect(screen.getByText("overdue")).toBeInTheDocument();
      expect(screen.getByText("blocked")).toBeInTheDocument();
    });

    it("applies destructive variant for overdue and blocked tags", () => {
      const proj: BriefingProject = {
        ...baseProject,
        tags: ["overdue", "blocked"],
      };
      render(<BriefingProjectCard project={proj} onNavigate={vi.fn()} />);
      const overdueBadge = screen.getByText("overdue");
      const blockedBadge = screen.getByText("blocked");
      // Destructive badges have bg-destructive class
      expect(overdueBadge.className).toContain("bg-destructive");
      expect(blockedBadge.className).toContain("bg-destructive");
    });

    it("applies secondary variant for on-track and recently-completed tags", () => {
      const proj: BriefingProject = {
        ...baseProject,
        tags: ["on-track", "recently-completed"],
      };
      render(<BriefingProjectCard project={proj} onNavigate={vi.fn()} />);
      const onTrack = screen.getByText("on track");
      const completed = screen.getByText("recently completed");
      expect(onTrack.className).toContain("bg-secondary");
      expect(completed.className).toContain("bg-secondary");
    });
  });

  describe("interaction", () => {
    it("calls onNavigate with projectId when card header is clicked", async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      render(<BriefingProjectCard project={baseProject} onNavigate={onNavigate} />);
      // Click the card header (project name area)
      await user.click(screen.getByText("Test Project"));
      expect(onNavigate).toHaveBeenCalledWith(42);
    });

    it("does not call onNavigate when projectId is undefined", async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      const noIdProject: BriefingProject = {
        ...baseProject,
        projectId: undefined,
      };
      render(<BriefingProjectCard project={noIdProject} onNavigate={onNavigate} />);
      await user.click(screen.getByText("Test Project"));
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });
});
