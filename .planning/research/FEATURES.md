# Feature Research

**Domain:** AI-powered daily hub with briefing, chat, goals tree, bot skills, and context manifest
**Researched:** 2026-03-31
**Confidence:** MEDIUM-HIGH (hub UI patterns well-established; briefing generation and chat-to-orchestrator are emerging but well-documented; bot skill frameworks have clear precedents)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist once they see an AI-powered "home screen." Missing these makes the hub feel like a toy.

#### Hub Layout

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| 3-column hub layout replacing TodayView | Every dashboard/home screen uses columns or cards. TodayView is a flat task list -- the hub needs spatial hierarchy: goals tree (left), AI content (center), calendar/agenda (right). | MEDIUM | Replaces `TodayView` in `CenterPanel.tsx` default branch. Must keep TodayView data (today's tasks) available as a data source for the briefing. |
| Responsive column collapse | Users resize windows. Three columns at 1200px+, two at 900px, stacked at 600px. | LOW | CSS grid or flexbox with breakpoints. shadcn/ui does not provide a 3-column dashboard layout out of the box -- build with Tailwind grid. |
| Hub as default home view | When no project is selected, user lands on the hub. This replaces TodayView as the "nothing selected" state. | LOW | Change `CenterPanel.tsx` fallback from `<TodayView />` to `<DailyHub />`. |
| Greeting with time-of-day awareness | "Good morning, [name]" is the most basic personalization. Every AI dashboard does this (Apple Intelligence, Google Home, Notion AI). Without it the hub feels robotic. | LOW | Compute from `new Date().getHours()`. No user name needed initially -- "Good morning" suffices. |
| Today's date and day context | Users need temporal anchoring: "Tuesday, April 1" plus context like "3 tasks due today, 1 overdue." | LOW | Reuse existing `fetchTodaysTasks()` from `useTaskStore`. |
| Scrollable center column | AI briefing + chat will grow beyond viewport. Auto-scroll to bottom on new messages, scroll-to-top for briefing. | LOW | `ScrollArea` from shadcn/ui, already used throughout the app. |

#### AI Daily Briefing

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| LLM-generated daily summary | The entire point of an "AI-powered hub." User opens the app and sees a natural-language summary of priorities across all projects. Without this, the hub is just a reorganized task list. | HIGH | Requires: (1) context aggregation across all projects, (2) LLM API call via existing AI gateway, (3) rendering markdown response. The context manifest (see below) feeds this. |
| Cross-project priority synthesis | Summary must span ALL projects, not just one. "Project A needs review, Project B is blocked on tests, Project C is on track." | MEDIUM | Query all projects + their phases/tasks from DB. The MCP server's `list_projects` and `get_project_detail` tools already do this -- reuse that query logic in Rust. |
| Briefing refresh on demand | User wants fresh briefing after completing tasks. Manual refresh button. | LOW | Re-trigger the briefing generation function. Show loading skeleton during regeneration. |
| Briefing rendered as markdown | LLM output is markdown. Must render headers, bullets, bold, code blocks cleanly. | LOW | Use `react-markdown` (already a common pattern in the ecosystem). prompt-kit and shadcn AI components also provide markdown message rendering. |
| Briefing loading skeleton | First load takes 2-5 seconds for LLM response. Must show skeleton, not blank space. | LOW | shadcn/ui `Skeleton` component. Show 4-5 skeleton lines that match expected briefing structure. |

#### Hub Chat Interface

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Text input for conversational commands | "What should I work on next?" or "Start phase 3 on Project X." Chat is the expected interface for AI interaction in 2025+. Every AI product has a chat input. | MEDIUM | New component: `HubChatInput` with auto-resizing textarea. Sends messages to orchestrator agent. Distinct from agent panel -- this is the primary interaction surface. |
| Message history (user + assistant) | Chat without history is useless. User must see their previous questions and AI responses in scrollable thread. | MEDIUM | Zustand slice for hub chat messages. Persist to SQLite for cross-session history. Message type: `{ role: 'user' | 'assistant', content: string, timestamp: number }`. |
| Streaming AI responses | Users expect to see text appear word-by-word, not wait for full response. Every modern AI chat streams. | MEDIUM | Depends on AI gateway supporting streaming. If using CLI tool (claude), capture stdout incrementally. If using API directly, use SSE/streaming endpoint. |
| Markdown rendering in chat messages | AI responses include formatting, lists, code. Must render properly. | LOW | Same `react-markdown` setup as briefing. Memoize rendered messages to avoid re-render on new messages (the pattern from Vercel AI SDK cookbook). |

### Differentiators (Competitive Advantage)

Features that make Element's hub uniquely valuable versus generic task dashboards.

#### Goals Tree View

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| Hierarchical goals tree: Themes > Projects > Phases > Tasks | No competitor shows the full work hierarchy in a single tree. This is Element's data model advantage -- themes, projects, phases, tasks are already structured. Visualizing this as a collapsible tree gives users a "birds-eye view" of all work. | MEDIUM | Query all themes, projects, phases from existing stores. Render as nested collapsible tree using shadcn tree-view pattern (custom component with Tailwind, no heavy library needed). |
| Progress indicators per tree node | Each node shows completion percentage or status badge. Theme is 60% done (3/5 projects), Project is 80% done (4/5 phases). Instant comprehension of where things stand. | LOW | Compute from existing task/phase completion data. Render as small progress bar or fraction text beside each node. |
| Click-to-navigate from tree | Click a project node, navigate to ProjectDetail. Click a phase, scroll to that phase in the project. The tree is both visualization and navigation. | LOW | Reuse existing `setSelectedProjectId` and `setSelectedThemeId` from stores. |
| Visual status encoding | Color-code nodes: green (complete), blue (in-progress), yellow (blocked), red (overdue), gray (not started). Scannable at a glance. | LOW | Map status to Tailwind color classes. Use existing task/phase status fields. |

#### Conversational Orchestration

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| Chat commands trigger orchestrator actions | "Start working on Project X" causes the agent to begin the next phase. "What's blocked?" queries all projects for blockers. The chat IS the command interface -- not a separate tool. | HIGH | Must route chat messages to the MCP server / agent. Parse intent (LLM-driven, not regex). Agent executes via existing MCP tools. Results flow back as chat messages. |
| Action confirmations in chat | When chat triggers an action (start phase, create task), show a confirmation card inline: "I'll start Phase 3 of Project X. [Confirm] [Cancel]". Same approval pattern as agent panel but in chat context. | MEDIUM | Reuse approval flow from `useAgentStore`. Render approval card as special message type in chat. On confirm, write approval to agent queue. |
| Context-aware suggestions | After briefing loads, show 2-3 quick-action chips: "Start next phase on X", "Review blocked items", "Plan my day". Reduces blank-input anxiety. | LOW | Generate from briefing content. Static initially -- LLM-generated suggestions as enhancement. |

#### Central Context Manifest

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| Auto-generated `.element/context-manifest.json` | Single file that captures the state of ALL projects, phases, tasks, and their status. The orchestrator reads this instead of making N database queries. Efficient context window usage. | MEDIUM | Rust command that queries all entities and writes a structured JSON file. Regenerate on any DB mutation (debounced). Store alongside `element.db`. |
| Token-budget-aware summary format | Manifest includes both full data and a compressed summary. Briefing prompt uses the summary (fits in context window). Detailed queries use full data. | MEDIUM | Two sections: `summary` (one paragraph per project, ~100 tokens each) and `details` (full entity data). Existing `generate_context_file_content` in `onboarding.rs` is a precedent for this pattern. |
| Manifest versioning / staleness detection | Timestamp in manifest. If stale (>5 min since last DB change), regenerate before briefing. Prevents stale briefings. | LOW | `lastUpdated` field in manifest. Compare against DB `updated_at` max. |

#### Bot Skills Extension

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| Expanded MCP tool set for hub operations | Current MCP server has 10 tools (5 read + 5 orchestration). Hub needs: `generate_briefing`, `get_context_manifest`, `create_task`, `update_task_status`, `get_todays_tasks`. | MEDIUM | Add tools to existing `mcp-server/src/tools/`. Follow established pattern from `project-tools.ts` and `orchestration-tools.ts`. |
| Write tools (create/update entities) | Current MCP tools are mostly read-only. Chat commands like "create a task for X" need write access. `create_task`, `update_task_status`, `create_phase` at minimum. | MEDIUM | New file: `mcp-server/src/tools/write-tools.ts`. SQLite INSERT/UPDATE statements. Must validate inputs. |
| Skill discovery / help command | "What can you do?" shows available bot skills. Users need to know capabilities. | LOW | MCP `tools/list` endpoint already exists. Format tool list as a friendly chat message. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time calendar sync in hub | "Show my Google Calendar events next to tasks" | OAuth complexity already proven painful (placeholder client IDs). Calendar integration is a separate feature area that adds significant scope. Hub should work without external services. | Calendar column shows a placeholder with "Coming soon" text. Task time blocks from existing scheduler data are sufficient for v1.4. |
| Email signal ingestion | "Parse my email for action items" | Requires email provider OAuth, parsing logic, spam filtering, privacy concerns. Massive scope that's explicitly listed as Future in PROJECT.md. | Keep as Future requirement. Hub briefing focuses on what's already in Element's database. |
| Natural language task creation via chat | "Add a task: buy groceries for tomorrow" | NLP parsing for task attributes (due date, project, priority) is error-prone. Misclassification leads to tasks in wrong projects, wrong dates. Creates distrust. | Chat can create tasks but with explicit confirmation: AI parses intent, shows structured preview ("Task: Buy groceries, Due: April 2, Project: Personal"), user confirms. Never auto-create without confirmation. |
| AI urgency/priority scoring | "AI should tell me what's most important" | Subjective. AI ranking rarely matches user's actual priorities. Creates frustration when AI deprioritizes something the user considers critical. | Briefing presents information and highlights overdue/blocked items. User decides priority. AI informs, user decides. |
| Persistent chat memory across days | "The AI should remember what we discussed yesterday" | Memory system is explicitly deferred in PROJECT.md (AGENT-10). Requires design for what to remember, storage, privacy. Session-level memory is fine; cross-session is premature. | Chat history persists in SQLite for reference/scroll-back. But each new briefing starts fresh -- no accumulated context debt. |
| Customizable hub layout (drag widgets) | "Let me rearrange the columns" | Dashboard layout customization is a massive feature: drag-and-drop, resize, save layouts, reset to default. Engineering cost far exceeds value for a single-user app. | Fixed 3-column layout. Columns can collapse/expand. Column content is well-chosen by default. |
| Voice input for chat | "Talk to my AI assistant" | Requires speech-to-text integration, microphone permissions, audio processing. Adds complexity without proportional value on desktop. | Text input only. User can use OS-level dictation (macOS Dictation, Windows Voice Typing) if they want voice. |

## Feature Dependencies

```
[Context Manifest]
    +-- feeds --> [AI Daily Briefing]
                      +-- renders in --> [Hub Center Column]
                      +-- generates --> [Quick-Action Suggestions]

[Hub Layout (3-column)]
    +-- contains --> [Goals Tree] (left column)
    +-- contains --> [Briefing + Chat] (center column)
    +-- contains --> [Calendar Placeholder] (right column)

[Goals Tree]
    +-- reads from --> [Existing theme/project/phase stores]
    +-- navigates to --> [CenterPanel project/theme selection]

[Hub Chat Input]
    +-- sends to --> [Orchestrator Agent (via MCP / agent queue)]
    +-- displays --> [Chat Message History]
    +-- triggers --> [Action Confirmations]

[Action Confirmations]
    +-- reuses --> [Agent approval flow (useAgentStore)]
    +-- writes to --> [Agent queue files]

[Bot Skills (Write Tools)]
    +-- extends --> [Existing MCP server]
    +-- enables --> [Chat-driven task/phase creation]

[Chat Commands]
    +-- requires --> [Bot Skills (Write Tools)]
    +-- requires --> [Hub Chat Input]
    +-- requires --> [Context Manifest] (for informed responses)

[AI Daily Briefing]
    +-- requires --> [Context Manifest]
    +-- requires --> [AI Gateway / LLM API call]
    +-- requires --> [Markdown rendering]
```

### Dependency Notes

- **Context Manifest must come first:** Both the briefing and chat need aggregated project state. Building the manifest first gives both features their data source. Without it, the briefing would need to make N separate queries and the chat would lack cross-project awareness.
- **Hub layout is independent of AI features:** The 3-column grid can be built with placeholder content before briefing/chat are wired up. This allows parallel work.
- **Chat requires bot skills:** Chat messages that trigger actions ("create a task", "start phase 3") need write tools in the MCP server. Read-only chat (Q&A) works with existing tools, but actionable chat needs write tools.
- **Goals tree reuses existing data:** No new data model needed. Themes, projects, phases, tasks are all in existing stores. The tree is purely a visualization layer.
- **Action confirmations reuse agent approval flow:** The approval pattern (pending/approved/rejected) already exists in `useAgentStore`. Hub chat confirmations can use the same mechanism, just rendered inline in chat instead of in the agent panel.

## MVP Definition

### Launch With (v1.4)

Minimum viable daily hub -- enough to validate the concept of AI-powered home screen.

- [ ] Hub 3-column layout replacing TodayView as default -- the container
- [ ] Goals tree (left column) with theme > project > phase hierarchy -- visualization
- [ ] Progress indicators and click-to-navigate on tree nodes -- makes tree useful
- [ ] AI daily briefing (center column) with markdown rendering -- the headline feature
- [ ] Context manifest auto-generation from all project data -- feeds the briefing
- [ ] Hub chat input with message history -- conversational interface
- [ ] Chat messages routed to orchestrator agent -- chat is functional, not decorative
- [ ] Basic streaming or chunked response rendering -- avoids dead-wait UX
- [ ] Quick-action suggestion chips below briefing -- reduces blank-input anxiety
- [ ] Bot skills: write tools for create_task, update_task_status -- chat can act, not just answer
- [ ] Calendar placeholder (right column) with today's task time blocks -- column exists, content is minimal
- [ ] Briefing refresh button -- user can re-generate after changes

### Add After Validation (v1.4.x)

Features to add once the hub is working and users are engaging with it.

- [ ] Action confirmation cards inline in chat -- safety for destructive actions
- [ ] Chat-driven phase creation and project management -- deeper write tools
- [ ] Streaming token-by-token response in chat -- polish the typing feel
- [ ] Briefing auto-refresh on app focus -- always fresh when switching back to Element
- [ ] Token-budget-aware manifest (summary vs full) -- optimize LLM context usage
- [ ] Chat history persistence to SQLite -- survives app restart

### Future Consideration (v2+)

- [ ] Calendar integration in right column (Google/Outlook events) -- requires OAuth work
- [ ] Email signal ingestion into briefing -- requires provider integration
- [ ] AI urgency scoring for task prioritization -- requires trust calibration
- [ ] Cross-session memory for chat context -- requires memory system design (AGENT-10)
- [ ] Gantt-style day view in calendar column -- visualization feature

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Hub 3-column layout | HIGH | MEDIUM | P1 |
| Goals tree with hierarchy | HIGH | MEDIUM | P1 |
| Context manifest generation | HIGH | MEDIUM | P1 |
| AI daily briefing | HIGH | HIGH | P1 |
| Hub chat input + history | HIGH | MEDIUM | P1 |
| Chat routed to orchestrator | HIGH | HIGH | P1 |
| Bot write tools (create/update) | HIGH | MEDIUM | P1 |
| Briefing markdown rendering | MEDIUM | LOW | P1 |
| Quick-action chips | MEDIUM | LOW | P1 |
| Progress indicators on tree | MEDIUM | LOW | P1 |
| Click-to-navigate from tree | MEDIUM | LOW | P1 |
| Calendar placeholder column | LOW | LOW | P1 |
| Briefing refresh button | MEDIUM | LOW | P1 |
| Action confirmations in chat | HIGH | MEDIUM | P2 |
| Streaming responses | MEDIUM | MEDIUM | P2 |
| Briefing auto-refresh on focus | LOW | LOW | P2 |
| Chat history SQLite persistence | MEDIUM | MEDIUM | P2 |
| Token-budget manifest | MEDIUM | MEDIUM | P2 |
| Calendar integration | MEDIUM | HIGH | P3 |
| Email ingestion | LOW | HIGH | P3 |
| AI urgency scoring | LOW | HIGH | P3 |
| Cross-session memory | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.4 launch
- P2: Should have, add after core hub is validated
- P3: Nice to have, future milestone

## Competitor Feature Analysis

| Feature | Notion AI | Linear | Todoist AI | Motion | Element Approach |
|---------|-----------|--------|------------|--------|-----------------|
| **Daily summary** | AI-generated page summaries. Per-page, not cross-project. | Weekly updates auto-generated per project. Not daily, not cross-project. | "AI Assistant" suggests task prioritization. Single project scope. | Auto-schedules tasks across calendar. No narrative summary. | Cross-project daily briefing synthesizing ALL work into natural language. The only tool that gives a unified narrative across themes/projects/phases. |
| **Chat interface** | AI chat within pages. Context = current page only. | No chat. Command palette only. | No chat. AI suggestions inline. | No chat. Algorithm-driven, no conversational interface. | Hub chat that can query AND act across all projects. "What's blocked?" spans everything. "Start phase 3 on X" triggers action. Chat is the orchestration surface. |
| **Goals/hierarchy view** | Manual page nesting. No auto-hierarchy. | Projects > Issues > Sub-issues. Treeview in sidebar. | Projects > Sections > Tasks. Flat within section. | Projects > Tasks. No phases concept. | Themes > Projects > Phases > Tasks. Four-level hierarchy with progress rollup. Most structured model of any competitor. Tree view makes this visible. |
| **Bot skills/tools** | AI has "Ask AI" within pages. Cannot modify structure or create pages autonomously. | No bot/agent concept. | AI suggests but cannot execute. | No bot/agent concept. Algorithm-only. | MCP-based tool framework. Agent can read AND write all entities. Extensible via new tool files. Skills discoverable via "What can you do?" |
| **Context aggregation** | AI sees current page + linked pages. No global manifest. | API provides project data. No aggregation layer. | No aggregation concept. | Calendar + task data in algorithm. Not exposed. | Auto-generated context manifest: single JSON file with all project state. Efficient LLM consumption. Regenerated on DB changes. |

## Briefing Prompt Design

The briefing is the hub's headline feature. The prompt structure matters for quality.

**Input:** Context manifest (all projects summary) + today's tasks + overdue items + recent completions
**Output:** 3-5 paragraph natural language summary

**Prompt structure (recommended):**
1. Role: "You are a project management assistant reviewing the user's work portfolio"
2. Context: Inject context manifest summary section
3. Today's data: Tasks due today, overdue items, recently completed items
4. Instructions: "Generate a concise daily briefing covering: (a) top priorities today, (b) items needing attention across projects, (c) recent progress worth noting, (d) suggested focus for the day"
5. Format constraints: "Use markdown. Keep under 300 words. Lead with the most actionable item."

**Key design decisions:**
- Briefing is generated once on hub load, not continuously
- User can refresh manually
- Briefing does NOT make decisions -- it informs
- Overdue and blocked items always surfaced (never buried)

## Hub Chat Message Types

Chat messages need structure beyond plain text to support confirmations and actions.

| Type | Rendering | Example |
|------|-----------|---------|
| `user_message` | Right-aligned bubble, user avatar | "What's blocked right now?" |
| `assistant_message` | Left-aligned bubble, bot avatar, markdown rendered | "Project X has 2 blocked phases..." |
| `action_confirmation` | Card with description + Confirm/Cancel buttons | "I'll start Phase 3 on Project X. [Confirm] [Cancel]" |
| `action_result` | Muted card with outcome | "Phase 3 started. Terminal session 'AI: Project X' created." |
| `suggestion_chips` | Horizontal pill row below last message | ["Start next phase", "Show blockers", "Plan my day"] |
| `loading` | Animated dots or skeleton lines | "..." |
| `error` | Red-tinted card with retry option | "Failed to generate briefing. [Retry]" |

## Sources

- [shadcn/ui AI Components](https://www.shadcn.io/ai) -- Chat bubble, auto-scroll, markdown rendering patterns
- [prompt-kit](https://www.prompt-kit.com/chat-ui) -- Drop-in chat UI components for React AI apps
- [assistant-ui](https://github.com/assistant-ui/assistant-ui) -- Production-ready AI chat React library
- [Vercel AI SDK Markdown Chatbot Cookbook](https://ai-sdk.dev/cookbook/next/markdown-chatbot-with-memoization) -- Memoization patterns for streaming markdown
- [AI Agent Orchestration Patterns (Azure)](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) -- Orchestrator/worker patterns
- [Context Management for Agentic AI](https://medium.com/@hungry.soul/context-management-a-practical-guide-for-agentic-ai-74562a33b2a5) -- Context aggregation strategies
- [Claude Workflow Patterns](https://claude.com/blog/common-workflow-patterns-for-ai-agents-and-when-to-use-them) -- Agent workflow patterns
- [Microsoft Bot Framework Skills](https://microsoft.github.io/botframework-solutions/overview/skills/) -- Skill abstraction pattern
- [Agent Skills Open Standard](https://microsoft.github.io/skills/) -- Markdown-based skill definitions
- [VS Code Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills) -- Skill discovery and invocation
- [Shadcn Tree View](https://www.shadcn.io/template/mrlightful-shadcn-tree-view) -- Tree component pattern with Tailwind
- [react-d3-tree](https://www.npmjs.com/package/react-d3-tree) -- Hierarchical data visualization (considered, too heavy)
- [Deep Dive into Context Engineering for Agents](https://galileo.ai/blog/context-engineering-for-agents) -- Context manifest best practices

---
*Feature research for: Element v1.4 Daily Hub*
*Researched: 2026-03-31*
