# Simplify the repo — design

Date: 2026-10-21
Status: approved in brainstorming, pending written-spec review

## Goal

A junior engineer can read the repo in an afternoon and safely extend it. Simplicity over cleverness: delete code before rewriting it, prefer boring explicit code over abstractions, add no dependencies or patterns.

Success means:

- The cart sync is two short files that can be explained in a few sentences, down from about 2,000 lines of source and tests.
- Every file name says what the file holds; no two files share a vague name like `context`.
- No dead code, no stale docs.
- The core behaviour still works after every step: chat, product cards, add to cart, cart sheet, checkout, and the theme's cart icon and drawer following chat writes on Horizon.

## Decisions

| # | Question | Decision |
| --- | --- | --- |
| D1 | How the widget learns about theme cart writes | A small fetch/XHR interception that only re-reads `/cart.js` after a theme cart write. Plus a re-read when the panel opens and when the tab becomes visible. |
| D1 | How the theme learns about widget cart writes | Shopify's standard `shopify:cart:lines-update` event. Live on themes that listen to it (Horizon); other themes stay stale until a reload, and the README says so. |
| D2 | Theme adapter registry (`THEME_ADAPTERS`, `sectionAdapter`, `noopAdapter`) | Removed. |
| D3 | Cross-tab sync through `BroadcastChannel` | Removed. The re-read on tab visible covers it. |
| D4 | Write queue | Removed. One cart write at a time: every cart button is disabled while a write is pending. |
| — | Race conditions between reads and writes | Not handled. The last answer to arrive wins; the next write, panel open or tab focus corrects a rare out-of-order answer. |
| D5 | Visit history (last 10 visits) in the shopper context | Removed. The agent still gets the current page with its title. |
| D6 | Hiding the chat button when theme elements cover it | Kept, renamed. |
| D7 | `ngrok-skip-browser-warning` header | Sent only in development builds of the widget. `dev-ngrok.sh` stays. |

Kept as is: the type plumbing in `shared/tools.ts` and `parts/index.tsx` that makes the compiler check a new display tool end to end. It gets one explanatory comment.

## Cart sync

### What gets deleted

All of `chat-widget/src/cart/`: `ajax.ts`, `store.ts`, `intercept.ts`, `catchup.ts`, `theme.ts`, `standardEvents.ts`, `adapters.ts`, `index.ts`, and their nine test files. Also `parts/addToCartState.ts` and its test.

### What replaces it

Two files.

**`chat-widget/src/cart.ts`** — the cart state, the AJAX Cart API calls, and watching the theme.

```ts
export type CartItem = { /* same fields as today's ajax.ts */ };
export type Cart = { token; item_count; total_price; currency; items: CartItem[] };
export type CartState = {
  cart: Cart | null;
  pending: string | null; // the variant GID or line key being written
  error: { key: string; message: string } | null;
};

export function startCart(): void;              // called once from main.tsx
export function refreshCart(): Promise<void>;   // GET /cart.js, store the result
export function addToCart(variantGid: string): Promise<boolean>;
export function changeQuantity(lineKey: string, quantity: number): Promise<boolean>;
export function useCart(): CartState;           // useSyncExternalStore over the module state
export function inCart(cart: Cart | null, variantGid: string): boolean;
```

Behaviour:

- **State.** One module-level `state` object, a `Set` of listeners, and a `setState(patch)` that replaces the object and calls the listeners. `useCart` reads it with `useSyncExternalStore`.
- **Writes.** `addToCart` posts `{ROOT}cart/add.js`, then reads `{ROOT}cart.js` because the add answer holds only the added item. `changeQuantity` posts `{ROOT}cart/change.js`, whose answer is the full cart. Both:
  1. return `false` at once if another write is pending;
  2. set `pending` to their key and clear `error`;
  3. on success, store the cart, dispatch the theme event (see `cartEvent.ts`) and return `true`;
  4. on failure, set `error` to `{ key, message }`, where `message` is Shopify's `description` or `message` field, or the `cartFailed` string, call `refreshCart()` (Shopify can apply part of a quantity) and return `false`;
  5. always clear `pending` at the end.
- **Reads.** `refreshCart` reads `/cart.js` and stores the result. A failed read keeps the last cart. No staleness checks.
- **Watching the theme.** `startCart` wraps `window.fetch` and `XMLHttpRequest.prototype.open`. After a successful request whose path ends in `cart/add`, `cart/change`, `cart/update` or `cart/clear`, with or without `.js`, it calls `refreshCart()`. It never reads the theme's response body. The widget's own calls use the saved original `fetch`, so they are not seen as theme writes. The wrapper must hand the theme the same response and the same rejection the original `fetch` would.
- **Catch-up.** `startCart` adds one `visibilitychange` listener that calls `refreshCart()` when the tab becomes visible, and calls `refreshCart()` once for the first load. `App` calls `refreshCart()` when the panel opens.
- **Failure safety.** `startCart` is wrapped in `try`/`catch`, as today: a failed setup logs and leaves an empty cart, and never takes the chat down.

**`chat-widget/src/cartEvent.ts`** — tells the theme about a widget write.

- `toStandardCart(cart)`: today's port of Shopify's `createCartFromAjaxResponse`, unchanged.
- `notifyTheme(cart, sections)`: dispatches `shopify:cart:lines-update` on `document` with `action: "update"` (so Horizon does not open its drawer on a chat add), `context: "chat"`, every line with its absolute quantity, and `promise` resolving to `{ cart: toStandardCart(cart), detail: { sections, itemCount, items } }`. Wrapped in `try`/`catch`: a broken theme listener must not stop the widget from showing the cart.

**Section HTML.** Today the widget asks Shopify to render the `cart-items-component[data-section-id]` sections with each write, because Horizon's drawer re-renders from `detail.sections`. This is the only Horizon-specific code left. Step 6 of the implementation checks on the dev store whether Horizon's drawer refreshes without it:

- If it does, remove the section lookup and the `sections` parameter, and send `sections: {}`.
- If it doesn't, keep a `horizonSections()` helper in `cartEvent.ts`, with a comment naming Horizon, and pass its ids on every write.

### Changes to components

- `parts/AddToCart.tsx`: `useAddFlow` becomes `useVariantPicker`, and its result is passed as `picker` to `AddToCartButton` (today `AddToCart`) and `VariantPicker`. After an add, the picker closes when `addToCart` returns `true`. `errorFor` and `shouldClosePicker` are replaced by inline checks; `buttonLabel` moves into this file.
- `components/CartSheet.tsx`, `parts/AddToCart.tsx`: buttons are disabled while `pending !== null`, not only for their own key. Components call `addToCart` and `changeQuantity` directly instead of through `useCart()`, which now only returns state.
- `App.tsx`: calls `refreshCart()` when the panel opens.
- `components/Panel.tsx`, `components/CheckoutBar.tsx`: import from `../cart`, no other change.

### Tests

`chat-widget/src/cart.test.ts` and `chat-widget/src/cartEvent.test.ts`, using happy-dom and a fake `fetch`:

- `refreshCart` stores the cart; a failed read keeps the previous one.
- `addToCart` posts the variant id, stores the re-read cart, dispatches `shopify:cart:lines-update`, and returns `true`.
- A failed write sets `error` to Shopify's description and returns `false`.
- A write while another is pending returns `false` without a request.
- A theme `fetch` to `/cart/change.js` triggers a re-read; a `fetch` to another path does not; the theme gets the original response.
- A theme XHR to `/cart/add.js` triggers a re-read on `load`.
- `toStandardCart` keeps today's cases (minor digits per currency, raw line keys).

## Visit history (D5)

- Widget: `addVisit`, `readHistory`, `recordVisit`, the `chat-cart:history` storage key and `previousHistory` go. The shopper context becomes `{ country, language, page }`.
- Shared: `visitSchema`, `Visit`, `samePage` and the `history` field go.
- Server: `loadCatalog` and `resolveContext` collapse into one `resolvePage(storefront, market, page)` that returns the current page with its title, or `{ type: "other" }` when the handle is unknown. The dynamic aliased `resolveTitles` query is replaced by two plain queries, `product(handle) { title }` and `collection(handle) { title }`.
- Prompt: the "Before this page…" line goes.
- Tests: the history cases in `shared/context.test.ts`, `app/agent/context.test.ts` and `chat-widget/src/context.test.ts` go; the page cases stay.

## ngrok header (D7)

- `chat-widget/src/api.ts` sends `ngrok-skip-browser-warning` only when `import.meta.env.MODE === "development"`.
- `dev:widget` becomes `vite build --watch --mode development --config chat-widget/vite.config.ts`. `widget:build` stays a production build.

## Dead code and stale docs

- `app/agent/storefront.server.ts`: `getCollection`, `searchProducts`, `COLLECTION_QUERY`, `SEARCH_QUERY`, `ProductSummaryNode`, `CollectionResponse`, `summarize`.
- `evals/results/` (the runner was deleted in `9531f2d`).
- `docs/superpowers/specs/2026-10-20-cart-sync-design.md` and `docs/superpowers/plans/2026-10-20-cart-sync.md`, which describe the replaced design.
- README: the lines naming `routes/proxy.events.tsx` and `hooks/useLinkTracking.ts`, which don't exist.

## Renames and moves

| Today | After |
| --- | --- |
| `chat-widget/src/context.ts` | `chat-widget/src/shopperContext.ts` |
| `shared/context.ts` | `shared/shopperContext.ts` |
| `app/agent/context.server.ts` | `app/agent/pageTitle.server.ts` |
| `app/agent/prompts/context.ts` | `app/agent/prompts/shopper.ts` |
| `chat-widget/src/turns.ts` | `chat-widget/src/messages.ts` |
| `chat-widget/src/covered.ts`, `useCovered` | `chat-widget/src/hooks/useLauncherHidden.ts`, `useLauncherHidden` |
| `useConversation` in `api.ts` | `chat-widget/src/hooks/useConversation.ts` |
| `useAnchorScroll`, `useIosKeyboard` in `Panel.tsx` | `chat-widget/src/hooks/useAnchorScroll.ts`, `chat-widget/src/hooks/useIosKeyboard.ts` |
| `variantNumber` in `urls.ts` | `variantIdFromGid` |
| `localUrl` in `urls.ts` | `storeUrl` |

Test files move and rename with the file they test.

## Order of work

One concern per commit. After each commit `npm test`, `npm run typecheck` and `npm run lint` pass, and the widget builds.

1. Delete dead code and stale docs.
2. Remove visit history.
3. Send the ngrok header only in development builds.
4. Cart rewrite: add `cart.ts` and `cartEvent.ts` with their tests beside the old folder; switch the components; delete `chat-widget/src/cart/` and `addToCartState.ts`.
5. Renames and moves, one commit per area (widget, shared, server).
6. On the dev store, check whether Horizon's drawer refreshes from the standard event without section HTML, and remove or keep the section lookup accordingly.
7. Rewrite the README's cart sync and theme sections to match.

Renames come after the cart rewrite and the history removal, so no code is renamed just before it is deleted.

## Manual check on the dev store (after steps 4 and 6)

- Add from a chat card: the button shows "Adding…", then "In cart"; the checkout bar appears; Horizon's cart icon count changes without opening its drawer.
- Change a quantity in the cart sheet: the sheet and Horizon's drawer both show the new quantity.
- Add from the product page with the chat open: the checkout bar updates.
- Change the cart in another tab, come back: the checkout bar updates.
- A quantity above stock: the sheet shows Shopify's error under that line.

## Risks

- **Cart rewrite (step 4).** The tests are written from scratch, so they could miss a case the old ones covered. The manual check above is the safety net.
- **Horizon updates.** If Horizon stops listening to `shopify:cart:lines-update`, its cart UI stops following chat writes until a reload. The README names this dependency.
- **Out-of-order answers.** Accepted. A rare wrong count corrects itself on the next write, panel open or tab focus.
