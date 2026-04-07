import { invoke } from "@tauri-apps/api/core";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoist all mocks so they're available in vi.mock factories
const {
  mockGetAppSetting,
  mockValidateCliTool,
  mockToast,
  mockSetStatus,
  mockIncrementRestart,
  mockResetRestartCount,
  mockSetAgentCommand,
  mockSetAgentArgs,
  mockAppDataDir,
  mockResolveResource,
} = vi.hoisted(() => ({
  mockGetAppSetting: vi.fn(),
  mockValidateCliTool: vi.fn(),
  mockToast: Object.assign(vi.fn(), { error: vi.fn() }),
  mockSetStatus: vi.fn(),
  mockIncrementRestart: vi.fn(),
  mockResetRestartCount: vi.fn(),
  mockSetAgentCommand: vi.fn(),
  mockSetAgentArgs: vi.fn(),
  mockAppDataDir: vi.fn(),
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
        setAgentCommand: mockSetAgentCommand,
        setAgentArgs: mockSetAgentArgs,
        agentCommand: null,
        agentArgs: null,
      }),
    {
      getState: () => ({
        status: "starting",
        restartCount: mockRestartCount,
        setStatus: mockSetStatus,
        incrementRestart: mockIncrementRestart,
        resetRestartCount: mockResetRestartCount,
        setAgentCommand: mockSetAgentCommand,
        setAgentArgs: mockSetAgentArgs,
        agentCommand: null,
        agentArgs: null,
      }),
    },
  ),
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: (...args: unknown[]) => mockAppDataDir(...args),
  resolveResource: (...args: unknown[]) => mockResolveResource(...args),
}));

describe("useAgentLifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockRestartCount = 0;
    mockAppDataDir.mockResolvedValue("/mock/app-data");
    mockResolveResource.mockResolvedValue("/mock/resources/mcp-server/dist/index.js");
    // invoke is globally mocked in setup.ts, just ensure it resolves
    vi.mocked(invoke).mockResolvedValue(undefined);
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
    expect(mockSetAgentCommand).toHaveBeenCalledWith("claude");
    expect(mockSetAgentArgs).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining("--mcp-config")]),
    );
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
    mockResolveResource.mockResolvedValue("/mock/resources/mcp-server/dist/index.js");
    vi.mocked(invoke).mockResolvedValue(undefined);
  });

  it("generateMcpConfig produces JSON with mcpServers.element pointing to mcp-server/dist/index.js", async () => {
    // resolve_mcp_server_path returns the mcp server path
    vi.mocked(invoke).mockImplementation(async (cmd: string, _args?: unknown) => {
      if (cmd === "resolve_mcp_server_path") return "/mock/resources/mcp-server/dist/index.js";
      if (cmd === "write_agent_file") return "/mock/app-data/agent/mcp-config.json";
      return undefined;
    });

    const { useAgentMcp } = await import("@/hooks/useAgentMcp");
    const { result } = renderHook(() => useAgentMcp());

    let configPath: string = "";
    await act(async () => {
      configPath = await result.current.generateMcpConfig("/mock/db/element.db");
    });

    expect(configPath).toContain("mcp-config.json");

    // Find the invoke call that wrote the agent file
    const writeCall = vi
      .mocked(invoke)
      .mock.calls.find((call) => call[0] === "write_agent_file");
    expect(writeCall).toBeDefined();

    // Verify the written JSON content
    const args = writeCall?.[1] as { relativePath: string; contents: string };
    const config = JSON.parse(args.contents);
    expect(config.mcpServers).toBeDefined();
    expect(config.mcpServers.element).toBeDefined();
    expect(config.mcpServers.element.command).toBe("node");
    expect(config.mcpServers.element.args).toContain("/mock/db/element.db");
    // The path should point to the mcp-server dist
    const mcpPath = config.mcpServers.element.args[0];
    expect(mcpPath).toContain("mcp-server/dist/index.js");
  });
});
