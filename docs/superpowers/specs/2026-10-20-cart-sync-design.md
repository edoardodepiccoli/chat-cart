# Cart sync and in-chat buying — design (Part 1)

Date: 2026-10-20
Status: approved in brainstorming, pending written-spec review

## Goal

The shopper can buy from the chat: pick a variant on a product card, add it to the cart, see and edit the cart, and go to checkout. The widget's cart and the theme's cart (header count, cart drawer) always show the same state. Neither side lags behind the other.

Success means: any cart change, made from the chat, the theme's drawer, the product page or another tab, is visible in both the widget and the theme within one network round trip, without a page reload.

## Scope

Part 1 (this spec): the cart sync foundation and shopper-driven buying.

- Variant picker and add to cart on product cards.
- In-chat cart with quantity +/− and remove.
- Sticky checkout bar that opens the cart sheet.

Part 2 (separate spec, later): the agent receives the cart with every message, and an `addToCart` tool that proposes an add the shopper confirms in the UI. Part 2 builds on the cart store from Part 1 and needs no changes to the sync.

Out of scope: embedding checkout. Checkout stays Shopify's hosted `/checkout`. The server never reads or writes the cart in Part 1.

## Decisions

| Question | Decision |
| --- | --- |
| Theme support | Ranger now, behind a small theme adapter interface so other themes can be added later. |
| In-chat cart placement | The checkout bar above the composer expands into a cart sheet over the conversation. |
| Theme feedback on a chat add | Silent: header count and drawer are refreshed in place; the drawer does not open. Feedback stays in the chat. |
| Update timing | Confirmed, not optimistic: the UI shows a pending state until Shopify answers, then both sides update from the same answer. |
| Product card picker | Compact card with one "Add to cart" button. No options: adds in one tap. With options: the tap expands option chips and a confirm button. |
| Sync mechanism | One cart store fed by Shopify's own AJAX Cart API responses, with fetch/XHR interception for theme writes and catch-up on navigation, focus and other tabs. |

### Rejected approaches

- **Read-only cart following the theme with `PerformanceObserver`** (tried on `backup/rescope`, commit `dad6ce8`). The observer fires after the response and cannot see its body, so every theme change costs a second request and the widget lags. Theme writes outside the watched endpoints were missed.
- **Widget writes with `/cart/add.js` and no theme refresh** (before `7f9a693`). The widget was right but the theme's header count and drawer stayed stale until a reload.
- **Storefront API cart owned by the widget.** It is a second cart beside the theme's cookie cart. Keeping the two aligned by token is fragile, and it is the worst form of the sync problem.

## Why the earlier attempts lagged

The cookie cart is the single source of truth. The theme's cart UI is server-rendered HTML, and the widget kept its own copy in React state. Nothing told the theme when the widget wrote, and the widget only learned about theme writes late and indirectly. The fix makes every confirmed Shopify answer update both views at once.

## Architecture

All cart code lives in the widget, in `chat-widget/src/cart/`.

| File | Responsibility | Depends on |
| --- | --- | --- |
| `ajax.ts` | AJAX Cart API calls: `getCart`, `add`, `change`, `update`. Each accepts an optional list of section IDs and returns `{ cart, sections }`. `add` reads `/cart.js` itself after a successful add, because `/cart/add.js` returns only the added items. A non-2xx answer becomes a `CartError` carrying Shopify's `description` or `message`. Uses the original `window.fetch`, saved before interception is installed. | `fetch` |
| `store.ts` | `cartStore`: the last cart Shopify confirmed; `subscribe` and `getSnapshot` for `useSyncExternalStore`; a write queue that runs one write at a time; the key of the line or variant currently pending; the last error. `write(op)` runs the op, then applies the theme sections and the new cart in one synchronous block. `adopt(cart)` takes a cart that came from elsewhere. | `ajax.ts`, `theme.ts` |
| `intercept.ts` | Wraps `window.fetch` and `XMLHttpRequest` once. For same-origin requests whose path, after `ROOT`, matches `cart/(add\|change\|update\|clear)` with or without `.js`, it reads a clone of the response and passes it to the store. Requests made by the store are not intercepted because the store uses the saved original `fetch`. | `store.ts` |
| `catchup.ts` | Listens to `pageshow` (when `event.persisted`), `visibilitychange` (when visible) and a `BroadcastChannel("chat-cart:cart")`. Each re-reads `/cart.js`; if the cart differs from the store, it adopts it and refreshes the theme with `GET {ROOT}?sections=<ids>`. After every confirmed change the store posts a message on the channel. | `store.ts`, `ajax.ts`, `theme.ts` |
| `theme.ts` | The adapter interface `{ sections: string[]; apply(html: Record<string, string \| null>): void }`, the active-adapter selection, and a `noop` adapter. | DOM |
| `ranger.ts` | The Ranger adapter: Ranger's section IDs for the cart icon and cart drawer, and which DOM elements each section replaces. | DOM |
| `useCart.ts` | React hook returning `{ cart, pending, error, add(variantId, quantity), setQuantity(lineKey, quantity), remove(lineKey) }`. | `store.ts` |

Changes to existing files:

- `shared/product.ts`: `shownProductSchema` gains optional `options` (`{ name, values }[]`) and optional `variants` (`{ id, selectedOptions, price, compareAtPrice, available, imageUrl }[]`). Restores `findVariant(variants, picks)` and `isOptionValueAvailable(variants, picks, name, value)`. The fields are optional so conversations saved before this change still parse; their cards keep today's link-only behaviour.
- `app/agent/tools.server.ts`: `showProducts` adds `options` and `variants` from the `getProduct` result it already fetches.
- `chat-widget/src/parts/ProductCards.tsx`: the "Add to cart" button and the expanding option picker.
- New `chat-widget/src/components/CheckoutBar.tsx` and `chat-widget/src/components/CartSheet.tsx`, rendered by `Panel` between the log and the `Composer`.
- `chat-widget/src/main.tsx`: installs interception and catch-up before React mounts, so the first theme write after load is already seen, then loads the initial cart.
- `chat-widget/src/locales/en.json`, `it.json`: new strings.
- `chat-widget/src/urls.ts`: `CHECKOUT_URL` and `variantNumber(gid)`.
- `README.md`: how the cart sync works and where the theme coupling lives. The README currently says the assistant "never reads or changes the cart"; that line changes.

Unchanged: the server, the agent, the prompts and the database.

## Data flow

### Shopper adds from a chat card

1. The card calls `add(variantId, 1)`. The store queues the write and marks the variant pending; the button shows "Adding…".
2. `POST {ROOT}cart/add.js` with `{ items: [{ id, quantity }], sections: adapter.sections }`.
3. On success, `GET {ROOT}cart.js`.
4. In one synchronous block: `adapter.apply(sections)`, then the store sets the cart and notifies subscribers. Theme and widget change in the same frame.
5. The store posts on the `BroadcastChannel`. The card shows "In cart · <options>" because the selected variant is now in `cart.items`.

### Shopper changes quantity or removes in the cart sheet

Same as above with `POST {ROOT}cart/change.js { id: line.key, quantity, sections }`. Remove is quantity 0. The answer is the full cart, so step 3 is skipped. The tapped line is pending until the answer arrives. Repeated taps queue writes that run in order.

### Theme writes

1. The theme calls `fetch` or XHR on a cart endpoint.
2. The wrapper returns the original response to the theme and reads a clone.
3. For `change`, `update` and `clear`, the clone is the full cart and the store adopts it. For `add`, the store reads `/cart.js` once and adopts that.
4. Theme sections are not touched: the theme refreshes its own UI after its own write.

### Overlapping writes

If a theme write is seen while a widget write is in flight, the store marks itself dirty. When the queue drains, it reads `/cart.js` once and adopts the result, so the final state is always the latest server state regardless of which answer arrived last.

### Catch-up

On back/forward cache restore, on returning to the tab, and on a message from another tab: read `/cart.js`. If the cart differs, adopt it and refresh the theme with `GET {ROOT}?sections=<ids>` so that tab's header is also right. A broadcast is only a signal to re-read; its payload is never applied, because it may be older than the server.

Two carts differ when any of these differ: `token`, `item_count`, `total_price`, or the list of `(key, quantity)` pairs.

### First load

The theme rendered the current cart on the server. The widget reads `/cart.js` once to fill the store. No theme refresh.

### Checkout

The checkout button is a link to `{ROOT}checkout`. The cart cookie carries the cart.

## UI

### Product card

- Today's layout stays: image, title and price on top, highlights below.
- Cards whose product has `variants` get an "Add to cart" button in the body.
- One variant only: the tap adds it.
- Several variants: the tap expands a picker between the top row and the highlights. One row of chips per option. Values with no available variant for the current picks are struck through and disabled. The picker starts on the first available variant. A "Cancel" button and an "Add <option values> · <price>" button confirm or close.
- States: idle, picking, adding, in cart ("In cart · M / Blue", when the selected variant is in `cart.items`), sold out (no available variant), error (Shopify's message under the button, button re-enabled).
- Cards without `variants` (old conversations) keep the current link-only card.
- The card still links to the product page from its image and title.

### Checkout bar

- Shown above the composer when the cart has at least one item.
- Shows the first line's image, the item count and the total, and a checkout button.
- Tapping anywhere except the checkout button opens the cart sheet.

### Cart sheet

- Slides up over the conversation inside the panel, with a dimmed log behind it. Tapping the dimmed area or the handle closes it.
- One row per line: image, title, option values (omitted for products with only the default variant), line price, and quantity −/+ controls. The − at quantity 1 removes the line.
- Pending line: its controls are disabled with a spinner. Error: Shopify's message under that line.
- Footer: total and checkout button.
- Closes on its own when the cart becomes empty.

## Errors and edge cases

- **Shopify refuses a write (422).** Shopify's message is shown at the card or line. The store is unchanged, then re-reads `/cart.js`, because Shopify sometimes applies part of a quantity it cannot fully satisfy.
- **Network failure or 5xx.** The same as a refusal, with the localized message "Couldn't update your cart. Try again."
- **`/cart.js` fails on first load.** The checkout bar stays hidden. Cards can still add; the first successful write fills the store.
- **Interception must never break the theme.** All interception code runs inside `try/catch`. The theme always receives the original response; the widget reads a `clone()`. Bodies that are not JSON are ignored. Installation is guarded by a flag on `window` so it happens once.
- **Ranger markup missing** (a page without the drawer, a theme update, a different theme). `apply` replaces only the elements it finds. If none are found it logs one `console.warn` naming `chat-widget/src/cart/ranger.ts`. The widget keeps working; at worst the theme's badge goes stale.
- **A section is `null` in the answer.** Skip that section and apply the others.
- **Empty cart.** Checkout bar hidden, sheet closed.
- **Stale variant data in old messages.** The picker uses the stored `available`; Shopify's 422 guards the actual add. The cart and sheet always show live Shopify prices.
- **Markets and locales.** All URLs go through `ROOT` (`window.Shopify.routes.root`). Money is formatted in the cart's `currency`.

## Ranger adapter: what to collect first

The first implementation task is to read Ranger's markup, from the theme code or with DevTools on the dev store, and record in `ranger.ts`:

1. The section ID that renders the header cart count, and the selector of the element to replace with its HTML.
2. The section ID that renders the cart drawer contents, and the selector of the element to replace.
3. Whether Ranger's JavaScript needs anything after the HTML is replaced (custom elements that re-initialise, an event it listens to). If so, `apply` does it after the swap.
4. Whether the drawer's markup exists on every page type.

These go into `ranger.ts` and the theme coupling notes in the README. Values are not guessed in advance.

## Testing

Unit tests with vitest, one `*.test.ts` beside each file:

- `cart/ajax.test.ts` (fake `fetch`): request URLs and bodies under a locale `ROOT`; `add` follows with `/cart.js`; a 422 becomes a `CartError` with Shopify's message.
- `cart/store.test.ts`: writes run in order; sections and cart are applied in one call; a theme write during a widget write leads to one reconcile read; a refusal leaves the cart unchanged and triggers a re-read.
- `cart/intercept.test.ts`: wraps `fetch` and a fake XHR class; only theme cart requests are adopted; the store's own requests are not intercepted; the caller can still read the original body; a parse error never reaches the caller; installing twice wraps once.
- `cart/catchup.test.ts`: the cart-difference function; a broadcast triggers a re-read, not an adopt.
- `shared/product.test.ts`: `findVariant`, `isOptionValueAvailable`, and old saved messages without `variants` still parse.
- `cart/ranger.test.ts`: `apply` replaces matching elements and skips missing elements and `null` sections. Runs in `happy-dom` via `// @vitest-environment happy-dom`; `happy-dom` is added as a dev dependency. Other tests stay on `node`.

Manual checklist on the Ranger dev store, run before calling Part 1 done:

1. Add from a chat card: the header count and drawer update without a reload.
2. Add on the product page, and change quantity in the drawer: the checkout bar and sheet follow within one answer.
3. Change quantity and remove in the chat sheet: the drawer matches.
4. Two tabs: change the cart in one, focus the other; both match, header included.
5. Back/forward after a change: both views are right.
6. A sold-out variant and an over-stock quantity: inline message, nothing changes.
7. Checkout from the bar: Shopify checkout opens with the same lines.
8. Mobile width, and desktop with the panel open.
