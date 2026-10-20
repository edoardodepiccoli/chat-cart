# chat-cart

Shopping assistant with a generative UI for a Shopify store. It talks with the shopper, finds products, and sends them to the product page. Each reply is either text or a UI part, like a product card, rendered by a chat widget in the storefront.

The shopper can also buy from the chat: add a product from its card, change quantities in the cart sheet, and go to Shopify's checkout from the checkout bar. The widget and the theme share the store's one cookie cart, and both always show the same state. Every change Shopify confirms, whether it was made in the chat, in the theme's drawer, on a product page or in another tab, updates the widget and the theme's cart icon and drawer together, without a page reload. The widget learns about theme writes by watching the theme's cart requests, re-reads the cart when the shopper comes back to the tab or navigates back, and tells the theme about its own writes through a theme adapter (see "Theme adapters" below). The server never reads or changes the cart.

Curricular stage project — Halue S.r.l. / Università degli Studi di Padova.

## How a message flows

1. The shopper types in the widget. `chat-widget/src/App.tsx` sends it with `useChat` to `/apps/chat-cart/chat`. The body also carries the shopper context from `chat-widget/src/context.ts`: country, language, the current page, and the last 10 visits.
2. Shopify's app proxy forwards it to `app/routes/proxy.chat.tsx`, which loads the conversation from the DB and calls the agent.
3. `app/agent/agent.server.ts` resolves the page and visits against the catalog, then runs the model with the tools in `app/agent/tools.server.ts`. Data tools read the store through `app/agent/storefront.server.ts`. A display tool (`showProducts`, `showFaqCard`) ends the reply and returns the props of a widget part.
4. The reply streams back. `chat-widget/src/components/Message.tsx` turns each part into text or a component.

## Where things live

Backend (`app/`)

- `agent/agent.server.ts` — the agent: one `streamText` call, then suggested messages.
- `agent/suggestions.server.ts` — the suggested replies after each answer.
- `agent/model.ts` — the model id, and loading `.env`.
- `agent/tools.server.ts` — every tool the agent can call, built from `shared/tools.ts`.
- `agent/storefront.server.ts` — Storefront API queries.
- `agent/context.server.ts` — resolves the shopper's page and visits against the catalog.
- `agent/history.ts` — trims saved messages before they go to the model.
- `agent/prompts/` — system, context and suggestions prompts.
- `routes/proxy.chat.tsx`, `routes/proxy.events.tsx` — endpoints the widget calls.
- `conversations.server.ts` — saving and loading conversations.
- `routes/app._index.tsx` — admin home page (empty for now).

Widget (`chat-widget/src/`)

- `App.tsx` — the chat: messages, suggestions, sending.
- `api.ts` — talking to the backend: load a conversation, send events.
- `context.ts` — the shopper context: country, language, page and visits, kept in `chat-cart:history`.
- `hooks/` — `useChatSession.ts`, `useLinkTracking.ts`.
- `components/Message.tsx` — renders one message, picking the part for each tool.
- `components/` — one file per component.
- `parts/` — one file per display tool, and `index.tsx` with the `PARTS` map.
- `i18n.ts`, `locales/` — English and Italian strings.
- `cart/` — the cart sync: `ajax.ts` (AJAX Cart API calls), `store.ts` (the confirmed cart and the write queue), `intercept.ts` (watching the theme's cart requests), `catchup.ts` (re-reading on back/forward, focus and other tabs), `theme.ts`, `standardEvents.ts` and `adapters.ts` (keeping the theme's cart UI up to date), and `index.ts` (`startCart`, `useCart`).

Shared (`shared/`), used by both sides

- `tools.ts` — every tool, with its input and output schemas.
- `chat.ts` — message type, widget error-report schema.
- `context.ts` — shopper context and page schemas.
- `product.ts` — product types and variant picking.

`extensions/chat-widget/` is the theme app extension that mounts the widget bundle.

## Adding a display tool

1. An entry in `shared/tools.ts`, with kind `display`, and its input and output schemas.
2. Its `execute` in `app/agent/tools.server.ts`, returning the output.
3. The component in `chat-widget/src/parts/`, and its line in `PARTS` in `parts/index.tsx`.
4. A line about it in the system prompt, `app/agent/prompts/system.ts`.

The compiler enforces steps 1 to 3. Step 4 is plain text, so the model only uses a tool the prompt describes.

## Theme adapters

After each cart change Shopify confirms, the cart store hands the new cart, and any section HTML Shopify rendered with the write, to a theme adapter, just before the widget shows the same cart. The adapter's job is to make the theme's own cart icon and cart drawer match. An adapter has two parts: `sections()`, the theme section ids Shopify should render alongside each write, and `apply({ cart, sections })`, which updates the theme. The interface lives in `chat-widget/src/cart/theme.ts`.

The default adapter, used for every theme, is `standardEventsAdapter` in `chat-widget/src/cart/standardEvents.ts`. It dispatches Shopify's standard storefront event `shopify:cart:lines-update` on `document`, carrying the cart in the standard-events shape, the rendered sections and the AJAX cart's items, and lets the theme refresh itself. As in Shopify's own module and Horizon, line ids are the raw AJAX line keys, and the event's `lines` lists every line in the cart with its absolute quantity, not only the lines the write touched. It always sends `action: "update"`, even for an add, so themes that open their drawer on adds stay closed when the shopper buys from the chat.

The dev store runs Horizon, which works with the default adapter. It depends on two things in Horizon: the theme listening for the standard `shopify:cart:lines-update` event (its cart icon and cart drawer do), and its cart items being `cart-items-component` elements with a `data-section-id` attribute, which is how the adapter knows which sections to ask Shopify for. If a Horizon update changes either, the theme's cart UI will stop following chat writes until a reload.

For a theme that doesn't listen to the standard events, add an entry to `THEME_ADAPTERS` in `chat-widget/src/cart/adapters.ts`, keyed by the theme's `Shopify.theme.schema_name` (check it in the browser console on the storefront). Usually that entry is a `sectionAdapter` from `theme.ts`: give it the section ids for the cart icon and drawer and, for each, the selector of the element whose markup to replace, plus an optional callback for anything the theme's JavaScript needs after the swap. Add a test for it in `adapters.test.ts`, or beside the adapter, that checks `pickAdapter` returns it and that `apply` updates the theme's markup.

## Development

```bash
npm install
npm run dev:app          # the app, through the Shopify CLI tunnel
npm run dev:app-ngrok    # the app, through an ngrok tunnel (needs ngrok installed)
npm run dev:widget       # rebuilds the widget on every change, in a second terminal
```

Turn the widget on in the theme editor, under App embeds → Chat Cart.

Tests:

```bash
npm test
```
