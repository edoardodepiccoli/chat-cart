# chat-cart

Conversational assistant with a generative UI for a Shopify store. Each reply is either a text message or a UI component, like a product card, rendered by a chat widget in the storefront.

Curricular stage project — Halue S.r.l. / Università degli Studi di Padova.

## Layout

- `app/` — Node backend (Shopify React Router app). The chat endpoint is `app/routes/proxy.chat.tsx`, reached from the storefront through the app proxy at `/apps/chat-cart/chat`.
- `app/agent/` — the agent: tools, prompts and Storefront API queries.
- `app/routes/app._index.tsx`, `app/routes/app.theme/` — embedded admin pages: usage stats and widget colors.
- `chat-widget/` — React widget, bundled into `extensions/chat-widget/assets`.
- `extensions/chat-widget/` — theme app extension that mounts the widget.
- `shared/` — types and helpers used by both the backend and the widget.

## Development

```bash
npm install
npm run dev
```

`npm run dev` resets and seeds conversations, then runs the app over an ngrok tunnel and the widget watcher together.

Turn the widget on in the theme editor, under App embeds → Chat Cart.
