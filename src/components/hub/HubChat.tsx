import { invoke } from "@tauri-apps/api/core";
import { Bot, Send, Square, User } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type DispatchResult,
  type PendingAction,
  useActionDispatch,
} from "@/hooks/useActionDispatch";
import { useHubChatStream } from "@/hooks/useHubChatStream";
import { usePluginTools } from "@/hooks/usePluginTools";
import { ACTION_REGISTRY, type ActionDefinition, getToolDefinitions } from "@/lib/actionRegistry";
import type { PluginToolDefinition } from "@/lib/pluginToolRegistry";
import { hubChatSend, hubChatStop } from "@/lib/tauri-commands";
import { useHubChatStore } from "@/stores/useHubChatStore";
import { ActionConfirmCard } from "./ActionConfirmCard";
import { ActionResultCard } from "./ActionResultCard";
import { ScheduleChangeCard } from "./ScheduleChangeCard";

/** Parse a SCHEDULE_CHANGE JSON block from bot response */
interface ScheduleChangeProposal {
  id: string;
  taskTitle: string;
  beforeDay: string;
  beforeTime: string;
  afterDay: string;
  afterTime: string;
  sideEffect?: string;
  resolved?: "confirmed" | "dismissed" | null;
}

function tryParseScheduleChange(text: string): ScheduleChangeProposal | null {
  const match = text.match(/\[SCHEDULE_CHANGE\]\s*(\{[\s\S]*?\})/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.taskTitle && parsed.beforeDay && parsed.afterDay) {
      return {
        id: `sc-${Date.now()}`,
        taskTitle: parsed.taskTitle,
        beforeDay: parsed.beforeDay,
        beforeTime: parsed.beforeTime ?? "",
        afterDay: parsed.afterDay,
        afterTime: parsed.afterTime ?? "",
        sideEffect: parsed.sideEffect,
        resolved: null,
      };
    }
  } catch {
    // Malformed schedule change JSON
  }
  return null;
}

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

const SYSTEM_PREAMBLE = `You are Element — a desktop project management app's built-in orchestrator.
You ARE the app. When the user talks to you, they are talking to Element itself.
Never reference your own code, backend, database, or implementation. You are seamless.
Never suggest running sqlite3, querying a database, or reading source code. You don't have those.
You only have the tools listed below — nothing else.

Your job: help the user manage their work — create tasks, update progress, organize projects,
and answer questions about their current state. You already know everything about their projects
because you have their current status below.`;

const BEHAVIOR_RULES = `**Identity:**
- You are Element. Say "I" when referring to what the app can do.
- Never mention tools, JSON, ACTION blocks, databases, APIs, or implementation details.
- Never suggest workarounds like "you could run sqlite3" or "check the backend code."

**Task Completion vs Deletion:**
- When a user says a task is "done", "finished", or "complete" → use update_task_status with status "done". Do NOT delete it.
- Only use delete_task when the user explicitly says "delete", "remove permanently", or "get rid of."
- Completed tasks are tracked for history. Deletion is permanent and loses that history.

**Shell Commands:**
- When the user says "run git status" or "run ls" → use execute_shell. Do NOT answer from the project status or memory.
- Show the actual command output to the user.

**Clarification:**
- If you need info (which project? what task?), ask naturally using project/task names from the status above.
- If a task needs to be found first, use search_tasks, then tell the user what you found and take action.

**Tone:**
- Be concise. One sentence when possible. No preamble, no filler.

## Rescheduling

When the user says they lost time (e.g., "I lost 2 hours", "meeting ran over"), have new priorities (e.g., "prioritize auth instead"), or want to adjust their day:

1. Acknowledge the change briefly
2. Use the reschedule_day tool to generate an updated plan
3. Present the updated schedule as a summary -- list tasks that still fit and tasks that got bumped
4. NEVER auto-apply schedule changes. Only present the suggestion.

**Rescheduling Tool:**
- reschedule_day: Regenerate today's schedule with adjusted parameters. Input: {"reason":"brief description of change"}. Returns an updated task list for the day.`;

function formatToolsSection(
  builtinActions: ActionDefinition[],
  pluginTools: PluginToolDefinition[],
): string {
  const lines: string[] = [];

  const lookupTools = builtinActions.filter((a) => a.name === "search_tasks");
  const taskTools = builtinActions.filter((a) =>
    ["create_task", "update_task", "update_task_status", "delete_task"].includes(a.name),
  );
  const projectTools = builtinActions.filter((a) =>
    ["create_project", "create_theme", "update_phase_status"].includes(a.name),
  );
  const calendarTools = builtinActions.filter((a) =>
    [
      "list_calendar_events",
      "get_available_slots",
      "create_work_block",
      "move_work_block",
      "delete_work_block",
      "reschedule_day",
    ].includes(a.name),
  );
  const shellTools = builtinActions.filter((a) => a.name === "execute_shell");
  const fileTools = builtinActions.filter((a) => a.name === "create_file");

  const formatOne = (a: ActionDefinition): string => {
    const schema = a.inputSchema as {
      properties?: Record<string, { type?: string; description?: string; enum?: string[] }>;
      required?: string[];
    };
    const params = schema.properties
      ? Object.entries(schema.properties)
          .map(([k, v]) => `"${k}":"${v.description || v.type || "string"}"`)
          .join(",")
      : "";
    const required = schema.required ? ` Required: ${schema.required.join(", ")}.` : "";
    return `- ${a.name}: ${a.description} Input: {${params}}.${required}`;
  };

  if (lookupTools.length) {
    lines.push("**Lookup (use before update/delete):**");
    lines.push(...lookupTools.map(formatOne));
    lines.push("");
  }
  if (taskTools.length) {
    lines.push("**Task Management:**");
    lines.push(...taskTools.map(formatOne));
    lines.push("");
  }
  if (projectTools.length) {
    lines.push("**Project/Theme Management:**");
    lines.push(...projectTools.map(formatOne));
    lines.push("");
  }
  if (calendarTools.length) {
    lines.push("**Calendar & Scheduling:**");
    lines.push(...calendarTools.map(formatOne));
    lines.push("");
  }
  if (fileTools.length) {
    lines.push("**File Management:**");
    lines.push(...fileTools.map(formatOne));
    lines.push("");
  }
  if (shellTools.length) {
    lines.push("**Shell Commands:**");
    lines.push(...shellTools.map(formatOne));
    lines.push("");
  }

  // Plugin tools grouped by plugin name (per D-03, include all)
  if (pluginTools.length > 0) {
    const byPlugin = new Map<string, PluginToolDefinition[]>();
    for (const pt of pluginTools) {
      const existing = byPlugin.get(pt.plugin_name) ?? [];
      existing.push(pt);
      byPlugin.set(pt.plugin_name, existing);
    }
    for (const [pluginName, tools] of byPlugin) {
      const label = pluginName.charAt(0).toUpperCase() + pluginName.slice(1);
      lines.push(`**${label} Plugin:**`);
      for (const t of tools) {
        const schema = t.input_schema as {
          properties?: Record<string, { type?: string; description?: string }>;
          required?: string[];
        };
        const params = schema.properties
          ? Object.entries(schema.properties)
              .map(([k, v]) => `"${k}":"${v.description || v.type || "string"}"`)
              .join(",")
          : "";
        lines.push(`- ${t.name}: ${t.description} Input: {${params}}.`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildSystemPrompt(
  manifest: string,
  builtinActions: ActionDefinition[],
  pluginTools: PluginToolDefinition[],
): string {
  const toolsSection = formatToolsSection(builtinActions, pluginTools);
  return `${SYSTEM_PREAMBLE}

## Current Project Status

${manifest || "(No projects yet)"}

## Taking Actions

When the user asks you to DO something, respond with BOTH a brief confirmation AND an action block.

Output the action block on its own line in exactly this format:
ACTION:{"name":"<tool_name>","input":{<parameters>}}

You may output multiple ACTION blocks if needed (e.g., search then act on results).

### Available Tools

${toolsSection}
## Behavior Rules

${BEHAVIOR_RULES}`;
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
  const [confirmResolved, setConfirmResolved] = useState<"approved" | "rejected" | null>(null);
  const [scheduleChanges, setScheduleChanges] = useState<ScheduleChangeProposal[]>([]);

  // Fetch manifest on mount for system prompt context
  useEffect(() => {
    invoke<string>("build_context_manifest")
      .then(setManifest)
      .catch(() => setManifest(""));
  }, []);

  const { dispatch, checkDestructive, createPendingAction } = useActionDispatch();
  const {
    pluginTools,
    dispatch: dispatchPlugin,
    isPluginTool,
    isPluginToolDestructive,
    getToolDefs: getPluginToolDefs,
  } = usePluginTools();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatchedActionsRef = useRef<Set<string>>(new Set());
  const feedbackRoundRef = useRef(0);

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Detect SCHEDULE_CHANGE blocks in finalized assistant messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant") {
      const proposal = tryParseScheduleChange(lastMsg.content);
      if (proposal) {
        setScheduleChanges((prev) => {
          // Avoid duplicates by checking if we already have one for this task
          if (prev.some((sc) => sc.taskTitle === proposal.taskTitle && !sc.resolved)) {
            return prev;
          }
          return [...prev, proposal];
        });
      }
    }
  }, [messages]);

  const sendToolResult = useCallback(
    async (_toolUseId: string, result: DispatchResult) => {
      const allMessages = useHubChatStore.getState().messages;
      const chatMessages = allMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Format result clearly so the LLM can extract data and act
      let resultContent: string;
      if (result.success && Array.isArray(result.data)) {
        const items = result.data as Record<string, unknown>[];
        if (items.length === 0) {
          resultContent =
            "No results found.\n\nProceed with the next step. Output an ACTION block if needed.";
        } else {
          // Format each item showing all its fields
          const formatted = items
            .map((item) => {
              const parts = Object.entries(item)
                .filter(([, v]) => v != null && v !== "")
                .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
              return `- ${parts.join(", ")}`;
            })
            .join("\n");
          resultContent = `Results:\n${formatted}\n\nUse the data above for your next action. Output an ACTION block.`;
        }
      } else if (result.success) {
        resultContent = `Done: ${JSON.stringify(result.data)}\n\nProceed with the next step if needed.`;
      } else {
        resultContent = `Error: ${result.error}`;
      }

      chatMessages.push({
        role: "user",
        content: resultContent,
      });

      startStreaming();
      try {
        const allTools = [...getToolDefinitions(), ...getPluginToolDefs()];
        await hubChatSend(
          chatMessages,
          buildSystemPrompt(manifest, ACTION_REGISTRY, pluginTools),
          allTools,
        );
      } catch (err) {
        useHubChatStore.getState().setError(String(err));
      }
    },
    [manifest, startStreaming, pluginTools, getPluginToolDefs],
  );

  const handleToolUse = useCallback(
    async (toolUse: { id: string; name: string; input: Record<string, unknown> }) => {
      const dedupeKey = `${toolUse.name}:${JSON.stringify(toolUse.input)}`;
      if (dispatchedActionsRef.current.has(dedupeKey)) return;
      dispatchedActionsRef.current.add(dedupeKey);

      // Plugin tool dispatch path (per D-01: separate from built-in actions)
      if (isPluginTool(toolUse.name)) {
        if (isPluginToolDestructive(toolUse.name)) {
          // Destructive plugin tools show confirmation (per D-08: ingest = confirm)
          const pending: PendingAction = {
            toolUseId: toolUse.id,
            actionName: toolUse.name,
            input: toolUse.input,
            destructive: true,
          };
          setPendingAction(pending);
          setConfirmResolved(null);
        } else {
          // Non-destructive plugin tools auto-execute (per D-08: query/lint = auto)
          const result = await dispatchPlugin(toolUse.name, toolUse.input);
          const actionResult: ActionResult = {
            id: toolUse.id,
            success: result.success,
            message: result.success
              ? `${toolUse.name} completed successfully`
              : `${toolUse.name} failed: ${result.error}`,
          };
          setActionResults((prev) => [...prev, actionResult]);

          // Feed result back to LLM for synthesis (per D-07: wiki query needs this
          // so the LLM can provide a natural language answer with citations)
          if (feedbackRoundRef.current < 2) {
            feedbackRoundRef.current++;
            await sendToolResult(toolUse.id, {
              success: result.success,
              data: result.data,
              error: result.error,
            });
          }
        }
        return;
      }

      // Existing built-in action dispatch path (unchanged)
      if (checkDestructive(toolUse.name)) {
        const pending = createPendingAction(toolUse.id, toolUse.name, toolUse.input);
        setPendingAction(pending);
        setConfirmResolved(null);
      } else {
        const result = await dispatch(toolUse.name, toolUse.input);
        const actionResult: ActionResult = {
          id: toolUse.id,
          success: result.success,
          message: result.success
            ? `${toolUse.name} completed successfully`
            : `${toolUse.name} failed: ${result.error}`,
        };
        setActionResults((prev) => [...prev, actionResult]);

        const lookupActions = ["search_tasks", "list_calendar_events", "get_available_slots"];
        if (lookupActions.includes(toolUse.name) && feedbackRoundRef.current < 2) {
          feedbackRoundRef.current++;
          await sendToolResult(toolUse.id, result);
        }
      }
    },
    [
      checkDestructive,
      createPendingAction,
      dispatch,
      dispatchPlugin,
      isPluginTool,
      isPluginToolDestructive,
      sendToolResult,
    ],
  );

  // Intercept streaming chunks to detect tool_use events
  const originalAppendChunkRef = useRef(useHubChatStore.getState().appendChunk);
  const chunkBufferRef = useRef("");
  useEffect(() => {
    const originalAppendChunk = originalAppendChunkRef.current;
    useHubChatStore.setState({
      appendChunk: (chunk: string) => {
        const toolUse = tryParseToolUse(chunk);
        if (toolUse) {
          chunkBufferRef.current = "";
          handleToolUse(toolUse);
          return;
        }

        chunkBufferRef.current += chunk;

        const bufferToolUse = tryParseToolUse(chunkBufferRef.current);
        if (bufferToolUse) {
          const before = chunkBufferRef.current.replace(/ACTION:\s*\{.+\}/s, "").trim();
          if (before) {
            originalAppendChunk(before);
          }
          chunkBufferRef.current = "";
          handleToolUse(bufferToolUse);
          return;
        }

        const cleaned = chunk.replace(/ACTION:\s*\{.+\}\s*/g, "").trimEnd();
        if (cleaned) {
          originalAppendChunk(cleaned);
        }

        if (chunkBufferRef.current.length > 2000 && !chunkBufferRef.current.includes("ACTION:")) {
          chunkBufferRef.current = "";
        }
      },
    });

    return () => {
      useHubChatStore.setState({ appendChunk: originalAppendChunk });
    };
  }, [handleToolUse]);

  const handleApprove = useCallback(async () => {
    if (!pendingAction) return;
    setConfirmResolved("approved");

    let result: DispatchResult;
    if (isPluginTool(pendingAction.actionName)) {
      // Plugin tool approval (e.g., knowledge:ingest confirmation)
      result = await dispatchPlugin(pendingAction.actionName, pendingAction.input);
    } else {
      // Built-in action approval (existing path)
      result = await dispatch(pendingAction.actionName, pendingAction.input);
    }

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
  }, [pendingAction, dispatch, dispatchPlugin, isPluginTool, sendToolResult]);

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
  }, [pendingAction, sendToolResult]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isStreaming || pendingAction) return;

    setInputValue("");
    addUserMessage(text);
    dispatchedActionsRef.current.clear();
    chunkBufferRef.current = "";
    feedbackRoundRef.current = 0;

    const allMessages = useHubChatStore.getState().messages;
    const chatMessages = allMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    startStreaming();
    try {
      const allTools = [...getToolDefinitions(), ...getPluginToolDefs()];
      await hubChatSend(
        chatMessages,
        buildSystemPrompt(manifest, ACTION_REGISTRY, pluginTools),
        allTools,
      );
    } catch (err) {
      useHubChatStore.getState().setError(String(err));
    }
  };

  const handleStop = () => {
    hubChatStop();
    useHubChatStore.getState().stopGenerating();
  };

  const handleScheduleConfirm = useCallback((id: string) => {
    setScheduleChanges((prev) =>
      prev.map((sc) => (sc.id === id ? { ...sc, resolved: "confirmed" } : sc)),
    );
    // D-14: schedule changes require explicit confirmation
    // The actual reschedule is handled by the bot tool call flow
  }, []);

  const handleScheduleDismiss = useCallback((id: string) => {
    setScheduleChanges((prev) =>
      prev.map((sc) => (sc.id === id ? { ...sc, resolved: "dismissed" } : sc)),
    );
  }, []);

  const isInputDisabled = isStreaming || pendingAction !== null;

  return (
    <div>
      {/* Chat messages area */}
      <div className="space-y-4" ref={scrollRef}>
        <div className="space-y-4">
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
                    : "bg-card prose prose-sm prose-invert max-w-none"
                }`}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
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
              <div className="max-w-[80%] rounded-lg bg-card px-3 py-2 text-sm prose prose-sm prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                <span className="ml-1 animate-pulse">|</span>
              </div>
            </div>
          )}

          {/* Action results */}
          {actionResults.map((ar) => (
            <ActionResultCard key={ar.id} success={ar.success} message={ar.message} />
          ))}

          {/* Schedule change proposals */}
          {scheduleChanges.map((sc) => (
            <ScheduleChangeCard
              key={sc.id}
              taskTitle={sc.taskTitle}
              beforeDay={sc.beforeDay}
              beforeTime={sc.beforeTime}
              afterDay={sc.afterDay}
              afterTime={sc.afterTime}
              sideEffect={sc.sideEffect}
              onConfirm={() => handleScheduleConfirm(sc.id)}
              onDismiss={() => handleScheduleDismiss(sc.id)}
              resolved={sc.resolved}
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
      </div>

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
