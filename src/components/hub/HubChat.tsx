import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
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

/** Parse a streaming chunk to check if it's a tool_use JSON event or CLI ACTION: block */
function tryParseToolUse(
  chunk: string,
): { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } | null {
  // Check for native API tool_use format
  try {
    const parsed = JSON.parse(chunk);
    if (parsed?.type === "tool_use" && parsed.id && parsed.name) {
      return parsed;
    }
  } catch {
    // Not JSON -- check for CLI ACTION: format
  }

  // Check for CLI ACTION:{...} format (may appear mid-line)
  const actionMatch = chunk.match(/ACTION:\s*(\{.+\})/);
  if (actionMatch) {
    try {
      const parsed = JSON.parse(actionMatch[1]);
      if (parsed.name && parsed.input) {
        return {
          type: "tool_use",
          id: `cli-${Date.now()}`,
          name: parsed.name,
          input: parsed.input,
        };
      }
    } catch {
      // Malformed JSON in ACTION block
    }
  }

  return null;
}

interface ActionResult {
  id: string;
  success: boolean;
  message: string;
}

function buildSystemPrompt(manifest: string): string {
  return `You are Element — a desktop project management app's built-in orchestrator.
You ARE the app. When the user talks to you, they are talking to Element itself.
Never reference your own code, backend, database, or implementation. You are seamless.

Your job: help the user manage their work — create tasks, update progress, organize projects,
and answer questions about their current state. You already know everything about their projects
because you have their current status below.

## Current Project Status

${manifest || "(No projects yet)"}

## Taking Actions

When the user asks you to DO something (create a task, update a status, delete something,
run a command), respond with BOTH a brief confirmation message AND an action block.

Output the action block on its own line in exactly this format:
ACTION:{"name":"<tool_name>","input":{<parameters>}}

Available tools:
- create_task: Create a task. Input: {"title":"...","projectId":"...","description":"...","priority":"low|medium|high|urgent","phaseId":"..."}. Only title is required.
- update_task: Update a task. Input: {"taskId":"...","title":"...","description":"...","priority":"..."}. taskId is required.
- update_task_status: Change task status. Input: {"taskId":"...","status":"todo|in_progress|done|cancelled"}. Both required.
- delete_task: Delete a task permanently. Input: {"taskId":"..."}. Required.
- create_project: Create a project. Input: {"name":"...","description":"..."}. Name required.
- create_theme: Create a theme. Input: {"name":"...","color":"..."}. Both required.
- execute_shell: Run a shell command. Input: {"command":"..."}. Must be on the allowlist (git, npm, ls, etc).

## Conversation Rules

- You are Element. Say "I" when referring to what the app can do.
- Never say "I can insert into the database" or "I can run sqlite3" — just do the action.
- If the user says "create a task called X", respond like: "Done — I've created 'X'." followed by the ACTION block.
- If you need clarification (which project? what priority?), ask naturally: "Which project should this go under?" List the projects from the status above.
- If the user asks about their work, answer from the project status — don't guess or make things up.
- Be concise. One sentence answers when possible. No preamble.
- Never mention tools, JSON, action blocks, or implementation details to the user.`;
}


export function HubChat() {
  useHubChatStream();

  const messages = useHubChatStore((s) => s.messages);
  const isStreaming = useHubChatStore((s) => s.isStreaming);
  const streamingContent = useHubChatStore((s) => s.streamingContent);
  const error = useHubChatStore((s) => s.error);
  const addUserMessage = useHubChatStore((s) => s.addUserMessage);
  const startStreaming = useHubChatStore((s) => s.startStreaming);

  const [inputValue, setInputValue] = useState("");
  const [manifest, setManifest] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionResults, setActionResults] = useState<ActionResult[]>([]);
  const [confirmResolved, setConfirmResolved] = useState<
    "approved" | "rejected" | null
  >(null);

  // Fetch manifest on mount for system prompt context
  useEffect(() => {
    invoke<string>("build_context_manifest")
      .then(setManifest)
      .catch(() => setManifest(""));
  }, []);

  const { dispatch, checkDestructive, createPendingAction } =
    useActionDispatch();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatchedActionsRef = useRef<Set<string>>(new Set());

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
        // Strip any ACTION: lines from visible output
        const cleaned = chunk.replace(/ACTION:\s*\{.+\}\s*/g, "").trimEnd();
        if (cleaned) {
          originalAppendChunk(cleaned);
        }
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
      // Dedup: prevent same action from dispatching multiple times
      const dedupeKey = `${toolUse.name}:${JSON.stringify(toolUse.input)}`;
      if (dispatchedActionsRef.current.has(dedupeKey)) return;
      dispatchedActionsRef.current.add(dedupeKey);

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

        // Only send tool_result back for native API tool_use (not CLI ACTION: blocks)
        if (!toolUse.id.startsWith("cli-")) {
          await sendToolResult(toolUse.id, result);
        }
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
      await hubChatSend(chatMessages, buildSystemPrompt(manifest), getToolDefinitions());
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
    dispatchedActionsRef.current.clear();

    const allMessages = useHubChatStore.getState().messages;
    const chatMessages = allMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    startStreaming();
    try {
      await hubChatSend(chatMessages, buildSystemPrompt(manifest), getToolDefinitions());
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
                What would you like to work on?
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
