import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceButton } from "../WorkspaceButton";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn().mockResolvedValue("/selected/path"),
}));

const mockStartFileWatcher = vi.fn().mockResolvedValue(undefined);
const mockOpenTerminal = vi.fn();
const mockSetProjectCenterTab = vi.fn();
vi.mock("@/lib/tauri", () => ({
  api: {
    startFileWatcher: (...args: unknown[]) => mockStartFileWatcher(...args),
  },
}));
vi.mock("@/stores/useWorkspaceStore", () => ({
  useWorkspaceStore: Object.assign(
    vi.fn(() => mockOpenTerminal),
    {
      getState: () => ({
        openTerminal: mockOpenTerminal,
        setProjectCenterTab: mockSetProjectCenterTab,
      }),
    },
  ),
}));

describe("WorkspaceButton", () => {
  const mockOnLink = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  // PROJ-03: Dual-mode workspace button
  it("renders 'Open Workspace' when directoryPath is set", () => {
    render(<WorkspaceButton projectId="proj-1" directoryPath="/path/to/dir" onLink={mockOnLink} />);
    expect(screen.getByText("Open Workspace")).toBeInTheDocument();
  });

  it("renders 'Link Directory' when directoryPath is null", () => {
    render(<WorkspaceButton projectId="proj-1" directoryPath={null} onLink={mockOnLink} />);
    expect(screen.getByText("Link Directory")).toBeInTheDocument();
  });

  it("displays directory path as label", () => {
    render(<WorkspaceButton projectId="proj-1" directoryPath="/path/to/dir" onLink={mockOnLink} />);
    expect(screen.getByText("/path/to/dir")).toBeInTheDocument();
  });

  it("calls startFileWatcher, setProjectCenterTab, and openTerminal on workspace click", async () => {
    render(<WorkspaceButton projectId="proj-1" directoryPath="/path/to/dir" onLink={mockOnLink} />);
    const button = screen.getByText("Open Workspace");
    fireEvent.click(button);
    expect(mockStartFileWatcher).toHaveBeenCalled();
    expect(mockSetProjectCenterTab).toHaveBeenCalled();
    expect(mockOpenTerminal).toHaveBeenCalled();
  });

  it("calls onLink when directory is selected via dialog", async () => {
    const { open: _open } = await import("@tauri-apps/plugin-dialog");
    render(<WorkspaceButton projectId="proj-1" directoryPath={null} onLink={mockOnLink} />);
    const button = screen.getByText("Link Directory");
    fireEvent.click(button);
    // Dialog mock returns "/selected/path"
    await vi.waitFor(() => {
      expect(mockOnLink).toHaveBeenCalledWith("/selected/path");
    });
  });
});
