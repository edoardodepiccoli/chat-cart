# v1: shopping assistant

## Goal

Ship a clean, stable v1 of the chat widget as an **AI shopping assistant**: it helps the shopper find the right product and answers store questions, then sends them to the product page (PDP). It never touches the cart.

This removes the browser-cart / agent-state sync problem entirely, removes every dependency on a specific theme, and leaves a codebase where adding or changing a feature is cheap and checked by the compiler.

## Context and constraints

- Target: a dev store the author owns and controls. The theme may change, so the widget makes **no assumptions about theme markup or layout**.
- Codebase today (~4k lines): agent with 5 data tools and 4 display tools, widget that reads and writes the Shopify cart, theme-specific CSS (page push, cart drawer shift), admin funnel and color editor.
- Work proceeds in phases; the app works at the end of each phase.

## Success criteria

- No code reads or writes the cart. No CSS selector targets theme markup. The only style applied outside the widget root is the mobile scroll lock (`overflow: hidden` on `<html>` while the panel is open).
- Every tool is named once, in `shared/tools.ts`. Forgetting the component or the `execute` of a display tool fails `npm run typecheck`.
- `shared/` imports nothing from `app/` or `chat-widget/`.
- `npm run typecheck`, `npm run lint`, `npm test`, widget build and `npm run build` pass.
- Eval pass rate after phase 2 matches the baseline taken at the end of phase 1.

## Shopper experience

### Panel

- Floating launcher bottom-right. The panel opens as an overlay above the page: on desktop a fixed card about 400×640 px anchored bottom-right; on mobile the floating card with blurred backdrop, as today.
- No page push, no theme drawer shift.
- Fixed color palette in `chat-widget/src/tokens.css`. No merchant color settings.

### Agent role

- The system prompt's goal changes from "help them buy" to "help them find the right product and get to its page". Every rule about cart, checkout, add-to-cart and add-ons is removed.
- Reply shapes:
  - Text: one or two sentences.
  - Text and products: one or two sentences, then one `showProducts` call.
  - Store answer: one `showFaqCard` call, no text.
- Cart and checkout questions get a one-sentence text reply: the assistant can't see the cart; it steers back to what it can help with.

### Components

- `showProducts` (1 to 4 handles, best first) replaces `showProductCard` and `showProductCards`. Each card is a plain link to the PDP (default variant): photo, title, price, and the original price when on sale. No option picker, no like button, no `unavailable` logic.
- `showFaqCard`: unchanged.

### Links

- Links inside the panel navigate normally. A capture-phase click handler only records the event (`product_clicked` or `link_clicked`). No `preventDefault`, no panel close, no delay.

### Suggested replies

- Kept: three tap-to-send replies after each assistant message. The suggestions prompt loses its cart and add-to-cart rules and its single-card / multi-card split.

## Shopper context

One `ShopperContext`, defined in `shared/context.ts`, is sent with **every chat request and every teaser request**:

```ts
type PageContext =
  | { type: "product"; handle: string }
  | { type: "collection"; handle: string }
  | { type: "search"; terms: string }
  | { type: "other" };

type Visit = PageContext & { at: number };

type ShopperContext = {
  country: string;
  language: string;
  page: PageContext;
  history: Visit[]; // most recent last, at most 10
};
```

### Widget side (`chat-widget/src/context.ts`)

- The liquid block passes `request.page_type`, `product.handle`, `collection.handle` and `search.terms` as data attributes. `main.tsx` turns them into `PageContext`.
- On every product, collection or search page load the widget appends the current page to the history in `localStorage` (key `chat-cart:history`), collapses a visit equal to the previous one, keeps the last 10. The current page is not part of `history`; it is `page`.
- If storage is unavailable, history is empty. No error is shown.

### Server side (`app/agent/context.server.ts`)

- Validates `ShopperContext` with zod. Invalid → 400.
- Resolves product and collection handles in `page` and `history` to titles through the Storefront API. A handle that no longer exists is skipped; resolution never fails the request.
- Renders one system-prompt block via `prompts/context.ts`, for example: shopper is shopping from IT; is on the collection "Serums"; recently viewed "Vitamin C Serum", "Night Cream"; searched "retinol".
- History is never written to the database.

The agent's current `marketPrompt` and `pagePrompt` are replaced by this block.

## Teasers

### When

- Only when `page.type` is `product`, `collection` or `search`, the panel is closed, and 3 seconds have passed since load.
- Hidden as soon as the panel opens.

### Generation

- `POST /apps/chat-cart/teasers` with `{ conversationId, context: ShopperContext }`.
- The server builds the teaser input from:
  - the resolved shopper context (the same module as the agent);
  - the current page in detail: product → full product details; collection → title, description, first products; search → terms and top matching products;
  - the last 10 messages of the conversation as plain text, tool outputs dropped.
- One `generateText` call with structured output: exactly 3 messages, each at most 50 characters, first person, in the shopper's language. Retried up to 3 times on schema failure, like suggestions.
- Prompt intent: anticipate the shopper's next question before they think of it. Each teaser is specific, tying the current page to their history and chat (for example "Does this serum go with the retinol I viewed?"). The three take different angles. Each must be answerable from store data or policy pages.
- No caching: context changes on every load.

### Display

- Three stacked bubbles above the launcher, in the user-bubble style. One close button dismisses all three for this page load.
- Tapping one opens the panel and sends its text as a user message with `teaser: true`. The teaser-turn prompt is generalized from product to page: answer exactly this message, about the current page.

### Failure

- Any error or timeout: no teasers, nothing visible.

## Admin

- One page: the funnel. The color editor, preview, `theme.server.ts`, `shared/theme.ts`, the app metafield and the liquid `style` attribute are deleted.
- Funnel steps: loads → opened → engaged (sent a message) → clicked through (`product_clicked`). Teaser shown and teaser clicked counts are shown alongside.

## Events

Kept or added:

| Event | Data |
| --- | --- |
| `widget_opened` | — |
| `suggestion_clicked` | `{ text }` |
| `teaser_shown` | `{ count }` |
| `teaser_clicked` | `{ text }` |
| `teaser_dismissed` | — |
| `product_clicked` | `{ handle }` |
| `link_clicked` | `{ url }` |

Removed: `added_to_cart`, `checkout_clicked`, `product_liked`. The Prisma schema is unchanged; `Event.data` is already JSON.

## Code structure

```
shared/
  tools.ts        every tool: name, kind (data | display), input and output zod schemas, typing-label key
  context.ts      ShopperContext schema and types
  chat.ts         ChatMessage type built from tools.ts schemas, event schema
  product.ts      ProductSummary type

app/
  agent/
    agent.server.ts        runAgent, streamReply
    history.ts             trimHistory; drop list derived from tools.ts
    context.server.ts      resolve ShopperContext, render prompt block
    suggestions.server.ts  generateSuggestions
    teasers.server.ts      generateTeasers
    tools.server.ts        execute functions, typed against tools.ts
    storefront.server.ts   Storefront queries, plus collection and search
    prompts/               system.ts, suggestions.ts, teasers.ts, context.ts
  routes/
    proxy.chat.tsx, proxy.teasers.tsx, proxy.events.tsx
    app._index.tsx         loader and page
  components/Funnel.tsx
  conversations.server.ts, metrics.server.ts

chat-widget/src/
  main.tsx                  read data attributes, record visit, mount
  context.ts                build ShopperContext, visit history
  api.ts                    transport, conversation, events, teasers
  App.tsx                   composes hooks and Panel
  hooks/useChatSession.ts   useChat, send, busy, suggestions
  hooks/useTeasers.ts       fetch, delay, show, click, dismiss
  hooks/useLinkTracking.ts  click capture to event
  turns.ts                  groupTurns, greeting, typingLabel
  parts/                    index.ts (display map), ProductCards.tsx, FaqCard.tsx
  components/               Panel, Launcher, Composer, Message, Suggestions, Teasers, Price
```

### Coupling rules

- `shared/` imports nothing from `app/` or `chat-widget/`.
- Every tool is named once in `shared/tools.ts`. The history drop list, typing labels, `stopWhen` and the display map derive from it.
- The widget display map is typed `Record<DisplayTool, Component>`; `tools.server.ts` builds its tools against the same names with `satisfies`. A missing component or `execute` is a typecheck error.
- Adding a display tool: an entry in `tools.ts`, its `execute`, its component, a line in the system prompt. The compiler enforces the first three.
- Prompts are plain functions of their inputs. No prompt text in agent code.

### Removed

`cart.ts`, `CartCard`, `CheckoutBar`, `ProductCard` (picker), `ProductMedia`, `preview/`, `showCart`, the add-on flow, variant-picking helpers in `shared/product.ts`, page-push and drawer CSS, `theme.server.ts`, `shared/theme.ts`, the admin color editor, cart eval scenarios.

### Unchanged

Auth and app proxy plumbing, the Prisma schema, `conversations.server.ts`, `storefront.server.ts` internals beyond the new collection and search queries.

## Phases

1. **Cut.** Remove the cart path, color editor, page push and picker card. Add `showProducts` link cards and the floating overlay panel. Rewrite the system and suggestions prompts for the assistant role. Remove cart eval scenarios; add "cart question gets a text reply". Update the funnel. Take the eval baseline.
2. **Restructure.** Move to the layout above, with `shared/tools.ts` as the single source of tool names. Split `App.tsx` and the agent. Behavior identical to the end of phase 1; evals match the baseline.
3. **Shopper context.** Page types and visit history in the widget; `ShopperContext` on every chat request; context prompt block replaces market and page prompts. New evals: the agent uses the current page and history.
4. **Teasers.** Endpoint, generation, display, events, funnel counts. New evals on teaser output: three items, length limit, specific to the current page.

## Verification

- Every step: `npm run typecheck`, `npm run lint`, widget build, `npm run build`.
- Add vitest for pure units only: `trimHistory`, visit recording and dedupe, context to prompt block, display-map completeness. No component tests.
- Evals as listed per phase.
- Manual check on the dev store: overlay on desktop and mobile, product click-through, teasers on product, collection and search pages and none on home or cart, history visible in the agent's answers.

## Error handling

- Teasers fail silently.
- Context resolution skips unknown handles and never fails a request.
- Malformed context in a request returns 400.
- Existing behavior kept: suggestions retry 3 times; the widget retries loading without a conversation id once.
