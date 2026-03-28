import { describe, it } from "vitest";

describe("TierSelectionDialog", () => {
  // PLAN-01: Tier dialog renders with three options
  it.todo("renders three tier options: Quick, Medium, GSD");
  it.todo("shows 'How should we plan this?' as dialog title");
  it.todo("shows description textarea with 'What are you building?' label");

  // PLAN-01: Validation
  it.todo("disables Start Planning when no tier is selected");
  it.todo("shows validation error when Quick tier selected without description");

  // PLAN-02: Quick tier
  it.todo("calls onSubmit with 'quick' tier and description");

  // PLAN-03: Medium tier
  it.todo("calls onSubmit with 'medium' tier and description");

  // PLAN-04: GSD tier
  it.todo("calls onSubmit with 'full' tier and description");
  it.todo("displays 'GSD' label for full tier value");

  // D-04: Change plan flow
  it.todo("shows warning dialog when isChangingTier is true");
  it.todo("proceeds to tier selection after warning confirmation");
  it.todo("closes entirely on warning dismissal");
});
