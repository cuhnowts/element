# Phase 43: Hub Chat Wiki Integration - Research

**Researched:** 2026-04-06
**Domain:** Frontend integration (React/TypeScript), Tauri IPC, LLM tool dispatch
**Confidence:** HIGH

## Summary

Phase 43 bridges Phase 41's plugin skill infrastructure and Phase 42's wiki engine into the existing hub chat UI. The work is entirely integration -- no new backend wiki logic, no new plugin infrastructure. The core challenge is refactoring HubChat.tsx's static tool assembly into a dynamic merge of built-in actions and plugin-contributed skills, then ensuring the dispatch pipeline routes plugin skills correctly.

The existing codebase is well-structured for this extension. `hub_chat_send` already accepts `tools: Option<Vec<ToolDefinition>>` from the frontend, meaning no Rust changes are needed for tool list composition. The frontend builds tool lists via `getToolDefinitions()` and passes them through `hubChatSend()`. The refactoring targets are: (1) `buildSystemPrompt()` which currently hardcodes all tool descriptions, (2) `getToolDefinitions()` call sites which need to merge plugin tools, and (3) `useActionDispatch` which needs a plugin skill dispatch path.

**Primary recommendation:** Create a `usePluginTools` hook that fetches plugin skill definitions on mount via a new Tauri command (`list_plugin_skills`), exposes them as `ToolDefinition[]`, and provides a `dispatchPluginSkill(name, input)` function. HubChat merges these with `getToolDefinitions()` at call time. The system prompt generator becomes a function that takes the merged tool list and produces the prompt dynamically.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Plugin skills use a **separate plugin tool registry** -- keep `ACTION_REGISTRY` for built-in actions, add a new `getPluginToolDefinitions()` function. HubChat merges both when sending to the AI gateway.
- **D-02:** Plugin tools refresh **on chat mount only**. Fetch plugin skills once when HubChat mounts. Plugin changes take effect on next chat open.
- **D-03:** Include **all core tools + all enabled plugin tools** in every AI call. No intent classification or token budgeting at MVP scale. Grows linearly with enabled plugins.
- **D-04:** `buildSystemPrompt()` is **dynamically assembled** from both registries. No more hardcoded tool list in the prompt string -- the "Available Tools" section is generated from ACTION_REGISTRY and the plugin tool registry.
- **D-05:** Wiki operations triggered via **natural language only** -- no slash commands. User says "add this to the wiki" or "what do I know about X?" and the LLM picks the right wiki tool.
- **D-06:** Wiki ingest via **paste content inline** -- user pastes text into chat and says "add this to the wiki". LLM extracts content and calls the ingest tool. No file picker or path reference needed.
- **D-07:** Wiki query results appear as **synthesized answers inline** -- LLM reads wiki articles and provides a natural language answer with citations to specific wiki pages.
- **D-08:** Confirmation policy: **ingest = confirm, query/lint = auto-execute**. Ingest writes to filesystem so shows ActionConfirmCard. Query and lint are read-only.
- **D-09:** Progress shown as **inline status messages** -- brief "Ingesting document..." or "Searching wiki..." that resolves to the result. Similar to existing ActionResultCard pattern.
- **D-10:** Errors shown as **inline bot messages** -- natural language explanation consistent with existing chat error handling.

### Claude's Discretion
- Claude may decide implementation details for how the plugin tool registry is structured internally
- Claude may decide the exact format of wiki operation status messages
- Claude may decide error message wording and formatting

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | Plugin-contributed skills are dynamically loaded into hub chat's tool registry alongside built-in actions | `usePluginTools` hook fetches from Phase 41's `list_plugin_skills` Tauri command on mount; merges with `getToolDefinitions()` output before passing to `hubChatSend` |
| CHAT-02 | User can ingest documents and query the wiki through hub chat commands | Wiki plugin skills (`knowledge:ingest`, `knowledge:query`, `knowledge:lint`) dispatched via `dispatch_plugin_skill` Tauri command; results rendered through existing ActionResultCard pattern |
| CHAT-03 | Hub chat filters available tools contextually to prevent system prompt bloat as plugins grow | Per D-03: MVP sends all tools. CHAT-03 is satisfied by the dynamic assembly architecture (D-04) which makes filtering possible in the future, plus the merged tool list already prevents hardcoding |
</phase_requirements>

## Architecture Patterns

### Integration Architecture

The phase modifies the existing hub chat pipeline at three points:

```
[User Input]
    |
    v
[HubChat.tsx] -- mount: fetch plugin skills (NEW)
    |
    v
[buildSystemPrompt(manifest, tools)] -- dynamic tool section (REFACTOR)
    |
    v
[hubChatSend(messages, prompt, mergedTools)] -- merged built-in + plugin tools (REFACTOR)
    |
    v
[hub_chat_send Rust] -- unchanged, already accepts Vec<ToolDefinition>
    |
    v
[LLM response with tool_use]
    |
    v
[handleToolUse] -- route to dispatch OR dispatchPluginSkill (EXTEND)
    |
    v
[ActionConfirmCard / ActionResultCard] -- reused as-is
```

### Recommended File Structure

```
src/
├── hooks/
│   └── usePluginTools.ts          # NEW: fetch + dispatch plugin skills
├── lib/
│   ├── actionRegistry.ts          # UNCHANGED: built-in actions stay here
│   └── pluginToolRegistry.ts      # NEW: getPluginToolDefinitions(), plugin tool types
├── components/hub/
│   └── HubChat.tsx                # REFACTOR: dynamic prompt, merged tools, plugin dispatch
```

### Pattern 1: Plugin Tool Hook

**What:** A React hook that fetches plugin skill definitions on mount and provides dispatch.
**When to use:** On HubChat mount (per D-02).

```typescript
// src/hooks/usePluginTools.ts
interface PluginToolDefinition {
  name: string;           // e.g. "knowledge:ingest"
  description: string;
  input_schema: Record<string, unknown>;
  destructive: boolean;
  plugin_name: string;    // e.g. "knowledge"
}

export function usePluginTools() {
  const [pluginTools, setPluginTools] = useState<PluginToolDefinition[]>([]);

  useEffect(() => {
    invoke<PluginToolDefinition[]>("list_plugin_skills")
      .then(setPluginTools)
      .catch(() => setPluginTools([]));
  }, []);

  const dispatchPluginSkill = useCallback(
    async (skillName: string, input: Record<string, unknown>): Promise<DispatchResult> => {
      try {
        const result = await invoke("dispatch_plugin_skill", { skillName, input });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
    [],
  );

  const isPluginTool = useCallback(
    (name: string): boolean => pluginTools.some((t) => t.name === name),
    [pluginTools],
  );

  const isPluginToolDestructive = useCallback(
    (name: string): boolean => pluginTools.find((t) => t.name === name)?.destructive ?? false,
    [pluginTools],
  );

  return { pluginTools, dispatchPluginSkill, isPluginTool, isPluginToolDestructive };
}
```

### Pattern 2: Dynamic System Prompt Assembly

**What:** Refactor `buildSystemPrompt()` from hardcoded tool descriptions to dynamically generated.
**When to use:** Every `hubChatSend` call.

```typescript
// Refactored buildSystemPrompt in HubChat.tsx
function buildSystemPrompt(
  manifest: string,
  builtinTools: ActionDefinition[],
  pluginTools: PluginToolDefinition[],
): string {
  // Static preamble (identity, behavior rules, etc.) stays the same

  // Dynamic "Available Tools" section generated from registries
  const builtinSection = builtinTools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");

  const pluginSection = pluginTools.length > 0
    ? pluginTools.map((t) => `- ${t.name}: ${t.description}`).join("\n")
    : "";

  // Assemble full prompt with dynamic tool listing
  return `${SYSTEM_PREAMBLE}

## Current Project Status
${manifest || "(No projects yet)"}

## Available Tools

### Built-in Tools
${builtinSection}

### Plugin Tools
${pluginSection}

${BEHAVIOR_RULES}`;
}
```

### Pattern 3: Unified Dispatch Routing

**What:** Extend `handleToolUse` to check if a tool is a plugin skill and route accordingly.
**When to use:** When the LLM returns a tool_use block.

```typescript
// In HubChat.tsx handleToolUse callback
const handleToolUse = useCallback(
  async (toolUse: { id: string; name: string; input: Record<string, unknown> }) => {
    // ... existing deduplication logic ...

    // Check if this is a plugin tool
    if (isPluginTool(toolUse.name)) {
      // Plugin tool dispatch path
      if (isPluginToolDestructive(toolUse.name)) {
        // Show confirmation card (reuse ActionConfirmCard)
        setPendingAction(createPendingAction(toolUse.id, toolUse.name, toolUse.input));
      } else {
        const result = await dispatchPluginSkill(toolUse.name, toolUse.input);
        // Show result, send feedback to LLM if needed
      }
    } else {
      // Existing built-in action dispatch path
      // ... unchanged ...
    }
  },
  [/* deps */],
);
```

### Anti-Patterns to Avoid

- **Modifying ACTION_REGISTRY for plugin tools:** D-01 explicitly separates registries. Plugin tools must NOT be added to the static ACTION_REGISTRY array.
- **Re-fetching plugin tools on every send:** D-02 says fetch on mount only. Avoid refetching in `handleSubmit`.
- **Intent classification / tool filtering at MVP:** D-03 says include all tools. Do not build an intent classifier or token budget system.
- **Hardcoding wiki tool names in HubChat:** The wiki is a plugin. HubChat should treat all plugin tools generically. The only special handling is the destructive flag check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plugin skill definitions | Custom frontend manifest parser | `list_plugin_skills` Tauri command (Phase 41) | Phase 41 already handles manifest parsing and registry on Rust side |
| Wiki operations | Direct filesystem calls from frontend | `dispatch_plugin_skill` Tauri command (Phase 41) | Wiki engine runs in Rust with operation queue (Phase 42) |
| Tool list merging | Complex registry class | Simple array spread: `[...getToolDefinitions(), ...pluginToolDefs]` | Both are the same shape (`{name, description, input_schema}`), no need for abstraction |
| Confirmation flow for plugin tools | Separate confirmation UI | Existing `ActionConfirmCard` + `useActionDispatch` pattern | Plugin destructive flag maps directly to the existing flow |

**Key insight:** Phase 43 is pure integration glue. Phase 41 delivers the Rust-side plugin skill registry and dispatch. Phase 42 delivers the wiki operations. This phase only wires them into the existing chat UI, which already has all the rendering primitives (ActionConfirmCard, ActionResultCard, streaming, tool_use parsing).

## Common Pitfalls

### Pitfall 1: Stale Plugin Tools After Enable/Disable
**What goes wrong:** User enables/disables a plugin while chat is open. Plugin tools don't update until next chat open (per D-02).
**Why it happens:** Tools fetched on mount only.
**How to avoid:** This is by design. Document behavior clearly. Consider adding a subtle indicator if plugin state changed since last fetch (future enhancement, not in scope).
**Warning signs:** User reports "I enabled the wiki plugin but chat doesn't show wiki commands."

### Pitfall 2: Plugin Tool Name Collisions with Built-in Actions
**What goes wrong:** A plugin declares a skill named `create_task` which collides with the built-in action.
**Why it happens:** Plugin namespace prefix not enforced or stripped.
**How to avoid:** Phase 41 enforces `plugin_name:skill_name` prefixing (D-03 from Phase 41 context). The colon-separated namespace makes collisions impossible. When routing dispatch, check for `:` in the tool name to distinguish plugin vs built-in.
**Warning signs:** Wrong handler invoked for a tool call.

### Pitfall 3: Zustand Selector Stability
**What goes wrong:** Re-renders on every tick because a Zustand selector returns a new object reference.
**Why it happens:** Returning `{ pluginTools, isReady }` from a selector creates a new object each time.
**How to avoid:** Per project memory note: never return new object/array refs from Zustand selectors. Use separate selectors for each value, or use constants/useMemo.
**Warning signs:** Chat input lag, excessive re-renders visible in React DevTools.

### Pitfall 4: buildSystemPrompt Grows Too Large
**What goes wrong:** System prompt exceeds token limits as plugins add tools.
**Why it happens:** Each tool adds ~50-100 tokens of description text. With 20+ tools this can bloat.
**How to avoid:** For MVP (D-03), this is acceptable. The dynamic assembly architecture (D-04) makes future filtering possible. Keep tool descriptions concise in the generated prompt section.
**Warning signs:** LLM errors about context length, or tool descriptions getting truncated.

### Pitfall 5: Plugin Dispatch vs Built-in Dispatch Divergence
**What goes wrong:** Plugin tool results don't get fed back to the LLM like built-in tool results do.
**Why it happens:** The `sendToolResult` feedback loop only handles built-in actions (lookup actions).
**How to avoid:** Plugin query/read tools (like `knowledge:query`) also need feedback to the LLM. The dispatch routing must include the same `sendToolResult` call for plugin tools whose results the LLM needs to synthesize (especially wiki queries per D-07).
**Warning signs:** LLM says "I searched the wiki" but doesn't show the results in its response.

## Code Examples

### Merging Tool Definitions for hubChatSend

```typescript
// In HubChat handleSubmit
const builtinTools = getToolDefinitions();
const pluginToolDefs = pluginTools.map((pt) => ({
  name: pt.name,
  description: pt.description,
  input_schema: pt.input_schema,
}));
const allTools = [...builtinTools, ...pluginToolDefs];

await hubChatSend(chatMessages, buildSystemPrompt(manifest, ACTION_REGISTRY, pluginTools), allTools);
```

### Routing Plugin vs Built-in Dispatch

```typescript
// In handleToolUse, determine dispatch path
const isPlugin = toolUse.name.includes(":");  // "knowledge:query" has colon

if (isPlugin) {
  const destructive = isPluginToolDestructive(toolUse.name);
  if (destructive) {
    setPendingAction(/* ... */);
  } else {
    const result = await dispatchPluginSkill(toolUse.name, toolUse.input);
    setActionResults((prev) => [...prev, { id: toolUse.id, success: result.success, message: "..." }]);
    // Feed result back to LLM for synthesis (wiki query needs this)
    await sendToolResult(toolUse.id, result);
  }
} else {
  // Existing built-in dispatch path (unchanged)
}
```

### Dynamic Tool Description Generation

```typescript
// Generate tool descriptions for system prompt
function formatToolsForPrompt(
  builtins: ActionDefinition[],
  plugins: PluginToolDefinition[],
): string {
  const lines: string[] = [];

  // Group built-in tools by category (preserve existing grouping)
  lines.push("**Lookup (use before update/delete):**");
  lines.push(...builtins.filter(t => t.name === "search_tasks").map(formatTool));
  lines.push("\n**Task Management:**");
  lines.push(...builtins.filter(t => ["create_task","update_task","update_task_status","delete_task"].includes(t.name)).map(formatTool));
  // ... etc for other categories

  // Plugin tools grouped by plugin
  if (plugins.length > 0) {
    const byPlugin = groupBy(plugins, (p) => p.plugin_name);
    for (const [pluginName, tools] of Object.entries(byPlugin)) {
      lines.push(`\n**${pluginName} Plugin:**`);
      lines.push(...tools.map(formatTool));
    }
  }

  return lines.join("\n");
}

function formatTool(t: { name: string; description: string; input_schema: Record<string, unknown> }): string {
  const schema = t.input_schema as { properties?: Record<string, { type: string; description?: string }>; required?: string[] };
  const params = schema.properties
    ? Object.entries(schema.properties).map(([k, v]) => `"${k}":"${v.description || v.type}"`).join(",")
    : "";
  return `- ${t.name}: ${t.description}. Input: {${params}}.`;
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Plugin tools merged with built-in tools on mount | unit | `npx vitest run src/hooks/__tests__/usePluginTools.test.ts -x` | Wave 0 |
| CHAT-01 | Merged tool list passed to hubChatSend | unit | `npx vitest run src/components/hub/__tests__/HubChat.test.tsx -x` | Wave 0 |
| CHAT-02 | Plugin skill dispatch routes to dispatch_plugin_skill | unit | `npx vitest run src/hooks/__tests__/usePluginTools.test.ts -x` | Wave 0 |
| CHAT-02 | Destructive plugin tools show confirmation | unit | `npx vitest run src/components/hub/__tests__/HubChat.test.tsx -x` | Wave 0 |
| CHAT-03 | buildSystemPrompt generates tool list dynamically | unit | `npx vitest run src/components/hub/__tests__/buildSystemPrompt.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/hooks/__tests__/usePluginTools.test.ts` -- covers CHAT-01, CHAT-02
- [ ] `src/components/hub/__tests__/HubChat.test.tsx` -- extend existing tests for plugin tool merge
- [ ] `src/components/hub/__tests__/buildSystemPrompt.test.ts` -- covers CHAT-03 dynamic assembly

## Dependencies on Phase 41 and 42

This phase assumes the following are delivered by upstream phases:

### From Phase 41 (Plugin Infrastructure Evolution)
- `list_plugin_skills` Tauri command -- returns `Vec<PluginSkillDefinition>` with `name`, `description`, `input_schema`, `destructive`, `plugin_name` fields
- `dispatch_plugin_skill` Tauri command -- accepts `{ skillName: string, input: serde_json::Value }`, routes to correct plugin handler, returns result
- Namespace prefixing enforced: all plugin skills use `plugin_name:skill_name` format
- Skills from disabled plugins are excluded from `list_plugin_skills` results

### From Phase 42 (Knowledge Engine Core)
- Knowledge plugin registered with skills: `knowledge:ingest`, `knowledge:query`, `knowledge:lint`
- `knowledge:ingest` marked as destructive (writes to filesystem)
- `knowledge:query` and `knowledge:lint` marked as non-destructive (read-only)
- Query results returned as structured data with article citations
- Ingest results returned with success/failure status and article paths

**Risk:** If Phase 41/42 deliver different interfaces than assumed, the integration code will need adjustment. The clean separation (fetch via Tauri command, dispatch via Tauri command) minimizes coupling.

## Open Questions

1. **Plugin tool result format for LLM feedback**
   - What we know: Built-in actions return raw data that `sendToolResult` formats for the LLM. Wiki query results need to include article content for the LLM to synthesize answers.
   - What's unclear: Exact format of `dispatch_plugin_skill` return value. Is it a string? JSON? Structured object?
   - Recommendation: Assume structured JSON with `{ result: string, metadata?: object }`. The `sendToolResult` formatting can adapt.

2. **Feedback round cap for plugin tools**
   - What we know: Built-in lookup actions have a 2-round feedback cap (`feedbackRoundRef.current < 2`).
   - What's unclear: Should wiki query results count toward the same cap, or have their own?
   - Recommendation: Use the same cap. Wiki query is a single tool call that returns content for synthesis -- it doesn't need multi-round chaining.

## Sources

### Primary (HIGH confidence)
- `src/components/hub/HubChat.tsx` -- current hub chat implementation (570 lines)
- `src/lib/actionRegistry.ts` -- action registry pattern (332 lines, 16 actions)
- `src/hooks/useActionDispatch.ts` -- dispatch pattern (62 lines)
- `src-tauri/src/commands/hub_chat_commands.rs` -- Rust backend (83 lines)
- `src-tauri/src/ai/types.rs` -- ToolDefinition struct
- `.planning/phases/43-hub-chat-wiki-integration/43-CONTEXT.md` -- all 10 user decisions
- `.planning/phases/41-plugin-infrastructure-evolution/41-CONTEXT.md` -- Phase 41 decisions (upstream dependency)

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` -- Phase 42 success criteria and scope
- `.planning/REQUIREMENTS.md` -- CHAT-01, CHAT-02, CHAT-03 requirement text

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, pure integration of existing codebase patterns
- Architecture: HIGH -- all integration points identified in source code, Tauri IPC contract clear
- Pitfalls: HIGH -- identified from reading actual code patterns and project memory notes

**Research date:** 2026-04-06
**Valid until:** 2026-04-20 (stable -- depends on Phase 41/42 interfaces which are designed but not yet built)
