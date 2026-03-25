import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Hoist mock functions so they're available to vi.mock factories
const {
  mockToast,
  mockGenerateContextFile,
  mockStartPlanWatcher,
  mockLaunchTerminalCommand,
} = vi.hoisted(() => {
  const mockToast = Object.assign(vi.fn(), { error: vi.fn() });
  return {
    mockToast,
    mockGenerateContextFile: vi.fn(),
    mockStartPlanWatcher: vi.fn(),
    mockLaunchTerminalCommand: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: mockToast,
}));

vi.mock("@/lib/tauri", () => ({
  api: {
    generateContextFile: (...args: unknown[]) => mockGenerateContextFile(...args),
    startPlanWatcher: (...args: unknown[]) => mockStartPlanWatcher(...args),
  },
}));

vi.mock("@/stores/useWorkspaceStore", () => ({
  useWorkspaceStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ launchTerminalCommand: mockLaunchTerminalCommand }),
}));

import { OpenAiButton } from "./OpenAiButton";

describe("OpenAiButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.error = vi.fn();
  });

  it("shows error toast when no directory linked", async () => {
    const user = userEvent.setup();
    render(<OpenAiButton projectId="proj-1" directoryPath={null} />);

    await user.click(screen.getByRole("button", { name: /open ai/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining("Link a project directory")
    );
    expect(mockGenerateContextFile).not.toHaveBeenCalled();
  });

  it("generates context file and launches claude in terminal", async () => {
    const user = userEvent.setup();
    mockGenerateContextFile.mockResolvedValue("/path/.element/context.md");
    mockStartPlanWatcher.mockResolvedValue(undefined);

    render(<OpenAiButton projectId="proj-1" directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /open ai/i }));

    await waitFor(() => {
      expect(mockGenerateContextFile).toHaveBeenCalledWith("proj-1");
      expect(mockStartPlanWatcher).toHaveBeenCalledWith("/some/dir");
      expect(mockLaunchTerminalCommand).toHaveBeenCalledWith("claude", [
        "--dangerously-skip-permissions",
        "/path/.element/context.md",
      ]);
    });
  });

  it("shows error toast on generateContextFile failure", async () => {
    const user = userEvent.setup();
    mockGenerateContextFile.mockRejectedValue(new Error("File write failed"));

    render(<OpenAiButton projectId="proj-1" directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /open ai/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });
});
