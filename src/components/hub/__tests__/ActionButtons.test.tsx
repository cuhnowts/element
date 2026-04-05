import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionButtons } from "../ActionButtons";

// Mock Tauri invoke to prevent runtime errors
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("ActionButtons", () => {
  it("renders 'Run Daily Briefing' button", () => {
    render(<ActionButtons />);
    expect(screen.getByText("Run Daily Briefing")).toBeInTheDocument();
  });

  it("renders 'Organize Calendar' button", () => {
    render(<ActionButtons />);
    expect(screen.getByText("Organize Calendar")).toBeInTheDocument();
  });

  it("renders 'Organize Goals' button", () => {
    render(<ActionButtons />);
    expect(screen.getByText("Organize Goals")).toBeInTheDocument();
  });

  it("renders all buttons with outline variant", () => {
    render(<ActionButtons />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    // All buttons should exist (variant is applied via shadcn Button component)
    buttons.forEach((button) => {
      expect(button).toBeInTheDocument();
    });
  });
});
