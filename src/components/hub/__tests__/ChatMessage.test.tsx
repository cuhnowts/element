import { describe, it } from "vitest";

describe("ChatMessage", () => {
  // CHAT-02: Markdown rendering
  describe("assistant messages", () => {
    it.todo("renders markdown content via MarkdownRenderer");
    it.todo("shows blinking cursor when isCurrentlyStreaming is true");
    it.todo("renders streamingContent instead of message.content when streaming");
  });

  describe("user messages", () => {
    it.todo("renders plain text content (no markdown)");
    it.todo("applies right-aligned layout");
  });
});
