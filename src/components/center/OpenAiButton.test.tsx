import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Hoist mock functions so they're available to vi.mock factories
const {
  mockToast,
  mockGetAppSetting,
  mockValidateCliTool,
  mockGenerateContextFile,
  mockStartPlanWatcher,
  mockLaunchTerminalCommand,
} = vi.hoisted(() => {
  const mockToast = Object.assign(vi.fn(), { error: vi.fn() });
  return {
    mockToast,
    mockGetAppSetting: vi.fn(),
    mockValidateCliTool: vi.fn(),
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
    getAppSetting: (...args: unknown[]) => mockGetAppSetting(...args),
    validateCliTool: (...args: unknown[]) => mockValidateCliTool(...args),
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

  it("shows error toast when no CLI tool configured", async () => {
    const user = userEvent.setup();
    mockGetAppSetting.mockResolvedValue(null);

    render(<OpenAiButton projectId="proj-1" directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /open ai/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("No AI tool configured")
      );
    });
    expect(mockLaunchTerminalCommand).not.toHaveBeenCalled();
  });

  it("shows error toast when CLI tool not found on system", async () => {
    const user = userEvent.setup();
    mockGetAppSetting.mockImplementation((key: string) =>
      Promise.resolve(key === "cli_command" ? "nonexistent" : null)
    );
    mockValidateCliTool.mockResolvedValue(false);

    render(<OpenAiButton projectId="proj-1" directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /open ai/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("not found on your system")
      );
    });
    expect(mockGenerateContextFile).not.toHaveBeenCalled();
  });

  it("validates CLI tool, generates context, and launches in terminal", async () => {
    const user = userEvent.setup();
    mockGetAppSetting.mockImplementation((key: string) =>
      Promise.resolve(
        key === "cli_command" ? "claude" : key === "cli_args" ? "--fast" : null
      )
    );
    mockValidateCliTool.mockResolvedValue(true);
    mockGenerateContextFile.mockResolvedValue("/path/.element/context.md");
    mockStartPlanWatcher.mockResolvedValue(undefined);

    render(<OpenAiButton projectId="proj-1" directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /open ai/i }));

    await waitFor(() => {
      expect(mockValidateCliTool).toHaveBeenCalledWith("claude");
      expect(mockGenerateContextFile).toHaveBeenCalledWith("proj-1");
      expect(mockStartPlanWatcher).toHaveBeenCalledWith("/some/dir");
      expect(mockLaunchTerminalCommand).toHaveBeenCalledWith("claude", [
        "--fast",
        "--",
        "/path/.element/context.md",
      ]);
    });
  });

  describe("Phase 14: Tier gate", () => {
    // PLAN-01: Dialog gate
    it.todo("opens tier dialog when project has no tier and no tasks");
    it.todo("skips tier dialog when project has a stored tier");
    it.todo("skips tier dialog when project has existing tasks");

    // PLAN-04: GSD behavior
    it.todo("skips plan watcher when tier is 'full' (GSD)");
    it.todo("starts plan watcher when tier is 'quick'");
    it.todo("starts plan watcher when tier is 'medium'");

    // D-07: Context file regeneration after confirm
    it.todo("regenerates context file after plan confirmation");
  });

  it("shows error toast on generateContextFile failure", async () => {
    const user = userEvent.setup();
    mockGetAppSetting.mockImplementation((key: string) =>
      Promise.resolve(key === "cli_command" ? "claude" : null)
    );
    mockValidateCliTool.mockResolvedValue(true);
    mockGenerateContextFile.mockRejectedValue(new Error("File write failed"));

    render(<OpenAiButton projectId="proj-1" directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /open ai/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });
});
