# v1 Shopping Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the chat widget into a shopping assistant that never touches the cart, sends shoppers to product pages, knows their page and recent visits, and shows three context-aware teasers — on a codebase where every tool is named once and the compiler catches missing pieces.

**Architecture:** Four phases on `develop`: cut the cart path and theme coupling, restructure survivors around `shared/tools.ts`, add a `ShopperContext` sent with every request, then build teasers v2 on top of it. The app works at the end of each phase.

**Tech Stack:** React Router 7 Shopify app, Vercel AI SDK (`ai` v7, `@ai-sdk/react`), zod 4, Prisma/SQLite, React 18 widget built by Vite as an IIFE into a theme app extension, vitest (added in Task 1).

**Spec:** `docs/superpowers/specs/2026-10-15-v1-assistant-design.md`

## Global Constraints

- No code reads or writes the cart. No CSS selector targets theme markup. Only style outside `#chat-cart-root`: mobile `overflow: hidden` on `<html>` while the panel is open.
- `shared/` imports nothing from `app/` or `chat-widget/` (from Task 5 on).
- Every tool named once, in `shared/tools.ts` (from Task 5 on).
- Prompts live in `app/agent/prompts/` as plain functions or constants (from Task 6 on).
- History: at most 10 visits, key `chat-cart:history`, never written to the DB.
- Teasers: exactly 3, each at most 50 characters, distinct, only on `product`, `collection`, `search` pages, 3000 ms after load, panel closed.
- `showProducts`: 1 to 4 handles.
- zod limits: handle ≤ 200, search terms ≤ 200, country ≤ 10, language ≤ 20, history ≤ 10 items, chat text 1–2000.
- After every task: `npm run typecheck`, `npm run lint`, `npm test` (from Task 1), `npm run widget:build`, `npm run build` all pass; prettier on changed files.
- Commits use conventional prefixes and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Corrupt or old-format `chat-cart:history` in localStorage (bad JSON, wrong shape, more than 10 items) → history read as empty or trimmed, never a crash. Test in Task 8.
2. A product or collection in `page` or `history` deleted from the store → skipped in the prompt block, request succeeds. Test in Task 9.
3. A product with no images or no available variant in `showProducts` → card with placeholder and the first variant's price. Test in Task 1.
4. Teaser model output with a duplicate, a fourth item or a 60-character teaser → rejected by the schema and retried; after 3 failures the endpoint returns no teasers. Test in Task 10.
5. Teaser request with an unknown or missing conversation id → teasers generated with empty chat context, not a 404. Test in Task 10.

---

## Phase 1: Cut

### Task 1: Link product cards replace picker cards and cart

**Files:**
- Modify: `package.json` (add `vitest` dev dependency, script `"test": "vitest run"`)
- Modify: `shared/product.ts` (keep `Money`; add `ProductSummary`, `toProductSummary`; delete variant-picking helpers, `Product`, `ProductVariant`, `SelectedOption`, `ProductOption` only if no longer imported — `storefront.server.ts` still uses `ProductOption` and `sameText`, keep those)
- Test: `shared/product.test.ts`
- Modify: `app/agent/tools.server.ts` (replace `showProductCard`, `showProductCards`, `showCart` with `showProducts`; delete `buildProductCard`, `optionsSchema`)
- Modify: `shared/chat.ts` (events, `COMPONENT_ACTIONS`)
- Create: `chat-widget/src/urls.ts` (`ROOT`, `productUrl`, `localUrl` moved from `cart.ts`)
- Delete: `chat-widget/src/cart.ts`, `components/CartCard.tsx`, `components/CheckoutBar.tsx`, `components/ProductCard.tsx`, `components/ProductMedia.tsx`
- Modify: `chat-widget/src/components/ProductCards.tsx`, `components/Message.tsx`, `App.tsx`, `locales/en.json`, `locales/it.json`, `styles.css` (drop rules for deleted components), `icons.tsx` (drop unused icons)
- Modify: `app/agent/agent.server.ts` (`trimHistory` strips `showProducts` image only — no variants exist anymore)

**Interfaces:**
- Produces:
  - `type ProductSummary = { handle: string; title: string; image: { url: string; alt: string | null } | null; price: Money; compareAtPrice: Money | null }`
  - `toProductSummary(product: NonNullable<Awaited<ReturnType<typeof getProduct>>>): ProductSummary` — lives in `shared/product.ts`, so type its parameter structurally: `{ handle; title; images: { url; alt }[]; variants: { price: Money; compareAtPrice: Money | null; available: boolean; imageUrl: string | null }[] }`.
  - Tool `showProducts`, input `{ handles: string[] }` (min 1, max 4), output `{ products: ProductSummary[] }`.
  - `chat-widget/src/urls.ts`: `ROOT: string`, `productUrl(handle: string): string`, `localUrl(path: string): string`.
  - Event union now: `widget_opened`, `suggestion_clicked {text}`, `teaser_shown`, `teaser_clicked`, `teaser_dismissed`, `product_clicked {handle}`, `link_clicked {url}` (Task 11 adds data to the teaser events).
  - `COMPONENT_ACTIONS = { showProducts: "product_clicked", showFaqCard: "link_clicked" }`.

- [ ] **Step 1: Install vitest and add the `test` script**

Run: `npm install -D vitest@^3` then add `"test": "vitest run"` to `package.json`.

- [ ] **Step 2: Write the failing tests in `shared/product.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { toProductSummary } from "./product";

const money = (amount: string) => ({ amount, currencyCode: "EUR" });
const variant = (over = {}) => ({
  price: money("20.00"),
  compareAtPrice: null,
  available: true,
  imageUrl: null,
  ...over,
});

describe("toProductSummary", () => {
  it("uses the first available variant's price and image", () => {
    const summary = toProductSummary({
      handle: "serum",
      title: "Serum",
      images: [{ url: "a.jpg", alt: "A" }],
      variants: [
        variant({ available: false, price: money("10.00") }),
        variant({ price: money("30.00"), compareAtPrice: money("40.00"), imageUrl: "v.jpg" }),
      ],
    });
    expect(summary).toEqual({
      handle: "serum",
      title: "Serum",
      image: { url: "v.jpg", alt: "A" },
      price: money("30.00"),
      compareAtPrice: money("40.00"),
    });
  });

  it("falls back to the first variant and the first image", () => {
    const summary = toProductSummary({
      handle: "x",
      title: "X",
      images: [{ url: "a.jpg", alt: null }],
      variants: [variant({ available: false, price: money("5.00") })],
    });
    expect(summary.price).toEqual(money("5.00"));
    expect(summary.image).toEqual({ url: "a.jpg", alt: null });
  });

  it("has no image when the product has none", () => {
    const summary = toProductSummary({ handle: "x", title: "X", images: [], variants: [variant()] });
    expect(summary.image).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests, expect failure**

Run: `npm test` — Expected: FAIL, `toProductSummary` is not exported.

- [ ] **Step 4: Implement `ProductSummary` and `toProductSummary` in `shared/product.ts`**

Variant = first `available`, else `variants[0]`. Image = variant `imageUrl` with the product's first image alt, else first product image, else `null`. Delete `findVariant`, `defaultOptions`, `withPick`, `isOptionValueAvailable`, `hasOption`, `matchesAll`, `Product`, `ProductVariant`, `ProductImage`, `SelectedOption` once nothing imports them.

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test` — Expected: 3 passed.

- [ ] **Step 6: Replace display tools in `app/agent/tools.server.ts`**

`showProducts` description: "Show the shopper one to four products, by their handles, best first, each with its photo and price, linking to its page. Ends your reply: write your sentences first." Execute: `getProduct` each handle, skip `null`, map with `toProductSummary`, throw if none left. Delete `showProductCard`, `showProductCards`, `showCart`. In `agent.server.ts`, `trimHistory` replaces each `showProducts` output image with `null`.

- [ ] **Step 7: Rebuild the widget around link cards**

- `ProductCards.tsx`: props `{ products: ProductSummary[] }`; each card is one `<a href={productUrl(handle)}>` holding image (or placeholder), title and `ProductPrice`. No button. Carousel logic stays.
- `Message.tsx`: `PartContext` deleted; cases `tool-showProducts` → `ProductCards`, `tool-showFaqCard` → `FaqCard`.
- `App.tsx`: delete `useCart`, `add`, `like`, `CheckoutBar`, `bar` prop usage. `followLink` records `product_clicked {handle}` when the href is a product URL (`/products/<handle>`), else `link_clicked {url}`; drop the `checkout_clicked` branch (Task 3 removes the navigation takeover).
- `Panel.tsx`: drop the `bar` prop.
- Locales: remove `liked`, `added`, `cartEmpty`, `checkout`, `checkoutButton`, `cartCount`, `inCart`, `soldOut`, `adding`, `tryAgain`, `addToCart`, `iLikeThis`, `previousImage`, `nextImage`; keep `seeProduct` only if used.
- Delete files listed above and their CSS blocks and unused icons.

- [ ] **Step 8: Verify**

Run: `npm run typecheck && npm run lint && npm test && npm run widget:build && npm run build` — Expected: all pass. `grep -rn "cart" chat-widget/src app shared --include=*.ts --include=*.tsx -i` shows no cart reads or writes (prompt text is fixed in Task 2).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: replace product picker and cart with product link cards"
```

### Task 2: Assistant prompts and evals

**Files:**
- Modify: `app/agent/prompts.ts` (`SYSTEM_PROMPT`, `SUGGESTIONS_PROMPT`)
- Modify: `evals/checks.ts`, `evals/scenarios.ts`, `evals/run.ts`

**Interfaces:**
- Consumes: tool `showProducts` from Task 1.
- Produces: eval baseline file in `evals/results/` used by Task 7.

- [ ] **Step 1: Update eval checks**

`checks.ts`: `PRODUCT_OR_CART` → `const PRODUCTS = ["showProducts"]`; rename the checks "products come with text" and "no question when showing products"; `shownProducts` reads `(output as { products: ProductSummary[] }).products` for `showProducts`; `no internals` regex uses `show\w*` (covers `showProducts`).

- [ ] **Step 2: Update scenarios**

- Every `shows("showProductCard"…)` / `shows("showProductCards"…)` → `shows("showProducts"…)`.
- `like` scenario second turn becomes `"show me the Caffeine Eye Elixir"` expecting `shows("showProducts", ["caffeine-eye-elixir"])`.
- Delete `added-to-cart`.
- `cart`: `turns: [{ user: "what's in my cart?", expect: [showsNothing(), says(/cart/i)] }]`.
- Add `checkout`: `"how do I check out?"` expecting `showsNothing()`.

- [ ] **Step 3: Rewrite `SYSTEM_PROMPT` for the assistant role**

Keep the structure (reply contract, shape order, writing rules, facts and honesty, tool use). Changes the spec pins:
- Goal: help the shopper find the right product and get to its page; never sell beyond that.
- Display tools: `showProducts` and `showFaqCard` only. Shapes: text; text then one `showProducts` (1 to 4 products, best first); `showFaqCard` alone.
- Delete shape rules 5 (added to cart), 6 (cart) and the cart half of 7; new rule: cart, checkout or order questions get one sentence saying the assistant can't see the cart, then what it can help with. Text only.
- "Moving toward the purchase" becomes "moving toward the right product": explore → short list → favorite → open its page. Products shown end with an invitation to open the favorite's page.
- Remove every mention of options picking, adding to cart, add-ons and checkout; remove the "pass the options" paragraph.

- [ ] **Step 4: Rewrite `SUGGESTIONS_PROMPT`**

Merge "showed several products" and "showed one product" into "showed products": one asks which suits a need I mentioned, one asks a detail about a product by name, one asks for something different or cheaper. Drop the cart bullet. Rule "never something I do with a button" becomes "never opening a product page or checking out".

- [ ] **Step 5: Run evals and save the baseline**

Run: `npm run eval -- --runs 3` — Expected: every scenario runs to completion; record the pass rate per scenario in the commit message body. Fix prompt wording until pass rate is at least the last saved result for scenarios that still exist.

- [ ] **Step 6: Commit**

```bash
git add app/agent/prompts.ts evals
git commit -m "feat: rewrite agent prompts for the assistant role"
```

### Task 3: Floating overlay panel and plain link navigation

**Files:**
- Modify: `chat-widget/src/styles.css` (panel rules lines 23–60 and the two media blocks at 222–300)
- Modify: `chat-widget/src/App.tsx` (`followLink` → tracking only)
- Delete: `CLOSE_DELAY` constant

**Interfaces:**
- Produces: `.cc-panel` floating card at every width; no rule mentions `html` except the mobile scroll lock; no `.theme-drawer__dialog`.

- [ ] **Step 1: Make the floating card the base panel**

Move the `max-width: 480px` `.cc-panel` card rules (position bottom-right above launcher, radius, shadow, clip-path open animation) into the base `.cc-panel` with `width: 400px; height: 640px; max-width: calc(100vw - 40px); max-height: calc(var(--cc-viewport-height, 100dvh) - 108px)`. Keep in the `max-width: 480px` block only: backdrop, `html:has(...) { overflow: hidden }`, and `width: 720px` override if still wanted (keep today's mobile size). Delete the whole `min-width: 481px` page-push and drawer block; keep its `.cc-launcher[data-open="true"]` hide rule only if the launcher should hide on desktop — it should not, since the card sits above the launcher: delete it. Delete `.cc-preview` references (preview goes in Task 4).

- [ ] **Step 2: Make link clicks tracking-only**

`followLink` keeps the event logic from Task 1 and returns; remove modifier checks, `preventDefault`, `setOpen(false)` and `setTimeout`. Rename to `trackLink`.

- [ ] **Step 3: Verify**

Run the standard checks. `grep -n "theme-drawer\|margin-right" chat-widget/src/styles.css` — Expected: no output. Manual on the dev store (`npm run dev`): desktop panel floats bottom-right over the page without moving it; mobile unchanged; tapping a product card navigates and records `product_clicked` (check the `Event` table).

- [ ] **Step 4: Commit**

```bash
git add chat-widget/src
git commit -m "feat: float the chat panel over the page and follow links natively"
```

### Task 4: Remove the color editor, funnel for the assistant

**Files:**
- Delete: `app/theme.server.ts`, `shared/theme.ts`, `chat-widget/src/preview/`
- Modify: `extensions/chat-widget/blocks/chat_widget.liquid` (drop `widget_theme` assign and `style` attribute)
- Create: `app/components/Funnel.tsx` (the `WidgetFunnel` component moved out of `app._index.tsx`)
- Modify: `app/routes/app._index.tsx` (loader returns `{ funnel }`; no action; page renders `<Funnel>`)
- Modify: `app/metrics.server.ts`
- Test: `app/metrics.test.ts`

**Interfaces:**
- Produces:
  - `type FunnelCounts = { loads: number; opened: number; engaged: number; clickedThrough: number; teaserShown: number; teaserClicked: number }`
  - `countFunnel(conversations: { messages: { role: string }[]; events: { type: string }[] }[]): FunnelCounts` (pure)
  - `getFunnelCounts(shop: string): Promise<FunnelCounts>` uses `countFunnel`.

- [ ] **Step 1: Write the failing test `app/metrics.test.ts`**

```ts
import { expect, it } from "vitest";
import { countFunnel } from "./metrics.server";

it("counts each conversation once per step", () => {
  const c = (roles: string[], types: string[]) => ({
    messages: roles.map((role) => ({ role })),
    events: types.map((type) => ({ type })),
  });
  expect(
    countFunnel([
      c([], []),
      c(["user", "assistant"], ["widget_opened", "widget_opened"]),
      c(["user"], ["widget_opened", "product_clicked", "product_clicked"]),
      c([], ["teaser_shown", "teaser_clicked"]),
    ]),
  ).toEqual({ loads: 4, opened: 2, engaged: 2, clickedThrough: 1, teaserShown: 1, teaserClicked: 1 });
});
```

- [ ] **Step 2: Run, expect failure** — `npm test`: FAIL, `countFunnel` not exported.

- [ ] **Step 3: Implement `countFunnel`, use it in `getFunnelCounts`**

- [ ] **Step 4: Run, expect pass** — `npm test`.

- [ ] **Step 5: Remove the color editor and update the admin page**

Move `WidgetFunnel` to `app/components/Funnel.tsx` as default export `Funnel({ funnel }: { funnel: FunnelCounts })`, bars: Loads, Opened, Engaged, Clicked through; teaser shown and teaser clicked as two plain numbers under the bars. Delete `ThemeEditor`, `COLOR_GROUPS`, the action, `links` for widget CSS, and the files listed above. The app metafield is left in the store; nothing reads it.

- [ ] **Step 6: Verify** — standard checks; `grep -rn "theme.server\|shared/theme\|preview" app chat-widget/src extensions` returns nothing.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: drop widget color editor and count click-throughs in the funnel"
```

## Phase 2: Restructure

Behavior identical to the end of Phase 1. No prompt text changes.

### Task 5: Single tool list in `shared/tools.ts`

**Files:**
- Create: `shared/tools.ts`
- Modify: `shared/chat.ts` (no import from `app/`)
- Create: `app/agent/history.ts` (`trimHistory`, `MAX_HISTORY = 20`, moved from `agent.server.ts`)
- Test: `app/agent/history.test.ts`
- Modify: `app/agent/tools.server.ts`, `app/agent/agent.server.ts`, `chat-widget/src/App.tsx` (`TOOL_LABELS` deleted), `evals/checks.ts` (`DATA_TOOLS` imported), `evals/run.ts`

**Interfaces:**
- Produces in `shared/tools.ts`:
  - `TOOLS` — `as const` record keyed by tool name; each entry `{ kind: "data" | "display"; label: "lookingUpProducts" | "checkingStore" | "typing"; input: ZodType; output?: ZodType }` (`output` only on display tools).
    - data: `listProducts`, `listCollections`, `getProduct` (label `lookingUpProducts`), `listStorePages`, `getStorePage` (label `checkingStore`), inputs moved verbatim from `tools.server.ts`.
    - display: `showProducts` (input `{ handles: string[] }` min 1 max 4, output `{ products: ProductSummary[] }` as zod), `showFaqCard` (input `{ handle, answer }`, output `{ title, answer, url }`), label `typing`.
  - `type ToolName = keyof typeof TOOLS`; `type DataTool`, `type DisplayTool` (filtered by `kind`); `DATA_TOOLS: DataTool[]`; `DISPLAY_TOOLS: DisplayTool[]`.
  - `type ChatTools = { [K in ToolName]: { input: z.infer<(typeof TOOLS)[K]["input"]>; output: K extends DisplayTool ? z.infer<output schema> : unknown } }`.
- `shared/chat.ts`: `ChatMessage = UIMessage<never, { suggestions: string[] }, ChatTools>`; `COMPONENT_ACTIONS: Record<DisplayTool, ChatEvent["type"]>`; `COMPONENT_TOOLS` deleted (use `DISPLAY_TOOLS`).
- `tools.server.ts`: `createTools(...)` returns an object built with `satisfies { [K in ToolName]: Tool<...> }` using `TOOLS[name].input` as `inputSchema`; descriptions stay here.
- `history.ts`: `trimHistory(messages: ChatMessage[]): ChatMessage[]`, drops parts whose tool is in `DATA_TOOLS`.

- [ ] **Step 1: Write the failing tests `app/agent/history.test.ts`**

```ts
import { expect, it } from "vitest";
import { trimHistory } from "./history";

const user = (id: string) => ({ id, role: "user" as const, parts: [{ type: "text" as const, text: id }] });

it("drops data tool parts and keeps display parts without images", () => {
  const assistant = {
    id: "a",
    role: "assistant" as const,
    parts: [
      { type: "tool-listProducts", toolCallId: "1", state: "output-available", input: {}, output: [] },
      { type: "text", text: "Here" },
      {
        type: "tool-showProducts", toolCallId: "2", state: "output-available", input: { handles: ["x"] },
        output: { products: [{ handle: "x", title: "X", image: { url: "u", alt: null }, price: { amount: "1", currencyCode: "EUR" }, compareAtPrice: null }] },
      },
    ],
  };
  const [, trimmed] = trimHistory([user("u1"), assistant] as never);
  expect(trimmed.parts.map((p) => p.type)).toEqual(["text", "tool-showProducts"]);
  expect((trimmed.parts[1] as any).output.products[0].image).toBeNull();
});

it("keeps at most 20 messages and starts at a user message", () => {
  const messages = Array.from({ length: 25 }, (_, i) => user(`u${i}`));
  const trimmed = trimHistory(messages as never);
  expect(trimmed).toHaveLength(20);
  expect(trimmed[0].id).toBe("u5");
});
```

- [ ] **Step 2: Run, expect failure** — `npm test`: FAIL, module `./history` not found.

- [ ] **Step 3: Create `shared/tools.ts`, move `trimHistory` to `history.ts`, rewire**

`agent.server.ts`: `stopWhen: [isStepCount(10), hasToolCall(...DISPLAY_TOOLS)]`. Widget `typingLabel` reads `TOOLS[tool].label`, falling back to `"typing"` for unknown names. `evals/checks.ts` imports `DATA_TOOLS`; `evals/run.ts` uses `DISPLAY_TOOLS` in place of `COMPONENT_TOOLS`.

- [ ] **Step 4: Run, expect pass** — `npm test`.

- [ ] **Step 5: Prove the compiler catches a missing tool**

Temporarily delete `showFaqCard` from `createTools`; run `npm run typecheck` — Expected: FAIL naming `showFaqCard`. Restore. `grep -rn "from \"../app\|from \"../../app\|chat-widget" shared/` — Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: name every tool once in shared/tools"
```

### Task 6: Split agent modules and prompts

**Files:**
- Create: `app/agent/suggestions.server.ts` (`generateSuggestions`, schema, retry — moved verbatim)
- Create: `app/agent/teasers.server.ts` (current `generateTeaser`, moved verbatim; rewritten in Task 10)
- Create: `app/agent/prompts/system.ts`, `prompts/suggestions.ts`, `prompts/teasers.ts`, `prompts/context.ts` (holds `marketPrompt`, `pagePrompt`, `teaserTurnPrompt` until Task 9), `prompts/index.ts` re-exporting all
- Delete: `app/agent/prompts.ts`
- Modify: `app/agent/agent.server.ts` (keeps `MODEL`, `DEBUG`, `runAgent`, `streamReply`), `app/routes/proxy.teaser.tsx`, `evals/run.ts`

**Interfaces:**
- Produces: `MODEL` exported from `agent.server.ts` → move to `app/agent/model.ts` as `export const MODEL = "deepseek/deepseek-v4.1-flash"` so the three server modules import it without cycles.
- Unchanged signatures: `generateSuggestions(messages: ModelMessage[]): Promise<string[]>`, `generateTeaser(product, language): Promise<string>`, `runAgent(...)`, `streamReply(...)`.

- [ ] **Step 1: Move code, no edits to bodies or prompt text**

- [ ] **Step 2: Verify** — standard checks; `git diff --stat` shows only moves plus import lines; `grep -n "\`" app/agent/agent.server.ts` shows no prompt text (only log template strings).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: split agent into suggestions, teasers and prompts modules"
```

### Task 7: Split the widget

**Files:**
- Create: `chat-widget/src/turns.ts` (`groupTurns`, `greeting`, `typingLabel`)
- Test: `chat-widget/src/turns.test.ts`
- Create: `chat-widget/src/hooks/useChatSession.ts`, `hooks/useTeasers.ts` (today's single-teaser logic moved verbatim), `hooks/useLinkTracking.ts`
- Create: `chat-widget/src/parts/index.ts`, move `components/ProductCards.tsx` and `components/FaqCard.tsx` to `parts/`
- Modify: `chat-widget/src/App.tsx`, `components/Message.tsx`

**Interfaces:**
- Produces:
  - `groupTurns(messages: ChatMessage[]): ChatMessage[][]`, `greeting(): ChatMessage`, `typingLabel(message: ChatMessage | undefined): string`.
  - `useChatSession(): { conversation; loadFailed; messages; status; error; busy: boolean; suggestions: string[] | undefined; send(text: string, options?: { teaser?: boolean }): void; trackEvent(event: ChatEvent): void }`.
  - `useTeasers({ open, conversationId, trackEvent, onPick }): { teaser: string | undefined; click(): void; dismiss(): void }` (returns an array in Task 11).
  - `useLinkTracking(trackEvent): (event: React.MouseEvent) => void`.
  - `parts/index.ts`: `PARTS: { [K in DisplayTool]: (props: { output: ChatTools[K]["output"] }) => JSX.Element }`. `Message.tsx` renders `text` parts and, for `tool-<name>` parts in `output-available` state whose name is a `DisplayTool`, `PARTS[name]`.

- [ ] **Step 1: Write the failing tests `turns.test.ts`**

```ts
import { expect, it } from "vitest";
import { groupTurns, typingLabel } from "./turns";

it("starts a turn at every user message", () => {
  const m = (id: string, role: "user" | "assistant") => ({ id, role, parts: [] });
  expect(groupTurns([m("g", "assistant"), m("u1", "user"), m("a1", "assistant"), m("u2", "user")] as never)
    .map((turn) => turn.map((x) => x.id))).toEqual([["g"], ["u1", "a1"], ["u2"]]);
});

it("labels the running data tool", () => {
  const message = { id: "a", role: "assistant", parts: [{ type: "tool-getStorePage", state: "input-available", toolCallId: "1", input: {} }] };
  expect(typingLabel(message as never)).toBe("Checking store info");
});
```

- [ ] **Step 2: Run, expect failure** — `npm test`: FAIL, `./turns` not found.

- [ ] **Step 3: Move code into the files above; `App.tsx` only composes hooks and `Panel`**

- [ ] **Step 4: Run, expect pass** — `npm test`.

- [ ] **Step 5: Phase 2 checkpoint**

Run: `npm run eval -- --runs 3` — Expected: pass rate per scenario matches the Task 2 baseline (±1 run per scenario). Manual on the dev store: send a message, see typing label, product cards, FAQ card, suggestions, single teaser on a product page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: split widget into hooks, turns and display parts"
```

## Phase 3: Shopper context

### Task 8: Page context and visit history in the widget

**Files:**
- Create: `shared/context.ts`
- Test: `shared/context.test.ts`
- Create: `chat-widget/src/context.ts`
- Test: `chat-widget/src/context.test.ts`
- Modify: `extensions/chat-widget/blocks/chat_widget.liquid`, `chat-widget/src/main.tsx`, `chat-widget/src/api.ts` (`setMarket`, `setPageContext`, `getPageContext` replaced)

**Interfaces:**
- Produces in `shared/context.ts` (zod schemas and inferred types, limits from Global Constraints):
  - `pageContextSchema` / `PageContext` = `{ type: "product"; handle } | { type: "collection"; handle } | { type: "search"; terms } | { type: "other" }`
  - `visitSchema` / `Visit` = `PageContext & { at: number }` (only the three informative types)
  - `shopperContextSchema` / `ShopperContext` = `{ country; language; page: PageContext; history: Visit[] }`
  - `samePage(a: PageContext, b: PageContext): boolean`
- Produces in `chat-widget/src/context.ts`:
  - `pageFromDataset(dataset: DOMStringMap): PageContext` — reads `data-page-type`, `data-product-handle`, `data-collection-handle`, `data-search-terms`.
  - `addVisit(history: Visit[], page: PageContext, at: number): Visit[]` — pure; ignores `other`; collapses when `samePage` with the last visit (updates `at`); keeps last 10.
  - `readHistory(storage: Storage | undefined): Visit[]` — parses `chat-cart:history`, validates with `z.array(visitSchema)`, returns `[]` on any failure, last 10 only.
  - `recordVisit(page: PageContext): void` — read, `addVisit`, write; all storage access in try/catch. History sent excludes the current page: `recordVisit` stores the history as it was *before* this page under a module variable, then writes the new one.
  - `setShopperContext({ country, language, page })`, `getShopperContext(): ShopperContext`.
- Liquid root attributes: `data-page-type="{{ request.page_type }}" data-product-handle="{{ product.handle | escape }}" data-collection-handle="{{ collection.handle | escape }}" data-search-terms="{{ search.terms | escape }}"`.

- [ ] **Step 1: Write the failing tests**

`shared/context.test.ts`:
```ts
it("rejects search terms over 200 characters", () => {
  expect(pageContextSchema.safeParse({ type: "search", terms: "x".repeat(201) }).success).toBe(false);
});
it("rejects more than 10 history items", () => {
  const visit = { type: "product", handle: "a", at: 1 };
  expect(shopperContextSchema.safeParse({ country: "IT", language: "it", page: { type: "other" }, history: Array(11).fill(visit) }).success).toBe(false);
});
```

`chat-widget/src/context.test.ts`:
```ts
const p = (handle: string) => ({ type: "product" as const, handle });
it("collapses a repeat of the last visit", () => {
  expect(addVisit([{ ...p("a"), at: 1 }], p("a"), 2)).toEqual([{ ...p("a"), at: 2 }]);
});
it("ignores other pages", () => {
  expect(addVisit([], { type: "other" }, 1)).toEqual([]);
});
it("keeps the last 10", () => {
  let h: Visit[] = [];
  for (let i = 0; i < 12; i++) h = addVisit(h, p(`h${i}`), i);
  expect(h.map((v) => (v as any).handle)).toEqual(["h2","h3","h4","h5","h6","h7","h8","h9","h10","h11"]);
});
it("reads corrupt storage as empty", () => {
  const storage = { getItem: () => "{not json" } as unknown as Storage;
  expect(readHistory(storage)).toEqual([]);
  const wrong = { getItem: () => JSON.stringify([{ type: "product" }]) } as unknown as Storage;
  expect(readHistory(wrong)).toEqual([]);
  expect(readHistory(undefined)).toEqual([]);
});
it("maps page type data attributes", () => {
  expect(pageFromDataset({ pageType: "collection", collectionHandle: "serums" })).toEqual({ type: "collection", handle: "serums" });
  expect(pageFromDataset({ pageType: "search", searchTerms: "retinol" })).toEqual({ type: "search", terms: "retinol" });
  expect(pageFromDataset({ pageType: "index" })).toEqual({ type: "other" });
  expect(pageFromDataset({ pageType: "product", productHandle: "" })).toEqual({ type: "other" });
});
```

- [ ] **Step 2: Run, expect failure** — `npm test`: FAIL, missing exports.

- [ ] **Step 3: Implement both modules; `main.tsx` calls `recordVisit(page)` then `setShopperContext` before mount**

- [ ] **Step 4: Run, expect pass** — `npm test`.

- [ ] **Step 5: Verify** — standard checks. Manual: browse two products and a collection, then in DevTools `localStorage.getItem("chat-cart:history")` holds them, newest last.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: record page context and recent visits in the widget"
```

### Task 9: Shopper context in every agent request

**Files:**
- Create: `app/agent/context.server.ts`
- Test: `app/agent/context.test.ts`
- Modify: `app/agent/prompts/context.ts` (replace `marketPrompt`, `pagePrompt`; generalize `teaserTurnPrompt`)
- Modify: `app/agent/agent.server.ts`, `app/routes/proxy.chat.tsx`, `chat-widget/src/api.ts` (transport body), `evals/run.ts`, `evals/scenarios.ts`

**Interfaces:**
- Consumes: `ShopperContext`, `PageContext`, `Visit` from Task 8; `listProducts`, `listCollections` from `storefront.server.ts`.
- Produces:
  - `type Catalog = { products: { handle: string; title: string }[]; collections: { handle: string; title: string }[] }`
  - `loadCatalog(storefront, market: { country; language }): Promise<Catalog>`
  - `type ResolvedPage = { type: "product" | "collection"; handle: string; title: string } | { type: "search"; terms: string } | { type: "other" }`
  - `type ResolvedContext = { country: string; page: ResolvedPage; history: Exclude<ResolvedPage, { type: "other" }>[] }`
  - `resolveContext(context: ShopperContext, catalog: Catalog): ResolvedContext` — pure; unknown product/collection handles become `{ type: "other" }` for `page` and are dropped from `history`.
  - `contextPrompt(context: ResolvedContext): string` in `prompts/context.ts`.
  - `teaserTurnPrompt(page: ResolvedPage): string` — "answer exactly this message, about the current page".
  - `runAgent(messages: ChatMessage[], storefront, context: ShopperContext, teaser = false)` — calls `loadCatalog` + `resolveContext`; market for Storefront calls is `{ country: context.country, language: context.language }`. The forced first `listProducts` step applies when `context.page.type === "other"`.
  - Chat request body: `{ id: string; text: string; context: ShopperContext; teaser?: boolean }`.
  - Eval `Scenario.page?: PageContext`, `Scenario.history?: Visit[]`, `market` folded into a `context` built by the runner.

- [ ] **Step 1: Write the failing tests `app/agent/context.test.ts`**

```ts
const catalog = {
  products: [{ handle: "serum", title: "Vitamin C Serum" }],
  collections: [{ handle: "eyes", title: "Eye Care" }],
};
const base = { country: "IT", language: "it" };

it("resolves titles and drops unknown history handles", () => {
  const resolved = resolveContext({
    ...base,
    page: { type: "collection", handle: "eyes" },
    history: [
      { type: "product", handle: "gone", at: 1 },
      { type: "product", handle: "serum", at: 2 },
      { type: "search", terms: "retinol", at: 3 },
    ],
  }, catalog);
  expect(resolved.page).toEqual({ type: "collection", handle: "eyes", title: "Eye Care" });
  expect(resolved.history).toEqual([
    { type: "product", handle: "serum", title: "Vitamin C Serum" },
    { type: "search", terms: "retinol" },
  ]);
});

it("treats an unknown current page as other", () => {
  expect(resolveContext({ ...base, page: { type: "product", handle: "gone" }, history: [] }, catalog).page)
    .toEqual({ type: "other" });
});

it("names page, visits and searches in the prompt", () => {
  const prompt = contextPrompt({
    country: "IT",
    page: { type: "product", handle: "serum", title: "Vitamin C Serum" },
    history: [{ type: "search", terms: "retinol" }],
  });
  expect(prompt).toContain("IT");
  expect(prompt).toContain('"Vitamin C Serum"');
  expect(prompt).toContain('handle "serum"');
  expect(prompt).toContain('"retinol"');
});
```

- [ ] **Step 2: Run, expect failure** — `npm test`.

- [ ] **Step 3: Implement `context.server.ts` and `contextPrompt`**

`contextPrompt` keeps the market sentence from today's `marketPrompt` and the "this / it means the current product, look it up with getProduct using this handle" instruction from `pagePrompt`, extended to collections ("the products of this collection, via listProducts with collection filter") and search ("what they searched for"). Recent visits listed oldest to newest as titles; searches quoted. Tell the agent to use the history to understand interests, never to recite it.

- [ ] **Step 4: Run, expect pass** — `npm test`.

- [ ] **Step 5: Wire the request**

`proxy.chat.tsx` body schema uses `shopperContextSchema` (invalid → 400). Transport sends `{ id, text, context: getShopperContext(), teaser? }`. Delete `marketPrompt`, `pagePrompt`, `Market`, `PageContext` from `shared/chat.ts` and their uses (`storefront.server.ts` takes `{ country: string; language: string }`, name the type `Market` locally in `storefront.server.ts`).

- [ ] **Step 6: Update evals**

`runTurn` builds `ShopperContext` from scenario `market`, `page` (default `{ type: "other" }`) and `history` (default `[]`). Convert `page: "caffeine-eye-elixir"` to `{ type: "product", handle: "caffeine-eye-elixir" }`. Add scenarios:
- `collection-page`: page `{ type: "collection", handle: "gift-sets" }`, user `"what's good here for a friend?"`, expect `looksUp("listProducts", { collection: "gift-sets" })`, `shows("showProducts")`.
- `history`: history `[{ type: "product", handle: "caffeine-eye-elixir", at: 1 }, { type: "search", terms: "dark circles", at: 2 }]`, page other, user `"anything else for what I was looking at?"`, expect `shows("showProducts")` and `notShows("showProducts", ["caffeine-eye-elixir"])`.

- [ ] **Step 7: Verify** — standard checks; `npm run eval -- --runs 3`: Phase 2 scenarios hold their baseline; new scenarios pass at least 2 of 3.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: send shopper context with every agent request"
```

## Phase 4: Teasers

### Task 10: Teaser generation endpoint

**Files:**
- Modify: `app/agent/storefront.server.ts` (add `getCollection`, `searchProducts`)
- Modify: `app/agent/teasers.server.ts` (replace `generateTeaser` with `generateTeasers`)
- Modify: `app/agent/prompts/teasers.ts`
- Test: `app/agent/teasers.test.ts`
- Create: `app/routes/proxy.teasers.tsx`; Delete: `app/routes/proxy.teaser.tsx`
- Create: `evals/teasers.ts` and script `"eval:teasers": "node evals/index.ts teasers"` (extend `evals/index.ts` to pick the module from `argv[2]`, default `run`)

**Interfaces:**
- Consumes: `resolveContext`, `loadCatalog`, `ResolvedContext` (Task 9), `getProduct`, `loadMessages`, `MODEL`.
- Produces:
  - `getCollection(storefront, market, handle): Promise<{ title: string; description: string; products: { handle: string; title: string; description: string }[] } | null>` — first 8 products, descriptions cut to 150.
  - `searchProducts(storefront, market, terms): Promise<{ handle: string; title: string; description: string }[]>` — Storefront `search(query, first: 8, types: PRODUCT)`.
  - `teasersSchema = z.object({ teasers: z.array(z.string().trim().min(1).max(50)).length(3).refine(distinct ignoring case) })`
  - `conversationText(messages: ChatMessage[], limit = 10): string` — last `limit` messages, `"Shopper: …"` / `"Assistant: …"` lines from text parts only; display tool parts as `"Assistant showed: <titles>"`.
  - `type TeaserInput = { context: ResolvedContext; language: string; pageDetails: string; chat: string }`
  - `generateTeasers(input: TeaserInput): Promise<string[]>` — `generateText` with `Output.object({ schema: teasersSchema })`, `reasoning: "none"`, 3 attempts then throw.
  - `teasersPrompt(input: TeaserInput): string`.
  - `POST /apps/chat-cart/teasers` body `{ conversationId: string | null; context: ShopperContext }` → `{ teasers: string[] }`; 400 on invalid body; `{ teasers: [] }` when `page.type` is `other` or generation fails; unknown conversation id → empty chat.

- [ ] **Step 1: Write the failing tests `app/agent/teasers.test.ts`**

```ts
it("accepts three distinct short teasers", () => {
  expect(teasersSchema.safeParse({ teasers: ["a", "b", "c"] }).success).toBe(true);
});
it("rejects duplicates, a fourth item and teasers over 50 characters", () => {
  expect(teasersSchema.safeParse({ teasers: ["a", "A", "c"] }).success).toBe(false);
  expect(teasersSchema.safeParse({ teasers: ["a", "b", "c", "d"] }).success).toBe(false);
  expect(teasersSchema.safeParse({ teasers: ["a", "b", "x".repeat(51)] }).success).toBe(false);
});
it("renders the last messages as plain chat lines", () => {
  const messages = [
    { id: "1", role: "user", parts: [{ type: "text", text: "eye cream?" }] },
    { id: "2", role: "assistant", parts: [
      { type: "tool-listProducts", state: "output-available", toolCallId: "t", input: {}, output: [] },
      { type: "text", text: "Try these." },
      { type: "tool-showProducts", state: "output-available", toolCallId: "u", input: { handles: ["e"] },
        output: { products: [{ handle: "e", title: "Eye Elixir", image: null, price: { amount: "1", currencyCode: "EUR" }, compareAtPrice: null }] } },
    ] },
  ];
  expect(conversationText(messages as never)).toBe("Shopper: eye cream?\nAssistant: Try these.\nAssistant showed: Eye Elixir");
  expect(conversationText([])).toBe("");
});
```

- [ ] **Step 2: Run, expect failure** — `npm test`.

- [ ] **Step 3: Implement schema, `conversationText`, `generateTeasers`, Storefront queries**

- [ ] **Step 4: Write `teasersPrompt`**

Content the spec pins: the shopper's point of view; resolved page, recent visits, page details and chat as context; write the 3 messages the shopper is most likely to tap, anticipating the next question before they think of it; each specific to this page and, where they connect, to recent visits or the chat (example: "Does this serum go with the retinol I viewed?"); three different angles; each answerable from product data or store policy pages; first person; at most 50 characters; shopper's language; never invent facts not in the context.

- [ ] **Step 5: Run, expect pass** — `npm test`.

- [ ] **Step 6: Create the route**

`pageDetails`: product → title, description, options from `getProduct`; collection → `getCollection`; search → terms plus `searchProducts`. Wrap generation in try/catch → `{ teasers: [] }`. `loadMessages` returning `null` → `[]`.

- [ ] **Step 7: Teaser evals `evals/teasers.ts`**

`main(args)` runs `generateTeasers` (through the same input builder the route uses — export it from `teasers.server.ts` as `buildTeaserInput(storefront, context, messages): Promise<TeaserInput>`) for: product page with empty history; product page with history of another product and a search; collection page; search page. Checks per case: 3 teasers, ≤ 50 chars, distinct, at least one names a word from the page title or search terms (case-insensitive). Prints teasers and failures; exit code 1 on any failure.

- [ ] **Step 8: Verify** — standard checks; `npm run eval:teasers` passes; `npm run eval -- --runs 3` still at baseline (`teaser-priority` uses the new `teaserTurnPrompt`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: generate three context-aware teasers per page"
```

### Task 11: Three teasers in the widget

**Files:**
- Modify: `chat-widget/src/api.ts` (`fetchTeasers`)
- Modify: `chat-widget/src/hooks/useTeasers.ts`
- Rename: `components/Teaser.tsx` → `components/Teasers.tsx`
- Modify: `chat-widget/src/styles.css` (stacked bubbles), `shared/chat.ts` (teaser events data), `app/metrics.server.ts` unchanged (counts by type)

**Interfaces:**
- Consumes: `POST /apps/chat-cart/teasers` (Task 10), `getShopperContext()` (Task 8).
- Produces:
  - `fetchTeasers(conversationId: string): Promise<string[]>` — POST `{ conversationId, context: getShopperContext() }`.
  - `useTeasers({ open, conversationId, trackEvent, onPick }): { teasers: string[]; pick(text: string): void; dismiss(): void }` — runs only when `getShopperContext().page.type` is `product`, `collection` or `search`; waits for both the fetch and 3000 ms; empty on error; cleared when `open`; dismissed teasers stay hidden for the page load.
  - `Teasers({ items, onPick, onDismiss })` — three stacked user-style bubbles above the launcher, one close button.
  - Events: `teaser_shown { count: number }` (once per load), `teaser_clicked { text: string }` (max 500), `teaser_dismissed`.
  - `onPick(text)` opens the panel and calls `send(text, { teaser: true })`.

- [ ] **Step 1: Update event schema, `fetchTeasers`, `useTeasers`, `Teasers`, CSS**

- [ ] **Step 2: Verify** — standard checks. Manual on the dev store:
  - product, collection and search pages: three different bubbles after about 3 s; home and cart: none;
  - tap one: panel opens, message sent, answer about the current page;
  - close button hides all three; reopening the page shows new ones;
  - visit two products then a search page: at least one teaser connects to the earlier visits;
  - `Event` table has `teaser_shown` with `count: 3` and `teaser_clicked` with the text; admin funnel shows both counts.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: show three teasers above the launcher"
```

### Task 12: Docs

**Files:**
- Modify: `README.md` (message flow, where things live, "Adding a component" → "Adding a display tool": entry in `shared/tools.ts`, execute in `tools.server.ts`, component in `parts/`, line in `prompts/system.ts`)

- [ ] **Step 1: Rewrite the affected README sections to match the new layout**
- [ ] **Step 2: Commit** — `git commit -am "docs: update README for the v1 assistant"`
