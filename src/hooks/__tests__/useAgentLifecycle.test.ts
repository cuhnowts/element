import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Hoist all mocks so they're available in vi.mock factories
const {
  mockGetAppSetting,
  mockValidateCliTool,
  mockToast,
  mockSetStatus,
  mockIncrementRestart,
  mockResetRestartCount,
  mockAppDataDir,
  mockWriteTextFile,
  mockMkdir,
  mockResolveResource,
} = vi.hoisted(() => ({
  mockGetAppSetting: vi.fn(),
  mockValidateCliTool: vi.fn(),
  mockToast: Object.assign(vi.fn(), { error: vi.fn() }),
  mockSetStatus: vi.fn(),
  mockIncrementRestart: vi.fn(),
  mockResetRestartCount: vi.fn(),
  mockAppDataDir: vi.fn(),
  mockWriteTextFile: vi.fn(),
  mockMkdir: vi.fn(),
  mockResolveResource: vi.fn(),
}));

// Track restartCount manually for the mock store
let mockRestartCount = 0;

vi.mock("sonner", () => ({
  toast: mockToast,
}));

vi.mock("@/lib/tauri", () => ({
  api: {
    getAppSetting: (...args: unknown[]) => mockGetAppSetting(...args),
    validateCliTool: (...args: unknown[]) => mockValidateCliTool(...args),
  },
}));

vi.mock("@/stores/useAgentStore", () => ({
  useAgentStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        status: "starting",
        restartCount: mockRestartCount,
        setStatus: mockSetStatus,
        incrementRestart: mockIncrementRestart,
        resetRestartCount: mockResetRestartCount,
      }),
    {
      getState: () => ({
        status: "starting",
        restartCount: mockRestartCount,
        setStatus: mockSetStatus,
        incrementRestart: mockIncrementRestart,
        resetRestartCount: mockResetRestartCount,
      }),
    }
  ),
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: (...args: unknown[]) => mockAppDataDir(...args),
  resolveResource: (...args: unknown[]) => mockResolveResource(...args),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  BaseDirectory: { AppData: 0 },
}));

describe("useAgentLifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockRestartCount = 0;
    mockAppDataDir.mockResolvedValue("/mock/app-data");
    mockWriteTextFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockResolveResource.mockResolvedValue("/mock/resources/mcp-server/dist/index.js");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets status to stopped when no CLI command is configured", async () => {
    mockGetAppSetting.mockResolvedValue(null);

    const { useAgentLifecycle } = await import("@/hooks/useAgentLifecycle");
    const { result } = renderHook(() => useAgentLifecycle());

    await act(async () => {
      await result.current.startAgent();
    });

    expect(mockSetStatus).toHaveBeenCalledWith("starting");
    expect(mockSetStatus).toHaveBeenCalledWith("stopped");
    expect(mockToast).toHaveBeenCalled();
  });

  it("sets status to stopped when CLI tool is invalid", async () => {
    mockGetAppSetting.mockImplementation(async (key: string) => {
      if (key === "cli_command") return "nonexistent-cli";
      if (key === "cli_args") return "";
      return null;
    });
    mockValidateCliTool.mockResolvedValue(false);

    const { useAgentLifecycle } = await import("@/hooks/useAgentLifecycle");
    const { result } = renderHook(() => useAgentLifecycle());

    await act(async () => {
      await result.current.startAgent();
    });

    expect(mockSetStatus).toHaveBeenCalledWith("stopped");
    expect(mockToast).toHaveBeenCalled();
  });

  it("sets status to running and exposes agentCommand/agentArgs with valid CLI tool", async () => {
    mockGetAppSetting.mockImplementation(async (key: string) => {
      if (key === "cli_command") return "claude";
      if (key === "cli_args") return "--dangerously-skip-permissions";
      return null;
    });
    mockValidateCliTool.mockResolvedValue(true);

    const { useAgentLifecycle } = await import("@/hooks/useAgentLifecycle");
    const { result } = renderHook(() => useAgentLifecycle());

    await act(async () => {
      await result.current.startAgent();
    });

    expect(mockSetStatus).toHaveBeenCalledWith("running");
    expect(mockResetRestartCount).toHaveBeenCalled();
    expect(result.current.agentCommand).toBe("claude");
    expect(result.current.agentArgs).toBeDefined();
    expect(result.current.agentArgs!.length).toBeGreaterThan(0);
  });

  it("sets status to idle on exit code 0", async () => {
    const { useAgentLifecycle } = await import("@/hooks/useAgentLifecycle");
    const { result } = renderHook(() => useAgentLifecycle());

    act(() => {
      result.current.handleAgentExit(0);
    });

    expect(mockSetStatus).toHaveBeenCalledWith("idle");
  });

  it("increments restartCount and schedules restart on non-zero exit", async () => {
    mockGetAppSetting.mockImplementation(async (key: string) => {
      if (key === "cli_command") return "claude";
      if (key === "cli_args") return "";
      return null;
    });
    mockValidateCliTool.mockResolvedValue(true);

    const { useAgentLifecycle } = await import("@/hooks/useAgentLifecycle");
    const { result } = renderHook(() => useAgentLifecycle());

    act(() => {
      result.current.handleAgentExit(1);
    });

    expect(mockSetStatus).toHaveBeenCalledWith("error");
    expect(mockIncrementRestart).toHaveBeenCalled();
  });

  it("sets status to stopped without scheduling restart after MAX_RETRIES", async () => {
    mockRestartCount = 3;

    const { useAgentLifecycle } = await import("@/hooks/useAgentLifecycle");
    const { result } = renderHook(() => useAgentLifecycle());

    act(() => {
      result.current.handleAgentExit(1);
    });

    expect(mockSetStatus).toHaveBeenCalledWith("stopped");
    expect(mockIncrementRestart).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalled();
  });

  it("restartAgent resets restartCount and calls startAgent", async () => {
    mockGetAppSetting.mockImplementation(async (key: string) => {
      if (key === "cli_command") return "claude";
      if (key === "cli_args") return "";
      return null;
    });
    mockValidateCliTool.mockResolvedValue(true);

    const { useAgentLifecycle } = await import("@/hooks/useAgentLifecycle");
    const { result } = renderHook(() => useAgentLifecycle());

    await act(async () => {
      await result.current.restartAgent();
    });

    expect(mockResetRestartCount).toHaveBeenCalled();
    expect(mockSetStatus).toHaveBeenCalledWith("starting");
  });
});

describe("useAgentMcp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppDataDir.mockResolvedValue("/mock/app-data");
    mockWriteTextFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockResolveResource.mockResolvedValue("/mock/resources/mcp-server/dist/index.js");
  });

  it("generateMcpConfig produces JSON with mcpServers.element pointing to mcp-server/dist/index.js", async () => {
    const { useAgentMcp } = await import("@/hooks/useAgentMcp");
    const { result } = renderHook(() => useAgentMcp());

    let configPath: string = "";
    await act(async () => {
      configPath = await result.current.generateMcpConfig("/mock/db/element.db");
    });

    expect(configPath).toContain("mcp-config.json");
    expect(mockWriteTextFile).toHaveBeenCalled();

    // Verify the written JSON content
    const writtenContent = mockWriteTextFile.mock.calls[0][1];
    const config = JSON.parse(writtenContent);
    expect(config.mcpServers).toBeDefined();
    expect(config.mcpServers.element).toBeDefined();
    expect(config.mcpServers.element.command).toBe("node");
    expect(config.mcpServers.element.args).toContain("/mock/db/element.db");
    // The path should point to the mcp-server dist
    const mcpPath = config.mcpServers.element.args[0];
    expect(mcpPath).toContain("mcp-server/dist/index.js");
  });
});
