import { describe, it } from "vitest";

describe("ChatInput", () => {
  // CHAT-01: Input behavior
  describe("sending", () => {
    it.todo("calls onSend with trimmed content on Enter");
    it.todo("does not send on Enter when input is empty");
    it.todo("inserts newline on Shift+Enter");
    it.todo("clears input after sending");
  });

  describe("streaming state", () => {
    it.todo("shows stop button when isStreaming is true");
    it.todo("disables textarea when isStreaming is true");
    it.todo("calls onStop when stop button clicked");
  });
});
