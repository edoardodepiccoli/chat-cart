# chat-cart

Conversational assistant with a generative UI for a Shopify store. Curricular stage project — Halue S.r.l. / Università degli Studi di Padova.

**Core philosophy: keep things stupid simple.** Prefer the boring solution. Don't build abstractions before the second use case shows up.

---

## Coding workflow

- Work on the `develop` branch.
- Write [conventional commits](https://www.conventionalcommits.org/).
- **Never co-author commits.** No `Co-Authored-By` trailers.
- Use the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) for all Shopify API and platform work — its skills, plus the `shopify-dev-mcp` server already wired in `.mcp.json`. Don't add Shopify tooling to this repo.
- **Work in small steps.** One focused change at a time, reviewed before the next. A request is scoped to exactly what it says — don't refactor neighbouring code, restructure the app, or add unasked-for features along the way. If something bigger seems needed, say so and wait.

---

## App scope

A chat widget embedded in a Shopify storefront. Unlike a plain text chatbot, each reply is **either** natural language **or** a real UI component, picked from a small fixed library and populated live from the conversation context.

Two layers:

- **app layer** — React/TypeScript chat widget in the storefront. Renders the conversation and whatever components the backend tells it to render. No application logic of its own.
- **agent layer** — Node backend. Hosts the agent, owns conversation state, holds the tools that query the Shopify Storefront and Admin APIs.

### v1 = OB1–OB5 done

Nothing else ships until all five are complete.

- **OB1** — app layer: chat widget (React/TS) in the storefront, responsible only for displaying the conversation and the UI components received from the backend.
- **OB2** — agent layer: Node backend with a tool-calling agent that queries the Shopify Storefront/Admin APIs for the store data it needs.
- **OB3** — the agent answers in natural language (general FAQ, product FAQ, clarifying questions about the user's need) **or** selects and populates a predefined UI component, based on conversation context.
- **OB4** — library of at least 2–3 flexible React components (e.g. product/recommendation card, newsletter signup form with a copyable discount code), plus three clickable suggested messages generated with every reply.
- **OB5** — engagement and conversion metrics on widget usage (interactions, component clicks, completed actions), to measure whether the approach works.

### Explicitly out of v1

Only after OB1–OB5 are done:

- **DE1** — Shopify Markets support, multiple languages and currencies
- **DE2** — order status / post-sale component
- **FA1** — Hydrogen proof of concept reusing the widget's React components
- **FA2** — comparison of custom retrieval tools vs the official Shopify MCP vs a custom MCP

### Distribution

**Custom distribution, single store.** Not an App Store app.

---

## Models

Everything goes through the **Vercel AI Gateway**: one `AI_GATEWAY_API_KEY`, no per-provider keys.

**DeepSeek runs the agent.** Model ids are gateway ids (`deepseek/...`), passed as plain strings: `ai` resolves them through its default gateway provider, no `createGateway`. `ai@^7`, `@ai-sdk/react` and `zod@^4` are installed. Model: `deepseek/deepseek-v4.1-flash`. `AI_GATEWAY_API_KEY` lives in `.env` (gitignored).

The agent lives in `app/agent/agent.server.ts`, its tools in `app/agent/tools.server.ts`, its two prompts in `app/agent/prompts.ts`: one `streamText` call with tools and `stopWhen`, the AI SDK runs the tool loop. **A UI component is a tool whose output is the component's props** (`showProductCard` returns a `Product`, `shared/product.ts`); the widget renders `tool-<name>` parts in `chat-widget/src/components/Message.tsx`. After the reply, one `generateText` call writes the 3 suggestions as a `data-suggestions` part. Everything streams to the widget over SSE (`createUIMessageStreamResponse` on the server, `useChat` in the widget). Data tools: `listProducts` (filters include collection, product type and vendor), `listCollections`, `getProduct`, `listStorePages`, `getStorePage`, backed by `app/agent/storefront.server.ts` (Storefront API queries through the app proxy's `storefront` client, `@inContext` of the shopper's market). Component tools: `showProductCard`, `showProductCards`, `showFaqCard`, `showCart`. `ChatMessage` (`shared/chat.ts`) infers its tool types from the agent's tools (`ChatTools` in `tools.server.ts`), so there is no hand-written tool type list. Adding a component: a tool in `tools()`, a case in `chat-widget/src/components/Message.tsx`, an entry in `COMPONENT_ACTIONS` (`shared/chat.ts`, maps the tool to the event that counts as its action; `COMPONENT_TOOLS` is derived from it), and a line in the prompt.

Conversations live in the DB (`app/conversations.server.ts`). Widget events and dashboard stats live in `app/metrics.server.ts`. The widget keeps the conversation id in localStorage (`chat-cart:conversationId`) and, on mount, calls `GET /apps/chat-cart/chat?id=…`, which finds the conversation or creates a new one and returns its id and messages. If the call fails, the widget retries once without an id. Sending a message POSTs only `{ id, text, country, language }`, validated with zod. The server builds the user message itself (one text part), loads the history from the DB, saves the user message, runs the agent on the full history, and saves the assistant message in `onEnd`. Widget events POST to `/apps/chat-cart/events` (schema in `shared/chat.ts`); `added_to_cart` carries the variant price, which the stats sum for cart and checkout value.

**Jev (`typesafe-ai/jev`, `experimental_evaluate` from `ai`)** is not in the agent loop: it answers typed questions (`boolean`, `choice`, `score`), it doesn't call tools or stream. Reach for it only for an isolated yes/no/score decision outside the loop.

---

## Desired agent behaviour

Goal: conversion. The agent is a world-class personal shopper: warm, brief, honest, always moving the shopper one step toward add-to-cart and checkout. Prompt changes are judged against this list.

**Tone**
- Friendly and human, one short paragraph, shopper's language, no markdown, no emoji.
- React to what the shopper said, then lead. Proactive, never pushy.

**Discovery**
- Show early, ask little: at most one easy question, with choices, only when the request is too vague to pick anything.
- Curate 2–4 best matches, name a favorite and one reason tied to what the shopper said.
- Remember what the shopper said (who it's for, size, style, budget) and never ask twice.
- Handle price doubts with value or a cheaper match.
- Suggest one relevant add-on or complement after a product is picked or added to the cart.

**Honesty and trust**
- Answer only from tool data. Never invent products, prices, stock, specs, reviews, popularity or urgency.
- Frame facts positively, but answer direct questions about flaws or missing info truthfully. When the answer isn't in the data, say so plainly and offer the nearest real strength or the contact page. Never bluff.
- Re-check prices, sales and stock with tools every time they matter.

**Handoff**
- When the agent can't answer, the shopper asks for a human, or the case is complex or high value, show the contact page. Never loop or dead-end.

**Next step**
- Every reply ends one step closer to buying: shortlist, favorite, size and color, add to cart, checkout.
- Cart-aware nudges (free-shipping threshold, complements) once the widget sends the cart.

**Scope**
- Off-topic messages steer back to shopping. Orders, discount codes and reviews are out of reach: turn to what the agent can do now.

**Measurement**
- Judge by conversion of assisted vs unassisted sessions, AOV, component clicks and completed actions (OB5), not by chat length.

The full spec, with numbered requirements, is `.claude/agent-requirements.md`.

---

## Stack

Shopify **React Router** app template — not Remix.

- `react-router` 7.18.2 (pinned), `@shopify/shopify-app-react-router` ^1.2.1
- App Bridge React + Polaris **web components** (`@shopify/polaris-types` only — there is no Polaris runtime package)
- Prisma ^6.16.3 + SQLite — sessions, plus `Conversation` / `Message` (AI SDK UI messages, `parts` as `Json`)
- Vite ^6.3.6, TypeScript ^5.9.3
- Node `>=20.19 <22 || >=22.12`, enforced (`engine-strict=true`)
- **npm** — `package-lock.json` is the lockfile.
- `extensions/chat-widget` — theme app extension (app embed) that mounts the widget bundle built from `chat-widget/`.
- `shared/` — code and types used by both the backend and the widget: `chat.ts` (messages, event schema, component→action map), `product.ts` (product types, variant picking), `theme.ts`.
- Storefront talks to the backend through the app proxy `/apps/chat-cart/*` → `/proxy/*`. `authenticate.public.appProxy` returns a `storefront` client for agent tools.
- Admin UI is one embedded Home page (`app/routes/app._index.tsx`): the lifetime funnel on top, then the theme editor (widget color fields saved to the `chat_cart.theme` app metafield, which the app embed reads as inline CSS variables, with a live preview built from the widget's own components in `chat-widget/src/preview/`).
- Scopes live in `shopify.app.toml`: `write_app_proxy,unauthenticated_read_product_listings,unauthenticated_read_product_tags,unauthenticated_read_content`
- No GraphQL codegen.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | runs `reset` and `seed`, then `widget:dev` in the background and `shopify app dev` over an ngrok tunnel (all in `scripts/dev.sh`; runs `shopify.web.toml`: prisma generate, migrate deploy, react-router dev) in the foreground. Ctrl+C stops both. Widget replies stream, embedded admin doesn't load on ngrok's free tier. Needs local `ngrok` (`brew install ngrok`, `ngrok config add-authtoken`), never a repo dependency |
| `npm run widget:dev` | rebuilds the widget bundle on change (already started by `dev`) |
| `npm run build` | `react-router build` |
| `npm run setup` | `prisma generate && prisma migrate deploy` |
| `npm run reset` | deletes all conversations, messages and events, keeps sessions |
| `npm run seed` | adds 400 demo widget loads (100 chats with messages and events) over the last 30 days to the first session's shop. Products in `scripts/seed-products.json` |
| `npm run lint` | eslint |
| `npm run typecheck` | `react-router typegen && tsc --noEmit` |
| `npm run eval` | runs the eval conversations against the real agent and the dev store (`-- <name or requirement id>` to filter, `--runs 3` to repeat, `--verbose` for every transcript). Exits 1 on any failure, saves a report in `evals/results/` |
| `npm run deploy` | `shopify app deploy` |

No unit tests yet. Agent behaviour is tested with evals: `evals/run.ts` runs each scenario through `runAgent` (the same agent `streamReply` uses) with a Storefront client built from the offline session in the DB, then applies the `CONTRACT` checks plus the scenario's own. A new feature gets a scenario in `evals/scenarios.ts` (with the requirement ids it `covers`) and, if needed, a check helper in `evals/checks.ts`. Run it with `--runs 3` before and after a prompt change: the model is not deterministic, so compare pass rates, not single runs.
