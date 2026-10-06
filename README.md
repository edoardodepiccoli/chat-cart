# chat-cart

Conversational assistant with a generative UI for a Shopify store. Each reply is either a text message or a UI component, like a product card, rendered by a chat widget in the storefront.

Curricular stage project — Halue S.r.l. / Università degli Studi di Padova.

## How a message flows

1. The shopper types in the widget. `chat-widget/src/App.tsx` sends it with `useChat` to `/apps/chat-cart/chat`.
2. Shopify's app proxy forwards it to `app/routes/proxy.chat.tsx`, which loads the conversation from the DB and calls the agent.
3. `app/agent/agent.server.ts` runs the model with the tools in `app/agent/tools.server.ts`. Data tools read the store through `app/agent/storefront.server.ts`. A component tool (`showProductCard`, ...) returns the props of a widget component.
4. The reply streams back. `chat-widget/src/components/Message.tsx` turns each part into text or a component.

## Where things live

Backend (`app/`)
- `agent/agent.server.ts` — the agent: one `streamText` call, then 3 suggested replies.
- `agent/tools.server.ts` — every tool the agent can call.
- `agent/storefront.server.ts` — Storefront API queries.
- `agent/prompts.ts` — system prompt and suggestions prompt.
- `routes/proxy.chat.tsx`, `routes/proxy.events.tsx` — endpoints the widget calls.
- `conversations.server.ts` — saving and loading conversations.
- `metrics.server.ts` — widget events and dashboard stats.
- `routes/app._index.tsx`, `routes/app.theme/` — admin pages: stats and widget colors.

Widget (`chat-widget/src/`)
- `App.tsx` — the chat: messages, suggestions, sending.
- `conversation.ts` — talking to the backend: open a conversation, send events.
- `cart.ts` — the Shopify cart: read it, add to it.
- `components/Message.tsx` — renders one message, picking the component for each tool.
- `components/` — one file per component.
- `preview/` — the widget preview shown on the admin Theme page.

Shared (`shared/`), used by both sides
- `chat.ts` — message type, widget event schema, which event counts as each component's action.
- `product.ts` — product types and variant picking.
- `theme.ts` — widget colors.

`extensions/chat-widget/` is the theme app extension that mounts the widget bundle.

## Adding a component

1. A tool in `app/agent/tools.server.ts` that returns the component's props.
2. The component in `chat-widget/src/components/`, and a case for it in `Message.tsx`.
3. An entry in `COMPONENT_ACTIONS` in `shared/chat.ts`.
4. A line about it in the system prompt, `app/agent/prompts.ts`.

## Development

```bash
npm install
npm run dev
```

`npm run dev` resets and seeds conversations, then runs the app over an ngrok tunnel and the widget watcher together.

Turn the widget on in the theme editor, under App embeds → Chat Cart.
