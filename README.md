# chat-cart

Shopping assistant with a generative UI for a Shopify store. It talks with the shopper, finds products, and sends them to the product page. Each reply is either text or a UI part, like a product card, rendered by a chat widget in the storefront.

The shopper can also buy from the chat: add a product from its card, change quantities in the cart sheet, and go to Shopify's checkout from the checkout bar. See "Cart sync" below. The server never reads or changes the cart.

Curricular stage project — Halue S.r.l. / Università degli Studi di Padova.

## How a message flows

1. The shopper types in the widget. `chat-widget/src/App.tsx` sends it with `useChat` to `/apps/chat-cart/chat`. The body also carries the shopper context from `chat-widget/src/shopperContext.ts`: country, language and the current page.
2. Shopify's app proxy forwards it to `app/routes/proxy.chat.tsx`, which loads the conversation from the DB and calls the agent.
3. `app/agent/agent.server.ts` looks up the current page's title, then runs the model with the tools in `app/agent/tools.server.ts`. Data tools read the store through `app/agent/storefront.server.ts`. A display tool (`showProducts`, `showFaqCard`) ends the reply and returns the props of a widget part.
4. The reply streams back. `chat-widget/src/components/Message.tsx` turns each part into text or a component.

## Where things live

Backend (`app/`)

- `agent/agent.server.ts` — the agent: one `streamText` call, then suggested messages.
- `agent/suggestions.server.ts` — the suggested replies after each answer.
- `agent/model.ts` — the model id, and loading `.env`.
- `agent/tools.server.ts` — every tool the agent can call, built from `shared/tools.ts`.
- `agent/storefront.server.ts` — Storefront API queries.
- `agent/pageTitle.server.ts` — looks up the title of the page the shopper is on.
- `agent/history.ts` — trims saved messages before they go to the model.
- `agent/prompts/` — system, shopper and suggestions prompts.
- `routes/proxy.chat.tsx` — the endpoint the widget calls.
- `conversations.server.ts` — saving and loading conversations.
- `routes/app._index.tsx` — admin home page (empty for now).

Widget (`chat-widget/src/`)

- `App.tsx` — the chat: messages, suggestions, sending.
- `api.ts` — talking to the backend: the chat transport, loading and starting a conversation.
- `shopperContext.ts` — the shopper context: country, language and page.
- `messages.ts` — the greeting, grouping messages into turns, the typing label.
- `hooks/` — `useChatSession.ts`, `useConversation.ts`, `useAnchorScroll.ts`, `useIosKeyboard.ts`, `useLauncherHidden.ts`.
- `components/Message.tsx` — renders one message, picking the part for each tool.
- `components/` — one file per component.
- `parts/` — one file per display tool, and `index.tsx` with the `PARTS` map.
- `i18n.ts`, `locales/` — English and Italian strings.
- `cart.ts` — the cart: state, AJAX Cart API calls, watching the theme's cart writes.
- `theme/` — refreshing the theme after the widget's cart writes: the standard cart event (`standardEvent.ts`), one adapter per theme (`horizon.ts`, `dawn.ts`, `selectors.ts`), and `index.ts`, which picks the adapter.

Shared (`shared/`), used by both sides

- `tools.ts` — every tool, with its input and output schemas.
- `chat.ts` — message type, widget error-report schema.
- `shopperContext.ts` — shopper context and page schemas.
- `product.ts` — product types and variant picking.

`extensions/chat-widget/` is the theme app extension that mounts the widget bundle.

## Adding a display tool

1. An entry in `shared/tools.ts`, with kind `display`, and its input and output schemas.
2. Its `execute` in `app/agent/tools.server.ts`, returning the output.
3. The component in `chat-widget/src/parts/`, and its line in `PARTS` in `parts/index.tsx`.
4. A line about it in the system prompt, `app/agent/prompts/system.ts`.

The compiler enforces steps 1 to 3. Step 4 is plain text, so the model only uses a tool the prompt describes.

## Cart sync

The widget reads and writes Shopify's cookie cart, the same one the theme uses, through the AJAX Cart API (`chat-widget/src/cart.ts`). It runs one write at a time and disables every cart button while one is pending. It re-reads `/cart.js` after any cart write the theme makes (it watches the page's `fetch` and `XMLHttpRequest` calls to `cart/add`, `change`, `update` and `clear`), when the chat opens, and when the tab becomes visible again. After its own writes it dispatches Shopify's standard `shopify:cart:lines-update` event, always with `action: "update"` so the theme refreshes without opening its drawer. Then it hands the cart to a theme adapter (`chat-widget/src/theme/`). On the first write the widget picks the first adapter whose feature check passes: Horizon, then Dawn, then the fallback. Each adapter names the sections Shopify renders along with a write. On Horizon (and its family) these are the `cart-items-component` sections, and the standard event does the rest. On Dawn (and its family) the adapter swaps the header count and the cart page footer, then calls Dawn's `publish("cart-update")` so its drawer and cart page items re-render.

On any other theme the fallback re-fetches the page and copies the elements listed in the theme editor under App embeds → Chat Cart → "Cart elements to refresh". With that setting empty, the theme only gets the standard event, and themes that ignore it show the change after the next page load.

Adding a theme adapter: one file in `chat-widget/src/theme/` exporting a `ThemeAdapter` (`detect`, `sections`, `refresh`), a test with a fixture of the theme's markup, and its place in the list in `theme/index.ts`, before the fallback.

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
