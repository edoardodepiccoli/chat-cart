# chat-cart

Shopping assistant with a generative UI for a Shopify store. It talks with the shopper, finds products, and sends them to the product page. It never reads or changes the cart. Each reply is either text or a UI part, like a product card, rendered by a chat widget in the storefront.

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
- `metrics.server.ts` — widget events and dashboard stats.
- `log/` — terminal logging: levels, colors, request blocks, tool summaries.
- `routes/app._index.tsx` — admin home page: funnel.

Widget (`chat-widget/src/`)

- `App.tsx` — the chat: messages, suggestions, sending.
- `api.ts` — talking to the backend: load a conversation, send events.
- `context.ts` — the shopper context: country, language, page and visits, kept in `chat-cart:history`.
- `hooks/` — `useChatSession.ts`, `useLinkTracking.ts`.
- `components/Message.tsx` — renders one message, picking the part for each tool.
- `components/` — one file per component.
- `parts/` — one file per display tool, and `index.tsx` with the `PARTS` map.
- `i18n.ts`, `locales/` — English and Italian strings.

Shared (`shared/`), used by both sides

- `tools.ts` — every tool, with its input and output schemas.
- `chat.ts` — message type, widget event schema, which event counts as each part's action.
- `context.ts` — shopper context and page schemas.
- `product.ts` — product types and variant picking.

`extensions/chat-widget/` is the theme app extension that mounts the widget bundle.

`evals/` holds the scenarios and checks that run the real model.

## Adding a display tool

1. An entry in `shared/tools.ts`, with kind `display`, and its input and output schemas.
2. Its `execute` in `app/agent/tools.server.ts`, returning the output.
3. The component in `chat-widget/src/parts/`, and its line in `PARTS` in `parts/index.tsx`.
4. A line about it in the system prompt, `app/agent/prompts/system.ts`.

The compiler enforces steps 1 to 3. Step 4 is plain text, so the model only uses a tool the prompt describes.

## Development

```bash
npm install
npm run dev
```

`npm run dev` resets and seeds conversations, then runs the app over an ngrok tunnel and the widget watcher together.

Turn the widget on in the theme editor, under App embeds → Chat Cart.

Tests and evals:

```bash
npm test                   # unit tests
npm run eval -- --runs 3   # agent evals, against the real model and Storefront API
```

Evals need a fresh offline session: run `npm run dev` and open the app once before you run them.

### Logs

The app logs to the dev terminal, in color. Each request prints one block. It starts with `▶` and ends with `■ done`.

- `LOG_LEVEL` is `debug`, `info`, `warn` or `error`. The default is `info`. `debug` adds full payloads: the system prompt, raw tool output and model messages.
- `LOG_FORMAT` is `pretty` or `json`. The default is `json` in production and `pretty` otherwise.
- `NO_COLOR` turns colors off. `scripts/dev.sh` sets `FORCE_COLOR=1`.

Every line carries `conv=<first 5 chars>` and `req=<4 hex>`. Requests without a conversation carry only `req=`: webhooks, auth failures and client errors with no conversation. To follow one conversation, filter the output:

```bash
npm run dev 2>&1 | grep conv=ab12f
```

Widget failures show up as `ERROR client <kind>`. Evals default to `LOG_LEVEL=warn` and `LOG_FORMAT=pretty`.
