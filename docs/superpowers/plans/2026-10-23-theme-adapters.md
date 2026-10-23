# Theme Adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chat cart writes refresh the theme's cart UI on Horizon and Dawn, and on other themes through merchant-set selectors. All theme code sits behind one adapter interface outside `cart.ts`.

**Architecture:** A new `chat-widget/src/theme/` folder holds an ordered registry of strategy adapters (`horizon`, `dawn`, `selectors` fallback). On the first chat write, `theme/index.ts` picks the first adapter whose `detect()` passes. After each confirmed write, it dispatches Shopify's standard `shopify:cart:lines-update` event and then calls the adapter's `refresh`. `cart.ts` only calls `themeSections()` and `refreshTheme()`.

**Tech Stack:** TypeScript, React 18 widget bundled by Vite (IIFE), Vitest with happy-dom, Shopify theme app extension (Liquid).

**Spec:** `docs/superpowers/specs/2026-10-23-theme-adapters-design.md`

## Global Constraints

- The standard event always uses `action: "update"` and `context: "chat"`, and is dispatched on `document`, as `notifyTheme` does today.
- A theme problem never throws out of `themeSections()` or `refreshTheme()`. The event dispatch and `adapter.refresh` sit in separate try/catch blocks, and async refresh rejections are caught and logged with `console.error`.
- Console messages use the existing `[chat-cart]` prefix (see `hooks/useLauncherHidden.ts`).
- Adapters handle chat writes only. Do not change the fetch/XHR watcher, the visibility catch-up or the one-write-at-a-time queue in `cart.ts`.
- Detection uses page features, never `Shopify.theme.schema_name`.
- Test files start with `// @vitest-environment happy-dom` (the root vitest config defaults to `node`).
- Commits: Conventional Commits, no `Co-Authored-By` trailer.
- Work on the current branch in the main checkout. Do not use worktrees, because they break `shopify app dev`.

## Review Focus

1. **Invalid merchant selector** (e.g. `div[`): `querySelectorAll` throws a `SyntaxError`. Expected: that selector is skipped with one warning, and the other selectors still swap. Test in Task 2.
2. **Fallback page fetch fails** (non-2xx or offline): expected no swap, one `console.error`, and the widget's cart state unaffected. Test in Task 2.
3. **Shopify returns `null` for a Dawn section** (Shopify does this for a section id it cannot render): expected no throw, the other target still swapped, and `publish` still called. Test in Task 3.
4. **Messy setting value** (`" , .a ,, .b "`): expected `[".a", ".b"]`, and an empty or missing value gives `[]` and makes no page fetch. Test in Task 2.
5. **Theme scripts not ready when the widget starts**: `startTheme` must not call `detect()`. Detection happens on the first `themeSections()` or `refreshTheme()` call. Test in Task 1.

---

### Task 1: Adapter core and Horizon adapter (behaviour unchanged)

A pure refactor. The Horizon behaviour moves behind the adapter, and `cart.ts` stops importing theme code directly. Every existing `cart.test.ts` test passes unchanged.

**Files:**
- Create: `chat-widget/src/theme/adapter.ts`, `chat-widget/src/theme/horizon.ts`, `chat-widget/src/theme/index.ts`
- Move: `chat-widget/src/cartEvent.ts` to `chat-widget/src/theme/standardEvent.ts` (`git mv`), and `chat-widget/src/cartEvent.test.ts` to `chat-widget/src/theme/standardEvent.test.ts`
- Modify: `chat-widget/src/cart.ts` (imports, `Sections` type, `withSections`, both `notifyTheme` calls)
- Test: `chat-widget/src/theme/adapter.test.ts`, `chat-widget/src/theme/horizon.test.ts`, `chat-widget/src/theme/index.test.ts`, `chat-widget/src/theme/standardEvent.test.ts`

**Interfaces:**
- Produces, in `theme/adapter.ts`:
  ```ts
  export type Sections = Record<string, string | null>;
  export type ThemeUpdate = { cart: Cart; sections: Sections };
  export type ThemeAdapter = {
    name: string;
    detect(): boolean;
    sections(): string[];
    refresh(update: ThemeUpdate): void | Promise<void>;
  };
  export function pickAdapter(adapters: ThemeAdapter[]): ThemeAdapter | undefined;
  ```
  (`Cart` is a type-only import from `../cart`.)
- Produces, in `theme/standardEvent.ts`: `CART_LINES_UPDATE`, `StandardCart`, `toStandardCart(cart: Cart): StandardCart` (unchanged), and `dispatchCartUpdate(cart: Cart, sections: Sections): void`. This is today's `notifyTheme` body without its try/catch, which moves to `index.ts`. `horizonSections` leaves this file.
- Produces, in `theme/horizon.ts`: `export const horizonAdapter: ThemeAdapter`.
- Produces, in `theme/index.ts`:
  ```ts
  export function startTheme(selectors: string[]): void;
  export function themeSections(): string[];
  export function refreshTheme(cart: Cart, sections: Sections): void;
  ```
  The module holds `registry: ThemeAdapter[]` (default `[horizonAdapter]` until later tasks append) and a cached pick. `startTheme` stores the registry and clears the cache. In this task it ignores `selectors`; Task 2 uses them. Without a `startTheme` call the default registry is used, so `cart.test.ts` works as is.

- [ ] **Step 1: Move the event module and its test**

```bash
mkdir -p chat-widget/src/theme
git mv chat-widget/src/cartEvent.ts chat-widget/src/theme/standardEvent.ts
git mv chat-widget/src/cartEvent.test.ts chat-widget/src/theme/standardEvent.test.ts
```

In `standardEvent.test.ts`: fix imports (`../cart`, `./standardEvent`) and rename `notifyTheme` to `dispatchCartUpdate`. Move the `horizonSections` test (the "lists the unique section ids" case) to `horizon.test.ts`. Move the two "does not throw" cases to `index.test.ts`, calling `refreshTheme`.

- [ ] **Step 2: Write the failing tests**

`theme/adapter.test.ts`:
- `pickAdapter returns the first adapter whose detect passes`: with `[a(false), b(true), c(true)]`, expect `b`.
- `pickAdapter skips an adapter whose detect throws`: with `[throws, b(true)]`, expect `b`.
- `pickAdapter returns undefined when none match`.

`theme/horizon.test.ts`:
- `detects a page with cart-items-component[data-section-id]`: `true` with `<cart-items-component data-section-id="s1">`, `false` on an empty body and on a `cart-items-component` without the attribute.
- `sections lists unique non-empty ids`: two elements with `s1`, one with `s2`, one with `""`, expect `["s1", "s2"]`.
- `refresh does nothing`: `horizonAdapter.refresh({ cart, sections: {} })` returns `undefined` and leaves `document.body.innerHTML` unchanged.

`theme/index.test.ts` (use `vi.resetModules()` and a dynamic import per test, as `cart.test.ts` does):
- `startTheme does not call detect`: `startTheme([])` with a spy adapter injected through `vi.doMock("./horizon", …)`; the `detect` spy is not called. After `themeSections()`, it has been called once, and a second `themeSections()` plus a `refreshTheme()` do not call it again.
- `refreshTheme dispatches the event, then calls refresh with the same update`: listener on `document` for `shopify:cart:lines-update` gets one event with `action: "update"`; the refresh spy gets `{ cart, sections }`.
- `a throwing event does not stop refresh`: cart with `currency: "XXX-bad"` (makes `Intl.NumberFormat` throw); refresh is still called; `console.error` called; no throw.
- `a throwing refresh does not stop the event`, and `a rejected refresh is logged`: no throw, the event is received, and `console.error` is called (await a microtask for the rejection case).
- `with no matching adapter, refreshTheme only dispatches the event` and `themeSections returns []`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run chat-widget/src/theme`
Expected: FAIL, because `./adapter`, `./horizon`, `./index` and `dispatchCartUpdate` are not found.

- [ ] **Step 4: Implement `adapter.ts`, `horizon.ts` and `index.ts`, and rename `notifyTheme` to `dispatchCartUpdate`**

`horizonAdapter`: `detect` checks for `cart-items-component[data-section-id]`, `sections` is the body of the old `horizonSections`, and `refresh` is a no-op. In `index.ts`, `themeSections()` wraps `adapter?.sections()` in try/catch and returns `[]` on error. `refreshTheme` handles a possible promise with `Promise.resolve(result).catch(console.error)`.

- [ ] **Step 5: Point `cart.ts` at `./theme`**

Replace `import { horizonSections, notifyTheme } from "./cartEvent"` with `import { refreshTheme, themeSections } from "./theme"`. Delete the local `Sections` type and import it as a type from `./theme/adapter`. `withSections` calls `themeSections()`. Both `notifyTheme(...)` calls become `refreshTheme(...)`. Update the comment above `withSections` ("Asks Shopify to render the theme adapter's sections along with a write.").

- [ ] **Step 6: Run the widget tests and typecheck**

Run: `npx vitest run chat-widget && npx tsc --noEmit -p tsconfig.json`
Expected: all tests PASS, including every existing `cart.test.ts` case; no type errors. `grep -rn "cartEvent" chat-widget/src` prints nothing.

- [ ] **Step 7: Commit**

```bash
git add chat-widget/src
git commit -m "refactor: move theme sync behind a theme adapter"
```

---

### Task 2: Merchant-selectors fallback and its theme-editor setting

**Files:**
- Create: `chat-widget/src/theme/swap.ts`, `chat-widget/src/theme/selectors.ts`
- Modify: `chat-widget/src/theme/index.ts` (registry gets `selectorsAdapter(selectors)` last), `chat-widget/src/main.tsx`, `extensions/chat-widget/blocks/chat_widget.liquid`
- Test: `chat-widget/src/theme/swap.test.ts`, `chat-widget/src/theme/selectors.test.ts`, `chat-widget/src/theme/index.test.ts`

**Interfaces:**
- Consumes: `ThemeAdapter`, `Sections` from Task 1.
- Produces, in `theme/swap.ts`:
  ```ts
  export type SwapTarget = { live: string; fresh: string };
  // Copies innerHTML from the parsed `fresh` matches to the page's `live`
  // matches, paired by index. Returns the targets whose `live` selector
  // matched nothing or was invalid.
  export function swapFromHtml(html: string, targets: SwapTarget[]): SwapTarget[];
  ```
- Produces, in `theme/selectors.ts`:
  ```ts
  export function parseSelectors(value: string | undefined): string[];
  export function selectorsAdapter(selectors: string[]): ThemeAdapter;
  ```
- `index.ts`: the registry becomes `[horizonAdapter, selectorsAdapter(selectors)]`. The default with no `startTheme` call uses `selectorsAdapter([])`.

- [ ] **Step 1: Write the failing tests**

`theme/swap.test.ts`:
- `copies innerHTML pairwise by index`: page `<b class="n">1</b><b class="n">2</b>`, html `<b class="n">5</b><b class="n">6</b>`, target `{live: ".n", fresh: ".n"}`: page texts become `["5", "6"]`; returns `[]`.
- `leaves a live element without a parsed counterpart alone`: 2 live matches and 1 fresh match: the first becomes fresh, the second is unchanged.
- `does not touch elements outside the targets`.
- `returns targets whose live selector matched nothing`.
- `treats an invalid selector as unmatched and still swaps the others` (Review Focus 1): targets `[{live:"div[",fresh:"div["}, {live:".n",fresh:".n"}]`: `.n` swapped; returns the `div[` target; no throw.

`theme/selectors.test.ts`:
- `parseSelectors splits on commas, trims and drops empties` (Review Focus 4): `" , .a ,, .b "` gives `[".a", ".b"]`; `""` and `undefined` give `[]`.
- `detect is always true and sections is empty`.
- `with no selectors, refresh makes no request` (Review Focus 4): `fetch` spy not called.
- `refresh fetches location.href and swaps each selector`: page `<span class="count">1</span>`, fetch resolves to an HTML response with `<span class="count">3</span>`: after `await refresh(...)`, the text is `"3"`; the fetch URL is `location.href`.
- `drops a stale response`: two refreshes, where the first fetch resolves after the second with older HTML: the final text is from the second response.
- `logs and skips swapping when the page fetch fails` (Review Focus 2): one case with a 500 response, one with a rejected fetch: DOM unchanged; `console.error` called; `refresh`'s promise resolves (it does not reject).
- `warns once for a selector that matches nothing`: two refreshes with selector `.missing`: `console.warn` called once, with a message containing `.missing` and `Cart elements to refresh`.

`theme/index.test.ts` (add):
- `the fallback is picked when no theme adapter matches`: `startTheme([".count"])` on a page with no Horizon markup; `refreshTheme` triggers one fetch of `location.href`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run chat-widget/src/theme`
Expected: FAIL, because `./swap` and `./selectors` are not found.

- [ ] **Step 3: Implement `swap.ts` and `selectors.ts`, and register the fallback in `index.ts`**

`swapFromHtml` parses with `DOMParser` and catches `querySelectorAll` errors per target. `selectorsAdapter` keeps a closure `latest` counter: each `refresh` takes `++latest` and applies only if it still equals `latest` after the fetch. A non-OK response is logged and skipped. A `warned` flag allows one warning per adapter: `[chat-cart] these "Cart elements to refresh" selectors matched nothing: <list>`. `refresh` returns its promise so `index.ts` can catch it.

- [ ] **Step 4: Wire the setting**

In `chat_widget.liquid`, add to the root `div` `data-cart-selectors="{{ block.settings.cart_selectors | escape }}"`. Add a schema setting after `hide_selector`:

```json
{
  "type": "text",
  "id": "cart_selectors",
  "label": "Cart elements to refresh",
  "info": "Only needed for themes other than Horizon and Dawn. Comma-separated CSS selectors of the cart count and cart drawer (e.g. .cart-count, #cart-drawer). They are refreshed after the shopper changes the cart from the chat."
}
```

In `main.tsx`, call `startTheme(parseSelectors(el.dataset.cartSelectors))` right before `startCart()`.

- [ ] **Step 5: Run the widget tests and typecheck**

Run: `npx vitest run chat-widget && npx tsc --noEmit -p tsconfig.json`
Expected: all PASS; no type errors.

- [ ] **Step 6: Commit**

```bash
git add chat-widget/src extensions/chat-widget/blocks/chat_widget.liquid
git commit -m "feat: refresh merchant-set cart elements on unsupported themes"
```

---

### Task 3: Dawn adapter

**Files:**
- Create: `chat-widget/src/theme/dawn.ts`
- Modify: `chat-widget/src/theme/index.ts` (registry `[horizonAdapter, dawnAdapter, selectorsAdapter(selectors)]`), `chat-widget/src/urls.ts` (`Window` gains `publish?: (event: string, data: unknown) => unknown`)
- Test: `chat-widget/src/theme/dawn.test.ts`

**Interfaces:**
- Consumes: `ThemeAdapter`, `ThemeUpdate` (Task 1); `swapFromHtml`, `SwapTarget` (Task 2); `ROOT` from `../urls`.
- Produces: `export const dawnAdapter: ThemeAdapter`.

Values pinned by Dawn's markup:
- Header count: section id `cart-icon-bubble`, target `{ live: "#cart-icon-bubble", fresh: ".shopify-section" }`.
- Cart page footer: section id from `document.getElementById("main-cart-footer")?.dataset.id`, target `{ live: "#main-cart-footer .js-contents", fresh: ".js-contents" }`.
- Pubsub call: `window.publish("cart-update", { source: "chat-cart", cartData: cart })`.
- Fallback fetch: `GET ${ROOT}?sections=<comma-joined ids>`, which answers JSON `{ [id]: html | null }`.

Fixture (in the test file):

```html
<a id="cart-icon-bubble"><span class="cart-count-bubble">1</span></a>
<div id="main-cart-footer" data-id="template--1__cart-footer"><div class="js-contents">€10</div></div>
```

- [ ] **Step 1: Write the failing tests**

`theme/dawn.test.ts` (set `window.publish = vi.fn()` in `beforeEach` and delete it in `afterEach`):
- `detects Dawn by its publish function and cart bubble`: `true` with both; `false` without `window.publish`; `false` without `#cart-icon-bubble`; `false` on a Horizon fixture (`<cart-items-component data-section-id="s1">`).
- `sections lists the bubble, plus the footer on the cart page`: fixture without the footer gives `["cart-icon-bubble"]`; with the footer, `["cart-icon-bubble", "template--1__cart-footer"]`.
- `refresh swaps the bubble and footer, then publishes`: sections `{ "cart-icon-bubble": '<div class="shopify-section"><span class="cart-count-bubble">3</span></div>', "template--1__cart-footer": '<div class="shopify-section"><div class="js-contents">€30</div></div>' }`: the bubble text is `"3"` and the footer text is `"€30"`; `publish` called once with `("cart-update", { source: "chat-cart", cartData: cart })`; no fetch.
- `refresh fetches the sections when the write brought none`: `refresh({ cart, sections: {} })`: fetch called with `${ROOT}?sections=cart-icon-bubble,template--1__cart-footer` (adapt to the fixture); the fetched HTML is swapped; then `publish` is called.
- `a null section still publishes and swaps the rest` (Review Focus 3): `{ "cart-icon-bubble": null, "template--1__cart-footer": <html> }`: no throw; the footer is swapped; the bubble is unchanged; `publish` called; no fetch (a `null` value counts as an answer, not as missing).
- `a failed sections fetch still publishes`: fetch rejects: `publish` called; `refresh`'s promise resolves; `console.error` called.
- `warns once when the bubble is missing from the page`: remove `#cart-icon-bubble` after detection, refresh twice: one `console.warn` naming `#cart-icon-bubble`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run chat-widget/src/theme/dawn.test.ts`
Expected: FAIL, because `./dawn` is not found.

- [ ] **Step 3: Implement `dawnAdapter` in `theme/dawn.ts`, add `publish` to the `Window` declaration, and register it in `index.ts` between Horizon and the fallback**

`refresh` is async. It treats sections as missing only when none of its ids is a key in `update.sections`. It swaps each id whose HTML is a string with that id's target, then calls `window.publish?.(...)` in a `finally`, so a failed fetch still publishes.

- [ ] **Step 4: Run the widget tests and typecheck**

Run: `npx vitest run chat-widget && npx tsc --noEmit -p tsconfig.json`
Expected: all PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add chat-widget/src
git commit -m "feat: refresh Dawn's cart bubble, drawer and cart page from chat writes"
```

---

### Task 4: README and verification on real themes

**Files:**
- Modify: `README.md` ("Where things live" widget list and the "Cart sync" section)

- [ ] **Step 1: Update the README**

- In "Where things live", replace the `cart.ts` line's mention of `cartEvent.ts` with `theme/`: the theme adapters (`horizon.ts`, `dawn.ts`, `selectors.ts`), the standard cart event (`standardEvent.ts`), and `index.ts`, which picks the adapter.
- In "Cart sync", replace the Horizon-only last sentences with three short paragraphs:
  1. After each chat write the widget dispatches the standard event, then hands the cart to the first matching adapter (Horizon, Dawn, fallback).
  2. The fallback refreshes the selectors set in the theme editor under "Cart elements to refresh".
  3. "Adding a theme adapter": one file in `chat-widget/src/theme/` that exports a `ThemeAdapter`, a test with a fixture of the theme's markup, and its place in the registry in `theme/index.ts`, before the fallback.

- [ ] **Step 2: Full test suite, lint, widget build**

Run: `npm test && npm run lint && npm run widget:build`
Expected: all tests PASS, no lint errors, and `extensions/chat-widget/assets/chat-widget.js` rebuilt without errors (the built asset is gitignored; do not commit it).

- [ ] **Step 3: Manual check on the dev store**

With `npm run dev:app` and `npm run dev:widget` running, follow the spec's manual check on each theme:
1. Horizon (live theme).
2. Dawn, added from the theme store as unpublished and opened with "Preview". Enable the Chat Cart app embed in its editor.
3. A theme with no adapter (e.g. a vintage theme such as Debut, or any non-Horizon, non-Dawn theme): first with "Cart elements to refresh" empty (expect: no errors, theme updates on reload), then filled with its cart count and drawer selectors (expect: they update after a chat write).

In each, add from a chat card and change a quantity in the cart sheet. Check the header count, drawer contents and cart page totals, check that the drawer does not open, and check that the console has no `[chat-cart]` errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe theme adapters and the cart elements setting"
```
