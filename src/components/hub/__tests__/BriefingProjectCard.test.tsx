import { describe, it } from "vitest";

describe("BriefingProjectCard", () => {
  // BRIEF-02: Structured sections rendered from BriefingJSON
  describe("sections", () => {
    it.todo("renders blockers section with AlertTriangle icon when blockers exist");
    it.todo("renders deadlines section with Clock icon when deadlines exist");
    it.todo("renders wins section with Trophy icon when wins exist");
    it.todo("omits sections with empty arrays");
  });

  // BRIEF-03: Visually distinct cards with hierarchy
  describe("visual hierarchy", () => {
    it.todo("renders tag badges for each project tag");
    it.todo("applies destructive variant for overdue and blocked tags");
    it.todo("applies secondary variant for on-track and recently-completed tags");
  });

  describe("interaction", () => {
    it.todo("calls onNavigate with projectId when card header is clicked");
    it.todo("does not call onNavigate when projectId is undefined");
  });
});
