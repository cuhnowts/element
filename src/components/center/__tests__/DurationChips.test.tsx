import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DurationChips } from "../../shared/DurationChips";

describe("DurationChips", () => {
  it("renders all 5 preset chips plus custom", () => {
    render(<DurationChips value={null} onChange={vi.fn()} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(6); // 5 presets + Custom
  });

  it("active chip has aria-checked=true", () => {
    render(<DurationChips value={60} onChange={vi.fn()} />);
    const chip1h = screen.getByRole("radio", { name: "1h" });
    expect(chip1h).toHaveAttribute("aria-checked", "true");

    // Others should be false
    const chip30m = screen.getByRole("radio", { name: "30m" });
    expect(chip30m).toHaveAttribute("aria-checked", "false");
  });

  it("clicking active chip deselects", () => {
    const onChange = vi.fn();
    render(<DurationChips value={30} onChange={onChange} />);
    const chip30m = screen.getByRole("radio", { name: "30m" });
    fireEvent.click(chip30m);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("clicking inactive chip selects", () => {
    const onChange = vi.fn();
    render(<DurationChips value={null} onChange={onChange} />);
    const chip1h = screen.getByRole("radio", { name: "1h" });
    fireEvent.click(chip1h);
    expect(onChange).toHaveBeenCalledWith(60);
  });
});
