import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { getToolDefinitions } from "@/lib/actionRegistry";
import {
  useActionDispatch,
  type PendingAction,
  type DispatchResult,
} from "@/hooks/useActionDispatch";
import { ActionConfirmCard } from "./ActionConfirmCard";
import { ActionResultCard } from "./ActionResultCard";
import { useHubChatStore } from "@/stores/useHubChatStore";
import { useHubChatStream } from "@/hooks/useHubChatStream";
import { hubChatSend, hubChatStop } from "@/lib/tauri-commands";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Square, Bot, User } from "lucide-react";

/** Parse a streaming chunk to check if it's a tool_use JSON event */
function tryParseToolUse(
  chunk: string,
): { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } | null {
  try {
    const parsed = JSON.parse(chunk);
    if (parsed?.type === "tool_use" && parsed.id && parsed.name) {
      return parsed;
    }
  } catch {
    // Not JSON -- it's a text chunk
  }
  return null;
}

interface ActionResult {
  id: string;
  success: boolean;
  message: string;
}

const SYSTEM_PROMPT = `You are Element's AI assistant. You help the user manage their projects, tasks, and work.
You have access to tools that can create tasks, update statuses, delete items, run shell commands, and more.
Use tools when the user asks you to take action. Be concise and helpful.`;

export function HubChat() {
  useHubChatStream();

  const messages = useHubChatStore((s) => s.messages);
  const isStreaming = useHubChatStore((s) => s.isStreaming);
  const streamingContent = useHubChatStore((s) => s.streamingContent);
  const error = useHubChatStore((s) => s.error);
  const addUserMessage = useHubChatStore((s) => s.addUserMessage);
  const startStreaming = useHubChatStore((s) => s.startStreaming);
  const appendChunk = useHubChatStore((s) => s.appendChunk);

  const [inputValue, setInputValue] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionResults, setActionResults] = useState<ActionResult[]>([]);
  const [confirmResolved, setConfirmResolved] = useState<
    "approved" | "rejected" | null
  >(null);

  const { dispatch, checkDestructive, createPendingAction } =
    useActionDispatch();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, actionResults, pendingAction]);

  // Intercept streaming chunks to detect tool_use events
  const originalAppendChunk = useHubChatStore.getState().appendChunk;
  useEffect(() => {
    // Override appendChunk to intercept tool_use JSON events
    useHubChatStore.setState({
      appendChunk: (chunk: string) => {
        const toolUse = tryParseToolUse(chunk);
        if (toolUse) {
          handleToolUse(toolUse);
          return;
        }
        originalAppendChunk(chunk);
      },
    });

    return () => {
      // Restore original on unmount
      useHubChatStore.setState({ appendChunk: originalAppendChunk });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToolUse = useCallback(
    async (toolUse: {
      id: string;
      name: string;
      input: Record<string, unknown>;
    }) => {
      if (checkDestructive(toolUse.name)) {
        // Destructive: show confirmation card
        const pending = createPendingAction(
          toolUse.id,
          toolUse.name,
          toolUse.input,
        );
        setPendingAction(pending);
        setConfirmResolved(null);
      } else {
        // Non-destructive: dispatch immediately
        const result = await dispatch(toolUse.name, toolUse.input);
        const actionResult: ActionResult = {
          id: toolUse.id,
          success: result.success,
          message: result.success
            ? `${toolUse.name} completed successfully`
            : `${toolUse.name} failed: ${result.error}`,
        };
        setActionResults((prev) => [...prev, actionResult]);

        // Send tool_result back to LLM
        await sendToolResult(toolUse.id, result);
      }
    },
    [checkDestructive, createPendingAction, dispatch],
  );

  const sendToolResult = async (
    toolUseId: string,
    result: DispatchResult,
  ) => {
    const allMessages = useHubChatStore.getState().messages;
    const chatMessages = allMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Add tool result as an assistant/user exchange
    chatMessages.push({
      role: "user",
      content: result.success
        ? `Tool result for ${toolUseId}: ${JSON.stringify(result.data)}`
        : `Tool error for ${toolUseId}: ${result.error}`,
    });

    startStreaming();
    try {
      await hubChatSend(chatMessages, SYSTEM_PROMPT, getToolDefinitions());
    } catch (err) {
      useHubChatStore.getState().setError(String(err));
    }
  };

  const handleApprove = useCallback(async () => {
    if (!pendingAction) return;
    setConfirmResolved("approved");

    const result = await dispatch(
      pendingAction.actionName,
      pendingAction.input,
    );
    const actionResult: ActionResult = {
      id: pendingAction.toolUseId,
      success: result.success,
      message: result.success
        ? `${pendingAction.actionName} completed successfully`
        : `${pendingAction.actionName} failed: ${result.error}`,
    };
    setActionResults((prev) => [...prev, actionResult]);

    // Send tool_result back to LLM
    await sendToolResult(pendingAction.toolUseId, result);
    setPendingAction(null);
    setConfirmResolved(null);
  }, [pendingAction, dispatch]);

  const handleReject = useCallback(async () => {
    if (!pendingAction) return;
    setConfirmResolved("rejected");

    // Send rejection as tool_result
    await sendToolResult(pendingAction.toolUseId, {
      success: false,
      error: "User rejected this action",
    });

    setPendingAction(null);
    setConfirmResolved(null);
  }, [pendingAction]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isStreaming || pendingAction) return;

    setInputValue("");
    addUserMessage(text);

    const allMessages = useHubChatStore.getState().messages;
    const chatMessages = allMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    startStreaming();
    try {
      await hubChatSend(chatMessages, SYSTEM_PROMPT, getToolDefinitions());
    } catch (err) {
      useHubChatStore.getState().setError(String(err));
    }
  };

  const handleStop = () => {
    hubChatStop();
    useHubChatStore.getState().stopGenerating();
  };

  const isInputDisabled = isStreaming || pendingAction !== null;

  return (
    <div className="flex h-full flex-col">
      {/* Chat messages area */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bot className="mb-2 h-8 w-8" />
              <p className="text-sm">
                Ask me to create tasks, update statuses, or run commands.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <Bot className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <User className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}

          {/* Streaming content */}
          {isStreaming && streamingContent && (
            <div className="flex gap-2 justify-start">
              <Bot className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="max-w-[80%] rounded-lg bg-card px-3 py-2 text-sm">
                {streamingContent}
                <span className="ml-1 animate-pulse">|</span>
              </div>
            </div>
          )}

          {/* Action results */}
          {actionResults.map((ar) => (
            <ActionResultCard
              key={ar.id}
              success={ar.success}
              message={ar.message}
            />
          ))}

          {/* Pending destructive action confirmation */}
          {pendingAction && (
            <ActionConfirmCard
              actionName={pendingAction.actionName}
              input={pendingAction.input}
              destructive={pendingAction.destructive}
              onApprove={handleApprove}
              onReject={handleReject}
              resolved={confirmResolved}
            />
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-destructive bg-card px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-4">
        {pendingAction && (
          <p className="mb-2 text-xs text-muted-foreground">
            Waiting for your decision on the action above...
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              isInputDisabled
                ? pendingAction
                  ? "Approve or reject the action above..."
                  : "Thinking..."
                : "Ask Element anything..."
            }
            disabled={isInputDisabled}
            className="flex-1"
          />
          {isStreaming ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleStop}
              aria-label="Stop generating"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={isInputDisabled || !inputValue.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
