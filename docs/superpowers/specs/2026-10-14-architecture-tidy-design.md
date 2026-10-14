# Architecture tidy-up

## Goal

Many small changes are planned. Make adding, editing, removing and trying features faster and lower-risk by splitting oversized files and removing duplicated tool lists.

## Constraints

- Pure refactor: behavior stays identical.
- No new abstractions (no component registry, no framework). The "no abstraction before second use" rule from `CLAUDE.md` stays.
- One small step at a time, each its own commit, made only when asked.
- Bugs noticed while moving code are noted and left alone.

## Success criteria

- After every step: `npm run typecheck`, `npm run lint` and prettier on changed files pass.
- Widget steps also build the widget bundle; the admin step also runs `npm run build`.
- `npm run eval -- --runs 3` pass rate after the agent steps matches the baseline taken before them.
- Each large file is small enough to read in one pass, and each extracted unit has one purpose.

## File layout

### Admin page

`app/routes/app._index.tsx` (343 lines) shrinks to the loader, the action and a page that composes two components.

- `app/components/WidgetFunnel.tsx`: `WidgetFunnel` with its bar constants and colors.
- `app/components/ThemeEditor.tsx`: `ThemeEditor` and `COLOR_GROUPS`. `COLOR_GROUPS` is admin-only, so it stays out of `shared/`.

### Widget

`chat-widget/src/App.tsx` (257 lines):

- `chat-widget/src/useTeaser.ts`: teaser fetch, 3s delay, show, click, dismiss and the cancellation logic, moved unchanged.
- `chat-widget/src/useFollowLink.ts`: link interception and event tracking (`followLink`).
- `chat-widget/src/turns.ts`: `typingLabel`, `greeting`, `groupTurns`.
- `send`, `pick`, `like` and `add` stay in `App`; they share the busy and conversation state.

### Agent

`app/agent/agent.server.ts` (219 lines):

- `app/agent/history.ts`: `trimHistory`, `stripProductMedia`, history length constant.
- `app/agent/generate.server.ts`: `generateSuggestions`, `generateTeaser`.
- `agent.server.ts` keeps the model constant, `runAgent` and `streamReply`.

### Left alone

`storefront.server.ts`, `prompts.ts`, `tools.server.ts`, the DB modules, evals, `Message.tsx` (its switch is the render map; each case has different props).

## Deduped tool lists

Today the five data tools are named in `DATA_TOOL_PARTS` (`agent.server.ts`), `TOOL_LABELS` (`App.tsx`) and `tools.server.ts`. Forgetting one place fails silently: stale tool output stays in history, or the typing label falls back to "typing".

One list in `shared/chat.ts`, next to `COMPONENT_ACTIONS`:

```ts
export const DATA_TOOLS = {
  listProducts: "lookingUpProducts",
  listCollections: "lookingUpProducts",
  getProduct: "lookingUpProducts",
  listStorePages: "checkingStore",
  getStorePage: "checkingStore",
} as const;
```

- Keys are tool names; values are widget typing-label i18n keys, not translated text, so `shared/` stays free of widget imports.
- `history.ts` builds its drop list from `Object.keys(DATA_TOOLS)`.
- `typingLabel` reads `DATA_TOOLS[tool]`.
- A type check ties the keys to the tools in `createTools`, so a typo or a removed tool fails at typecheck.

`COMPONENT_ACTIONS` is unchanged. Adding a component still takes four edits: tool, `Message.tsx` case, `COMPONENT_ACTIONS` entry, prompt line.

## Data flow

Unchanged: widget `POST { id, text, country, language }` → `streamReply` → `runAgent` (tools, then suggestions) → SSE → `useChat`. Only file locations move.

## Error handling

Unchanged. Every `catch`, retry (`generateSuggestions` retries 3 times) and fallback (the widget's one retry without a conversation id) moves as written.

## Steps

1. Admin page: extract `WidgetFunnel` and `ThemeEditor`.
2. Agent: extract `history.ts` and `generate.server.ts`.
3. Add `DATA_TOOLS` to `shared/chat.ts`; use it in `history.ts` and `typingLabel`.
4. Widget: extract `turns.ts`.
5. Widget: extract `useTeaser.ts`.
6. Widget: extract `useFollowLink.ts`.

Take an eval baseline (`npm run eval -- --runs 3`) before step 2 and compare after step 3.

## Verification

- Steps 2 and 3: eval pass rates against the baseline.
- Step 1: funnel and theme editor with live preview. The embedded admin does not load on ngrok's free tier, so this needs another way to look or a manual check by the user.
- Steps 4 to 6: teaser, link following and typing label in the widget.

## Risks

- Step 5 holds timing and cleanup logic (`cancelled`, the 3s delay); it moves unchanged.
- Step 3 changes what history drops only if the new list differs from the old; it is the same five names.

## Out of scope

- Splitting `storefront.server.ts`.
- A component registry.
- A shared CSS variable for the 400px panel width (noted in `.claude/theme-coupling.md`).
- Editing `CLAUDE.md`. Its agent paragraph names files that will move, so it needs updating at the end, after asking.
