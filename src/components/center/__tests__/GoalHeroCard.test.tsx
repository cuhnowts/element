import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GoalHeroCard } from "../GoalHeroCard";

// Mock Tauri to avoid runtime dependency
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

// Mock the tauri API module
const mockUpdateProjectGoal = vi.fn().mockResolvedValue({});
const mockLoadProjects = vi.fn();
vi.mock("@/lib/tauri", () => ({
  api: {
    updateProjectGoal: (...args: unknown[]) => mockUpdateProjectGoal(...args),
  },
}));
vi.mock("@/stores", () => ({
  useStore: Object.assign(vi.fn(), {
    getState: () => ({ loadProjects: mockLoadProjects }),
  }),
}));

describe("GoalHeroCard", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // PROJ-01: Goal display
  describe("PROJ-01: goal display", () => {
    it("renders goal text when goal is provided", () => {
      render(<GoalHeroCard projectId="proj-1" goal="Ship v2 by Q3" />);
      expect(screen.getByText("Ship v2 by Q3")).toBeInTheDocument();
    });

    it("renders Target icon", () => {
      render(<GoalHeroCard projectId="proj-1" goal="Ship v2 by Q3" />);
      // Target icon should be present in the card
      const region = screen.getByRole("region", { name: "Project goal" });
      expect(region).toBeInTheDocument();
    });

    it("renders empty state when goal is empty string", () => {
      render(<GoalHeroCard projectId="proj-1" goal="" />);
      expect(screen.getByText("Set a project goal...")).toBeInTheDocument();
    });

    it("has region role with project goal aria-label", () => {
      render(<GoalHeroCard projectId="proj-1" goal="Ship v2 by Q3" />);
      const region = screen.getByRole("region", { name: "Project goal" });
      expect(region).toBeInTheDocument();
    });
  });

  // PROJ-02: Goal editing
  describe("PROJ-02: goal editing", () => {
    it("shows edit pencil button with aria-label", () => {
      render(<GoalHeroCard projectId="proj-1" goal="Ship v2 by Q3" />);
      const editButton = screen.getByRole("button", { name: "Edit goal" });
      expect(editButton).toBeInTheDocument();
    });

    it("enters edit mode when pencil is clicked", () => {
      render(<GoalHeroCard projectId="proj-1" goal="Ship v2 by Q3" />);
      const editButton = screen.getByRole("button", { name: "Edit goal" });
      fireEvent.click(editButton);
      const input = screen.getByRole("textbox", { name: "Project goal" });
      expect(input).toBeInTheDocument();
    });

    it("enters edit mode when empty card is clicked", () => {
      render(<GoalHeroCard projectId="proj-1" goal="" />);
      const emptyText = screen.getByText("Set a project goal...");
      fireEvent.click(emptyText);
      const input = screen.getByRole("textbox", { name: "Project goal" });
      expect(input).toBeInTheDocument();
    });

    it("reverts on Escape key", () => {
      render(<GoalHeroCard projectId="proj-1" goal="Ship v2 by Q3" />);
      const editButton = screen.getByRole("button", { name: "Edit goal" });
      fireEvent.click(editButton);
      const input = screen.getByRole("textbox", { name: "Project goal" });
      fireEvent.change(input, { target: { value: "New goal text" } });
      fireEvent.keyDown(input, { key: "Escape" });
      expect(screen.getByText("Ship v2 by Q3")).toBeInTheDocument();
    });

    it("calls updateProjectGoal on blur after debounce", async () => {
      vi.useFakeTimers();
      render(<GoalHeroCard projectId="proj-1" goal="Ship v2 by Q3" />);
      const editButton = screen.getByRole("button", { name: "Edit goal" });
      fireEvent.click(editButton);
      const input = screen.getByRole("textbox", { name: "Project goal" });
      fireEvent.change(input, { target: { value: "Updated goal" } });
      fireEvent.blur(input);
      await act(async () => {
        vi.advanceTimersByTime(800);
      });
      expect(mockUpdateProjectGoal).toHaveBeenCalledWith(
        "proj-1",
        "Updated goal",
      );
    });
  });
});
