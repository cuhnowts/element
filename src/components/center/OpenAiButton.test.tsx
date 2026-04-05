import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoist mock functions so they're available to vi.mock factories
const {
  mockToast,
  mockGetAppSetting,
  mockValidateCliTool,
  mockGenerateContextFile,
  mockStartPlanWatcher,
  mockOpenTerminal,
  mockCreateSession,
  mockFindAiSession,
} = vi.hoisted(() => {
  const mockToast = Object.assign(vi.fn(), { error: vi.fn() });
  return {
    mockToast,
    mockGetAppSetting: vi.fn(),
    mockValidateCliTool: vi.fn(),
    mockGenerateContextFile: vi.fn(),
    mockStartPlanWatcher: vi.fn(),
    mockOpenTerminal: vi.fn(),
    mockCreateSession: vi.fn(),
    mockFindAiSession: vi.fn().mockReturnValue(null),
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
    selector({ openTerminal: mockOpenTerminal }),
}));

vi.mock("@/stores/useTerminalSessionStore", () => ({
  useTerminalSessionStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ createSession: mockCreateSession, findAiSession: mockFindAiSession }),
    {
      getState: () => ({
        createSession: mockCreateSession,
        findAiSession: mockFindAiSession,
      }),
    },
  ),
}));

vi.mock("@/components/output/RefreshContextDialog", () => ({
  RefreshContextDialog: () => null,
}));

import { getAiButtonState, OpenAiButton } from "./OpenAiButton";

describe("getAiButtonState", () => {
  it("returns 'Link Directory' disabled with tooltip when no directory linked", () => {
    const result = getAiButtonState({
      directoryPath: null,
      planningTier: null,
      hasContent: false,
      isExecuting: false,
    });
    expect(result).toEqual({
      label: "Link Directory",
      disabled: true,
      tooltip: "Link a directory first",
      showSpinner: false,
    });
  });

  it("returns 'Plan Project' when directory exists but no tier and no content", () => {
    const result = getAiButtonState({
      directoryPath: "/some/path",
      planningTier: null,
      hasContent: false,
      isExecuting: false,
    });
    expect(result).toEqual({
      label: "Plan Project",
      disabled: false,
      tooltip: undefined,
      showSpinner: false,
    });
  });

  it("returns 'Check Progress' when project has content", () => {
    const result = getAiButtonState({
      directoryPath: "/some/path",
      planningTier: "quick",
      hasContent: true,
      isExecuting: false,
    });
    expect(result).toEqual({
      label: "Check Progress",
      disabled: false,
      tooltip: undefined,
      showSpinner: false,
    });
  });

  it("returns 'Open AI' with spinner when executing", () => {
    const result = getAiButtonState({
      directoryPath: "/some/path",
      planningTier: "quick",
      hasContent: true,
      isExecuting: true,
    });
    expect(result).toEqual({
      label: "Open AI",
      disabled: false,
      tooltip: undefined,
      showSpinner: true,
    });
  });

  it("returns 'Open AI' as fallback when directory and tier exist but no content", () => {
    const result = getAiButtonState({
      directoryPath: "/some/path",
      planningTier: "quick",
      hasContent: false,
      isExecuting: false,
    });
    expect(result).toEqual({
      label: "Open AI",
      disabled: false,
      tooltip: undefined,
      showSpinner: false,
    });
  });
});

const defaultProps = {
  projectId: "proj-1",
  planningTier: "quick" as const,
  hasContent: true,
  onTierDialogOpen: vi.fn(),
};

describe("OpenAiButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.error = vi.fn();
    defaultProps.onTierDialogOpen = vi.fn();
  });

  it("shows disabled button with 'Link Directory' label when no directory linked", async () => {
    const user = userEvent.setup();
    render(<OpenAiButton {...defaultProps} directoryPath={null} />);

    const button = screen.getByRole("button", { name: /link directory/i });
    expect(button).toHaveAttribute("aria-disabled", "true");

    await user.click(button);

    // Click is silently prevented via aria-disabled guard
    expect(mockGenerateContextFile).not.toHaveBeenCalled();
    expect(mockGetAppSetting).not.toHaveBeenCalled();
  });

  it("shows error toast when no CLI tool configured", async () => {
    const user = userEvent.setup();
    mockGetAppSetting.mockResolvedValue(null);

    render(<OpenAiButton {...defaultProps} directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /check progress/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("No AI tool configured"),
      );
    });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("shows error toast when CLI tool not found on system", async () => {
    const user = userEvent.setup();
    mockGetAppSetting.mockImplementation((key: string) =>
      Promise.resolve(key === "cli_command" ? "nonexistent" : null),
    );
    mockValidateCliTool.mockResolvedValue(false);

    render(<OpenAiButton {...defaultProps} directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /check progress/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("not found on your system"),
      );
    });
    expect(mockGenerateContextFile).not.toHaveBeenCalled();
  });

  it("validates CLI tool, generates context, and launches in terminal", async () => {
    const user = userEvent.setup();
    mockGetAppSetting.mockImplementation((key: string) =>
      Promise.resolve(key === "cli_command" ? "claude" : key === "cli_args" ? "--fast" : null),
    );
    mockValidateCliTool.mockResolvedValue(true);
    mockGenerateContextFile.mockResolvedValue("/path/.element/context.md");
    mockStartPlanWatcher.mockResolvedValue(undefined);

    render(<OpenAiButton {...defaultProps} directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /check progress/i }));

    await waitFor(() => {
      expect(mockValidateCliTool).toHaveBeenCalledWith("claude");
      expect(mockGenerateContextFile).toHaveBeenCalledWith("proj-1", "quick");
      expect(mockStartPlanWatcher).toHaveBeenCalledWith("/some/dir");
      expect(mockCreateSession).toHaveBeenCalledWith("proj-1", "AI Planning", "ai", {
        command: "claude",
        args: ["--fast", "@/path/.element/context.md"],
      });
      expect(mockOpenTerminal).toHaveBeenCalled();
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

  // ROOT CAUSE (17-02 diagnosis): startPlanWatcher rejection falls into the
  // generic catch block ("Failed to launch AI: ...") instead of a specific
  // error message, and there is no explicit guard preventing launchTerminalCommand
  // from being called if startPlanWatcher were to resolve but signal an error.
  // The navigation-to-home bug occurs because the generic catch path does not
  // provide actionable guidance to the user, and in edge cases (non-Error
  // rejections) could swallow the error entirely. The fix adds an explicit
  // try/catch around startPlanWatcher with a descriptive toast message.
  it("does not navigate away when startPlanWatcher fails and shows descriptive error", async () => {
    const user = userEvent.setup();
    mockGetAppSetting.mockImplementation((key: string) =>
      Promise.resolve(key === "cli_command" ? "claude" : null),
    );
    mockValidateCliTool.mockResolvedValue(true);
    mockGenerateContextFile.mockResolvedValue("/path/.element/context.md");
    mockStartPlanWatcher.mockRejectedValue(new Error("Watcher failed"));

    render(<OpenAiButton {...defaultProps} directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /check progress/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Could not start plan watcher. Please try again.",
      );
    });
    // The key assertion: launchTerminalCommand must NOT be called
    // when startPlanWatcher fails
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("shows error toast on generateContextFile failure", async () => {
    const user = userEvent.setup();
    mockGetAppSetting.mockImplementation((key: string) =>
      Promise.resolve(key === "cli_command" ? "claude" : null),
    );
    mockValidateCliTool.mockResolvedValue(true);
    mockGenerateContextFile.mockRejectedValue(new Error("File write failed"));

    render(<OpenAiButton {...defaultProps} directoryPath="/some/dir" />);

    await user.click(screen.getByRole("button", { name: /check progress/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });
});
