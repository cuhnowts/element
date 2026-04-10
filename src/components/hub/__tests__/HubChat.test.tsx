/**
 * HubChat plugin dispatch routing tests (CHAT-02).
 *
 * Tests the handleToolUse branching logic by mocking all external dependencies
 * and rendering the component to trigger tool_use events.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Hoisted mocks ----
const mockDispatch = vi.hoisted(() => vi.fn());
const mockCheckDestructive = vi.hoisted(() => vi.fn());
const mockCreatePendingAction = vi.hoisted(() => vi.fn());

const mockPluginDispatch = vi.hoisted(() => vi.fn());
const mockIsPluginTool = vi.hoisted(() => vi.fn());
const mockIsPluginToolDestructive = vi.hoisted(() => vi.fn());
const mockGetPluginToolDefs = vi.hoisted(() => vi.fn().mockReturnValue([]));

const mockInvoke = vi.hoisted(() => vi.fn());
const mockHubChatSend = vi.hoisted(() => vi.fn());
const mockHubChatStop = vi.hoisted(() => vi.fn());

// ---- Module mocks ----
vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("@/hooks/useActionDispatch", () => ({
  useActionDispatch: () => ({
    dispatch: mockDispatch,
    checkDestructive: mockCheckDestructive,
    createPendingAction: mockCreatePendingAction,
  }),
}));

vi.mock("@/hooks/usePluginTools", () => ({
  usePluginTools: () => ({
    pluginTools: [],
    dispatch: mockPluginDispatch,
    isPluginTool: mockIsPluginTool,
    isPluginToolDestructive: mockIsPluginToolDestructive,
    getToolDefs: mockGetPluginToolDefs,
    isLoaded: true,
  }),
}));

vi.mock("@/hooks/useHubChatStream", () => ({
  useHubChatStream: vi.fn(),
}));

vi.mock("@/lib/actionRegistry", () => ({
  ACTION_REGISTRY: [],
  getToolDefinitions: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/pluginToolRegistry", () => ({
  PluginToolDefinition: {},
}));

vi.mock("@/lib/tauri-commands", () => ({
  hubChatSend: mockHubChatSend,
  hubChatStop: mockHubChatStop,
}));

// Provide a minimal store mock
const mockSetState = vi.hoisted(() => vi.fn());

const mockStoreState = {
  messages: [] as { id: string; role: string; content: string }[],
  isStreaming: false,
  streamingContent: "",
  error: null as string | null,
  addUserMessage: vi.fn(),
  startStreaming: vi.fn(),
  appendChunk: vi.fn(),
  stopGenerating: vi.fn(),
  setError: vi.fn(),
};

vi.mock("@/stores/useHubChatStore", () => ({
  useHubChatStore: Object.assign(
    (selector: (s: typeof mockStoreState) => unknown) => selector(mockStoreState),
    {
      getState: () => mockStoreState,
      setState: mockSetState,
      subscribe: vi.fn(),
    },
  ),
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => children,
}));

vi.mock("remark-gfm", () => ({
  default: () => ({}),
}));

import { render } from "@testing-library/react";
import { HubChat } from "../HubChat";

/**
 * Helper: simulate a tool_use event arriving through the appendChunk pathway.
 * Since HubChat intercepts appendChunk via useEffect, we trigger it by
 * calling the setState handler that HubChat installs.
 */
function getInstalledAppendChunk(): ((chunk: string) => void) | null {
  const calls = mockSetState.mock.calls;
  // Find the last call that set appendChunk
  for (let i = calls.length - 1; i >= 0; i--) {
    const arg = calls[i][0] as Record<string, unknown>;
    if (arg && typeof arg.appendChunk === "function") {
      return arg.appendChunk as (chunk: string) => void;
    }
  }
  return null;
}

describe("HubChat dispatch routing (CHAT-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue("");
    mockPluginDispatch.mockResolvedValue({ success: true, data: { answer: "test result" } });
    mockDispatch.mockResolvedValue({ success: true, data: {} });
    mockCheckDestructive.mockReturnValue(false);
    mockIsPluginTool.mockReturnValue(false);
    mockIsPluginToolDestructive.mockReturnValue(false);
    mockHubChatSend.mockResolvedValue(undefined);
    mockStoreState.messages = [];
    mockStoreState.isStreaming = false;
    mockStoreState.error = null;
  });

  it("routes non-destructive plugin tool to auto-dispatch via dispatchPlugin", async () => {
    mockIsPluginTool.mockImplementation((name: string) => name === "knowledge:query");
    mockIsPluginToolDestructive.mockReturnValue(false);

    render(<HubChat />);

    const appendChunk = getInstalledAppendChunk();
    expect(appendChunk).not.toBeNull();

    // Simulate a tool_use chunk arriving
    const toolUseJson = JSON.stringify({
      type: "tool_use",
      id: "tu-001",
      name: "knowledge:query",
      input: { question: "What is Element?" },
    });

    appendChunk!(toolUseJson);

    // Wait for async dispatch
    await vi.waitFor(() => {
      expect(mockPluginDispatch).toHaveBeenCalledWith("knowledge:query", {
        question: "What is Element?",
      });
    });

    // Should NOT trigger built-in dispatch
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("routes destructive plugin tool to setPendingAction (shows ActionConfirmCard)", async () => {
    mockIsPluginTool.mockImplementation((name: string) => name === "knowledge:ingest");
    mockIsPluginToolDestructive.mockImplementation((name: string) => name === "knowledge:ingest");

    const { container } = render(<HubChat />);

    const appendChunk = getInstalledAppendChunk();
    expect(appendChunk).not.toBeNull();

    const toolUseJson = JSON.stringify({
      type: "tool_use",
      id: "tu-002",
      name: "knowledge:ingest",
      input: { content: "New article content" },
    });

    appendChunk!(toolUseJson);

    // Wait for the confirmation card to appear
    await vi.waitFor(() => {
      const alertDialog = container.querySelector('[role="alertdialog"]');
      expect(alertDialog).not.toBeNull();
    });

    // Should NOT auto-dispatch
    expect(mockPluginDispatch).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("feeds non-destructive plugin dispatch result back to LLM via sendToolResult", async () => {
    mockIsPluginTool.mockImplementation((name: string) => name === "knowledge:query");
    mockIsPluginToolDestructive.mockReturnValue(false);
    mockPluginDispatch.mockResolvedValue({ success: true, data: { answer: "42" } });

    render(<HubChat />);

    const appendChunk = getInstalledAppendChunk();
    expect(appendChunk).not.toBeNull();

    const toolUseJson = JSON.stringify({
      type: "tool_use",
      id: "tu-003",
      name: "knowledge:query",
      input: { question: "answer?" },
    });

    appendChunk!(toolUseJson);

    // Wait for dispatch + sendToolResult (hubChatSend is called with updated messages)
    await vi.waitFor(() => {
      expect(mockPluginDispatch).toHaveBeenCalled();
    });

    // sendToolResult calls startStreaming then hubChatSend
    await vi.waitFor(() => {
      expect(mockStoreState.startStreaming).toHaveBeenCalled();
      expect(mockHubChatSend).toHaveBeenCalled();
    });
  });

  it("routes built-in action (no colon) to built-in dispatch, NOT plugin dispatch", async () => {
    mockIsPluginTool.mockReturnValue(false);
    mockCheckDestructive.mockReturnValue(false);

    render(<HubChat />);

    const appendChunk = getInstalledAppendChunk();
    expect(appendChunk).not.toBeNull();

    const toolUseJson = JSON.stringify({
      type: "tool_use",
      id: "tu-004",
      name: "search_tasks",
      input: { query: "test" },
    });

    appendChunk!(toolUseJson);

    await vi.waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith("search_tasks", { query: "test" });
    });

    // Should NOT trigger plugin dispatch
    expect(mockPluginDispatch).not.toHaveBeenCalled();
  });
});
