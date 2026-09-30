# chat-cart

Conversational assistant with a generative UI for a Shopify store. Each reply is either a text message or a UI component, like a product card, rendered by a chat widget in the storefront.

Curricular stage project — Halue S.r.l. / Università degli Studi di Padova.

## Layout

- `app/` — Node backend (Shopify React Router app). The chat endpoint is `app/routes/proxy.chat.tsx`, reached from the storefront through the app proxy at `/apps/chat-cart/chat`.
- `chat-widget/` — React widget, bundled into `extensions/chat-widget/assets`.
- `extensions/chat-widget/` — theme app extension that mounts the widget.

## Development

```bash
npm install
npm run dev
```

`npm run dev` asks which tunnel to use (Cloudflare or ngrok) and whether to reset conversations, then runs the app and the widget watcher together.

Turn the widget on in the theme editor, under App embeds → Chat Cart.
