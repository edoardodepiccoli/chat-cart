# Theme adapters for cart sync

## Goal

The widget's cart writes refresh the theme's cart UI (header count, cart drawer, cart page) in place on Horizon and Dawn, without opening the drawer. On any other theme, the merchant can list the elements to refresh in the theme editor. All theme knowledge moves out of `cart.ts` behind one small adapter interface, so supporting a new theme means adding one file.

Success means:

- On Horizon and Dawn (and their families: Atelier, Sense, Craft, Refresh, …), adding from a chat card or changing a quantity in the cart sheet updates the header count, the drawer and the cart page within the same write, and the drawer stays closed.
- On a theme with no adapter and the "Cart elements to refresh" setting filled in, the listed elements update after each chat write.
- `cart.ts` imports nothing theme-specific.

## Background

Today `cart.ts` writes through the AJAX Cart API and calls `notifyTheme` from `cartEvent.ts`. That function dispatches Shopify's standard `shopify:cart:lines-update` event, always with `action: "update"`. With each write it also asks Shopify to render Horizon's `cart-items-component` sections (`horizonSections`). Horizon listens to that event, so it refreshes. Other themes do not.

Dawn (checked against `Shopify/dawn` main, October 2026) dispatches standard cart events but does not listen to them. It refreshes its cart UI from its own global pubsub: `publish("cart-update", { source, cartData })`, declared in `assets/pubsub.js` as top-level functions, so they are on `window`. Its `CartItems.onCartUpdate` subscriber re-renders the drawer items and footer (`cart-drawer-items`) or the cart page items (`cart-items`) without opening the drawer. It does not touch the header count (`#cart-icon-bubble`, section `cart-icon-bubble`) or the cart page footer (`#main-cart-footer`, section id in its `data-id`, contents in `.js-contents`).

An earlier adapter layer (`chat-widget/src/cart/adapters.ts`, removed in `64fc3f3`) was dropped because only one theme existed. With three distinct behaviours (Horizon, Dawn, merchant selectors), the layer now pays for itself.

## Decisions

| Topic | Decision |
|---|---|
| Target themes | Horizon and Dawn families. |
| Pattern | Strategy adapters with an ordered registry. First adapter whose `detect()` passes wins. |
| Detection | Feature checks on the page, not `Shopify.theme.schema_name`, so derived themes match. |
| When to detect | Lazily, on the first chat write, then cached. Theme scripts may not have run when the widget starts. |
| Standard event | Always dispatched by the core, for every theme. It is Shopify's contract, not a theme quirk. |
| Unknown themes | Fallback adapter driven by a new theme-editor setting, "Cart elements to refresh" (CSS selectors). Empty setting: standard event only, as today. |
| Scope of adapters | Chat writes only. Theme writes, visibility catch-up and the write queue are unchanged. |

### Rejected approaches

- **Plugin hooks / event bus** (`chat-cart:changed` plus `window.ChatCart.register`). It is a public API to maintain, and nothing needs it yet.
- **Data-driven theme descriptors** (`{ detect, sections, swaps }` run by one engine). Dawn needs a JavaScript call (`publish`), so a code escape hatch is needed anyway.

### Out of scope

Cross-tab sync, paid themes, and refreshing the theme on visibility catch-up.

## Architecture

All theme code lives in `chat-widget/src/theme/`.

| File | Responsibility | Depends on |
|---|---|---|
| `adapter.ts` | `ThemeAdapter` and `Sections` types. `pickAdapter(adapters)`: returns the first adapter whose `detect()` returns true; a `detect()` that throws counts as false. | nothing |
| `standardEvent.ts` | The current `cartEvent.ts`, renamed: `CART_LINES_UPDATE`, `toStandardCart`, and `dispatchCartUpdate(cart, sections)` (the body of today's `notifyTheme`). | `Cart` type |
| `swap.ts` | `swapFromHtml(html, targets)`, where a target is `{ live: string; fresh: string }`: parses `html` and, for each target, pairs the page's `live` matches with the parsed `fresh` matches by index and copies `innerHTML`. Returns the targets whose `live` selector matched nothing. The fallback passes the same selector as both. | DOM |
| `horizon.ts` | Horizon adapter. | DOM |
| `dawn.ts` | Dawn adapter. | `swap.ts`, `urls.ts` |
| `selectors.ts` | `selectorsAdapter(selectors)`: the fallback adapter. | `swap.ts` |
| `index.ts` | `startTheme(selectors)` stores the registry `[horizon, dawn, selectorsAdapter(selectors)]`. `themeSections()` and `refreshTheme(cart, sections)` pick the adapter on first use and delegate to it. | all above |

The interface:

```ts
export type Sections = Record<string, string | null>;

export type ThemeAdapter = {
  name: string;
  // A feature check on the page. Called once, on the first chat write.
  detect(): boolean;
  // Section ids Shopify renders along with each chat write.
  sections(): string[];
  // Runs after the standard event. May be async; errors are caught by the caller.
  refresh(update: { cart: Cart; sections: Sections }): void | Promise<void>;
};
```

Changes to existing files:

- `chat-widget/src/cart.ts`: imports `themeSections` and `refreshTheme` from `./theme`. `withSections` uses `themeSections()`. Both `notifyTheme(...)` calls become `refreshTheme(...)`. Moves `Sections` to `theme/adapter.ts`. Nothing else changes.
- `chat-widget/src/cartEvent.ts` and `cartEvent.test.ts`: moved to `theme/standardEvent.ts` and `theme/standardEvent.test.ts`. `horizonSections` moves to `theme/horizon.ts`.
- `chat-widget/src/main.tsx`: reads `el.dataset.cartSelectors`, splits it on commas, trims, drops empties, and calls `startTheme(selectors)` before `startCart()`.
- `extensions/chat-widget/blocks/chat_widget.liquid`: a new text setting `cart_selectors`, label "Cart elements to refresh", info text explaining it is only needed for themes the widget does not support out of the box. It is passed as `data-cart-selectors="{{ block.settings.cart_selectors | escape }}"`.
- `chat-widget/src/urls.ts`: the `Window` declaration gains `publish?: (event: string, data: unknown) => unknown`.
- `README.md`: the "Cart sync" section describes the adapters, the fallback setting, and how to add an adapter.

## Adapters

### Horizon

- `detect`: the page has a `cart-items-component[data-section-id]`.
- `sections`: the distinct `data-section-id` values of those elements (today's `horizonSections`).
- `refresh`: nothing. Horizon re-renders from the standard event's `detail.sections`.

A Horizon store in "cart page" mode has no drawer, so detection fails and the store falls through to the fallback. The standard event still fires, and Horizon's cart icon listens to it, so the header count still updates.

### Dawn

- `detect`: `typeof window.publish === "function"` and `document.getElementById("cart-icon-bubble")` exists.
- `sections`: `"cart-icon-bubble"`, plus the `data-id` of `#main-cart-footer` when present (the cart page).
- `refresh`:
  1. Swap targets: `#cart-icon-bubble` gets the inner HTML of the `.shopify-section` in the `cart-icon-bubble` section HTML. On the cart page, `#main-cart-footer .js-contents` gets the `.js-contents` of the footer section HTML.
  2. If the write's section HTML is missing (the failed-write path passes `{}`), fetch `${location.pathname}?sections=<ids>` once (this page's context, since Shopify answers `null` for a section not on the requested page) and swap from that response.
  3. Toggle `is-empty` on `cart-items`, `#main-cart-footer` and `cart-drawer` to `cart.item_count === 0`, as Dawn does after its own writes; its pubsub subscribers do not.
  4. Call `window.publish("cart-update", { source: "chat-cart", cartData: cart })`. Dawn's `CartItems` subscribers then re-render the drawer or cart page items. The source is not `"cart-items"`, so Dawn does not skip it.

### Fallback (merchant selectors)

- `detect`: always true. It is last in the registry.
- `sections`: none.
- `refresh`:
  - With no selectors: nothing. The standard event was already sent, as today.
  - Otherwise: `GET location.href` with `cache: "no-store"`, parse the HTML, and for each selector pair live and parsed matches by index and copy `innerHTML`.
  - Each refresh takes a sequence number. A response applies only if its number is still the latest, so the older of two quick writes cannot overwrite the newer one.

## Data flow

### Chat write (add or change quantity)

1. `cart.ts` sends the write, adding `sections` and `sections_url` when `themeSections()` is not empty. The first call picks the adapter.
2. On success, `cart.ts` sets the cart, then calls `refreshTheme(cart, sections)`.
3. `refreshTheme` dispatches the standard event (`action: "update"`, `context: "chat"`, `detail.sections`), then calls `adapter.refresh({ cart, sections })`.

### Failed write that still changed the cart

`cart.ts` re-reads `/cart.js`. If the cart changed, it calls `refreshTheme(cart, {})`. Horizon refreshes from the event; Dawn fetches its sections itself; the fallback refetches the page.

### Theme writes, catch-up, first load

Unchanged. The fetch/XHR watcher and the visibility listener only re-read `/cart.js` into the widget. The theme refreshes itself after its own writes.

## Error handling

The widget must keep showing a cart Shopify confirmed, whatever the theme does.

- `refreshTheme` runs the event dispatch and `adapter.refresh` in separate try/catch blocks. A broken Dawn subscriber cannot block the standard event, and an unknown currency in the event cannot block Dawn.
- A rejected promise from `adapter.refresh` (fallback page fetch, Dawn's section fetch) is caught and logged with `console.error`.
- `detect()` throwing counts as no match.
- A missing Dawn swap target or a merchant selector that matches nothing logs one `console.warn` per page load, naming the selector and, for the fallback, the "Cart elements to refresh" setting.

## Testing

Vitest with happy-dom, as the current widget tests.

- `theme/adapter.test.ts`: `pickAdapter` returns the first match in order and skips a `detect` that throws.
- `theme/standardEvent.test.ts`: today's `cartEvent.test.ts`, moved.
- `theme/swap.test.ts`: pairing by index; a live element with no parsed counterpart is left alone; elements outside the selectors are untouched; unmatched selectors are returned.
- `theme/horizon.test.ts`: detection and section ids on a Horizon DOM fixture.
- `theme/dawn.test.ts`: detection on a Dawn DOM fixture (and not on Horizon's); section ids with and without the cart page footer; bubble and footer swaps; the `publish` payload; the `?sections=` fetch when HTML is missing.
- `theme/selectors.test.ts`: no request when there are no selectors; swaps after a page fetch; a stale response is dropped; one warning for an unmatched selector.
- `theme/index.test.ts`: the adapter is picked lazily and once; a throwing event does not stop `refresh`, and a throwing `refresh` does not stop the event.
- `cart.test.ts`: existing tests keep passing, with `./theme` mocked at the boundary.

Fixtures for Horizon come from the dev store's markup, and fixtures for Dawn from Dawn's `sections/header.liquid`, `cart-drawer.liquid` and `main-cart-footer.liquid`.

Manual check on the dev store:

1. Horizon (current theme).
2. Dawn, installed unpublished and opened through the theme preview.
3. One theme with no adapter, with "Cart elements to refresh" set to its cart count and drawer selectors.

In each, add from a chat card and change a quantity in the cart sheet. Then check the header count, the drawer contents, and the cart page totals, and check that the drawer did not open.
