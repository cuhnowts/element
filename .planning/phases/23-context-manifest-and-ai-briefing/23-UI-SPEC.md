---
phase: 23
slug: context-manifest-and-ai-briefing
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-04-01
---

# Phase 23 — UI Design Contract

> Visual and interaction contract for the AI briefing panel that renders in the hub center column. The context manifest is backend-only (no UI); this contract covers the briefing presentation layer.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn |
| Preset | base-nova |
| Component library | radix |
| Icon library | lucide-react |
| Font | Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing, gap between briefing metadata items |
| md | 16px | Default element spacing, briefing section padding |
| lg | 24px | Briefing card internal padding |
| xl | 32px | Gap between greeting and briefing content |
| 2xl | 48px | Top padding of center column content area |
| 3xl | 64px | Not used in this phase |

Exceptions: none

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 (regular) | 1.5 |
| Label | 12px | 400 (regular) | 1.4 |
| Heading | 20px | 600 (semibold) | 1.2 |
| Greeting | 24px | 600 (semibold) | 1.2 |

Notes:
- Greeting text ("Good morning, Jake.") uses the Greeting role at 24px/600.
- Briefing markdown body uses Body role at 14px/400.
- "Last refreshed" timestamp and metadata labels use Label role at 12px/400. Label is differentiated from Body by smaller size (12px vs 14px) and muted foreground color (`--color-muted-foreground`), not by weight.
- Section headings within the briefing markdown (h2/h3) use Heading role at 20px/600.
- Weight palette is exactly two values: 400 (regular) for Body and Label, 600 (semibold) for Heading and Greeting.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--color-background` oklch(0.145 0 0) | Center column background |
| Secondary (30%) | `--color-card` oklch(0.205 0 0) | Briefing card surface |
| Accent (10%) | `--color-primary` oklch(0.985 0 0) | Refresh button icon, greeting text |
| Muted text | `--color-muted-foreground` oklch(0.708 0 0) | "Last refreshed" timestamp, subtitle text, Label role text |
| Destructive | `--color-destructive-foreground` oklch(0.637 0.237 25.331) | Overdue task/phase indicators in briefing content |

Accent reserved for: refresh button icon, greeting text emphasis, progress-positive indicators in briefing content. Never for body text, card borders, or background fills.

Accent unifies warmth and interactivity to reinforce the hub's active character -- the greeting emphasis (decorative warmth) and refresh button icon (interactive affordance) both signal that the hub is alive and responsive. Both uses are intentional.

---

## Visual Focal Point

The Greeting is the primary visual focal point -- the first element the eye lands on, anchoring the panel. It sits at the top of the content area at 24px/600 semibold, with 48px of breathing room above it, making it the largest and heaviest text element on the page.

The refresh button is an icon-only ghost button (`RefreshCw`, 16px) with no visible label. Discovery relies on the `aria-label` and a tooltip ("Refresh briefing") shown on hover. This is intentional -- the button is a secondary action and must not compete with the greeting focal point or the briefing content.

---

## Component Inventory

Components needed for this phase:

| Component | Source | Notes |
|-----------|--------|-------|
| `BriefingPanel` | New | Container for greeting + briefing in center column |
| `BriefingGreeting` | New | Time-of-day greeting ("Good morning, Jake.") |
| `BriefingContent` | New | Streaming markdown rendered via react-markdown |
| `BriefingRefreshButton` | New | Icon button (RefreshCw from lucide) to manually regenerate |
| `BriefingSkeleton` | New | Loading placeholder using existing `Skeleton` component |
| `Skeleton` | Existing (shadcn) | Pulse animation placeholder |
| `Button` | Existing (shadcn) | For refresh action, variant="ghost" size="icon" |
| `Card` | Existing (shadcn) | Briefing card wrapper |
| `ScrollArea` | Existing (shadcn) | Scrollable briefing content when it exceeds viewport |

New dependency required: `react-markdown` (renders briefing markdown without code changes per D-13).

---

## Layout Contract

### BriefingPanel Placement
- Renders inside the hub center column (created in Phase 22)
- Takes full width and height of the center column
- Internal layout: vertical flex, top-aligned
- Top padding: 48px (2xl) from column top edge
- Horizontal padding: 24px (lg) from column edges

### BriefingPanel Structure (top to bottom)
1. **Greeting** — 24px semibold, left-aligned. "Good morning, Jake. Here's your day."
2. **Spacing** — 32px (xl) gap
3. **Briefing Card** — Card component with 24px (lg) internal padding
   - Card header row: "Daily Briefing" label (left) + refresh button (right) + "Last refreshed" timestamp (right, muted)
   - Card body: Streamed markdown content inside ScrollArea
4. **Empty/Edge States** — Render inside the card body area

### Scroll Behavior
- BriefingPanel itself does not scroll
- BriefingContent (inside the card) scrolls via ScrollArea when content exceeds available height
- ScrollArea max-height: calc(100vh - 240px) to leave room for greeting and card header

---

## Interaction Contract

### Briefing Lifecycle
1. **Hub loads** -> BriefingSkeleton shown -> Tauri command `build_context_manifest` called -> manifest returned -> AI gateway called with manifest as context -> `briefing-chunk` events stream in -> BriefingContent progressively renders
2. **User clicks refresh** -> BriefingContent fades to 50% opacity -> new generation starts -> old content replaced as new chunks arrive
3. **Time loop fires (every 2-3 hours)** -> same as refresh, but automatic. Only fires if hub is the active view.
4. **DB mutation detected** -> manifest rebuilds (Rust-side, debounced 5s) -> briefing does NOT auto-regenerate (would be disruptive). Manifest stays fresh for next manual/timer refresh.

### Loading State (BriefingSkeleton)
- 3 skeleton lines: widths 80%, 60%, 70%
- Skeleton height: 14px per line (matches body text)
- Gap between lines: 8px (sm)
- Skeleton renders inside the briefing card body
- Greeting renders immediately (no skeleton for greeting -- it is static text)

### Streaming State
- Text appears character-by-character as `briefing-chunk` events arrive
- Cursor-style blinking indicator (a small pulsing dot, 6px, accent color) at the end of the last rendered chunk
- On `briefing-complete` event, the dot disappears

### Refresh Button
- Icon: `RefreshCw` from lucide-react, 16px
- Button: variant="ghost", size="icon"
- Disabled state: while briefing is streaming (prevent double-generation)
- Spin animation: icon rotates 360deg while generating (CSS `animate-spin`)

### Error State
- Renders inside the briefing card body
- No separate error component -- use muted foreground text

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Greeting (morning) | "Good morning, {name}. Here's your day." |
| Greeting (afternoon) | "Good afternoon, {name}. Here's where things stand." |
| Greeting (evening) | "Good evening, {name}. Here's your wrap-up." |
| Loading state | Skeleton lines (no text) |
| Empty state — no projects | "No projects yet. Create one to get started." |
| Empty state — all caught up | "Great work — everything is on track. What else do you want to tackle today?" |
| Error state | "Briefing could not be generated. Check your AI provider settings and try again." |
| Refresh button tooltip | "Refresh briefing" |
| Last refreshed label | "Updated {relative time}" (e.g., "Updated 2 minutes ago") |
| Destructive confirmation | N/A — no destructive actions in this phase |

---

## State Management Contract

### Briefing Zustand Slice (new: `briefingSlice.ts`)

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `briefingContent` | `string` | `""` | Accumulated markdown from stream chunks |
| `briefingStatus` | `"idle" \| "loading" \| "streaming" \| "complete" \| "error"` | `"idle"` | Current lifecycle state |
| `briefingError` | `string \| null` | `null` | Error message if generation failed |
| `lastRefreshedAt` | `number \| null` | `null` | Unix timestamp of last successful completion |
| `requestBriefing` | `() => void` | — | Triggers manifest build + AI generation |
| `appendChunk` | `(chunk: string) => void` | — | Appends streamed text |
| `completeBriefing` | `() => void` | — | Sets status to complete, records timestamp |
| `failBriefing` | `(error: string) => void` | — | Sets status to error with message |

Selector stability note: Never return new object/array refs from selectors. Use primitive selectors (e.g., `useBriefingStore(s => s.briefingStatus)`) or constants for empty states.

---

## Tauri Event Contract

| Event Name | Payload | Direction |
|------------|---------|-----------|
| `briefing-chunk` | `{ content: string }` | Rust -> Frontend |
| `briefing-complete` | `{}` | Rust -> Frontend |
| `briefing-error` | `{ error: string }` | Rust -> Frontend |

Pattern matches existing `ai-stream-complete` / `ai-stream-error` conventions.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Skeleton, Button, Card, ScrollArea | not required |

No third-party registries declared.

---

## Accessibility Notes

- Refresh button must have `aria-label="Refresh briefing"`
- Briefing content area should have `role="region"` and `aria-label="AI daily briefing"`
- Streaming indicator dot should be `aria-hidden="true"` (decorative)
- Greeting should be an `h1` element for screen reader landmark navigation

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
