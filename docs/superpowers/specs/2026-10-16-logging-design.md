# Readable, traceable logging

## Goal

From one conversation, follow everything that happened in the dev terminal — requests, shopper context, agent steps, tool inputs and results, suggestions, teasers, saves, timings and errors — in colored, detailed, skimmable lines, grouped by conversation and request.

## Context

- Today: three dev-only `console.log` lines in `app/agent/agent.server.ts`, two in the webhook routes, one `console.error` in `app/entry.server.tsx`. They mix with Shopify CLI and Vite output and carry no conversation id.
- Most failures are swallowed silently: teaser generation, catalog loading, suggestion retries, chat stream errors, invalid request bodies. Widget failures never reach the server.

## Decisions

- Read logs in the terminal. No trace viewer, no external tool.
- In-house logger, no new dependencies.
- Default level shows detailed, multi-line, human-readable events; `LOG_LEVEL=debug` adds full payloads.
- The widget reports its failures to the server.

## Success criteria

- Every server request logs a start line and exactly one end line with status and duration.
- Every line inside a request carries the request's `conv=` and `req=` ids without call sites passing them; `grep conv=<id>` returns a whole turn.
- No failure is silent: every caught error is logged with its message.
- No `console.log` / `console.error` remains in `app/` outside the logger.
- Access tokens, session data and request headers are never logged.
- Unit tests cover formatting, summaries, level filtering, request context and widget error reporting; typecheck, lint, tests, widget build and app build pass.

## Output format

### Line layout

```
HH:MM:SS.mmm LEVEL tag     <indent>message               key=value …
```

- Time with milliseconds, level (`DEBUG`, `INFO`, `WARN`, `ERROR`) padded to 5, tag padded to 7.
- Indent (2 spaces per level) shows nesting: request → step → tool → detail.
- Message column padded so key=value fields align.
- `▶` marks a request start, `■` its end. A blank line precedes each `▶`.
- Every line inside a request ends with dim `conv=<first 5 chars>` and `req=<4 hex chars>` (omitted when there is no conversation).
- Quoted model and shopper text is cut at 160 characters with `…`.

### Colors

- Time dim gray. Levels: `INFO` default, `WARN` yellow, `ERROR` red with bold red message, `DEBUG` dim.
- Tags, one color each: `chat` blue, `context` cyan, `agent` magenta, `tool` green, `suggest` yellow, `teaser` yellow, `db` gray, `events` white, `client` red, `webhook` blue.
- Labels (`tokens`, `input`, `result`, …) dim; values default.
- Shopper text bold; model text, teasers and suggestions italic.
- `⚠` notes yellow; `✓` green; `✗` red.
- `ms=` yellow at ≥ 2000, red at ≥ 5000.
- `▶` / `■` lines bold.
- Colors off when stdout is not a TTY or `NO_COLOR` is set; `FORCE_COLOR` forces them on.

### Configuration

- `LOG_LEVEL`: `debug | info | warn | error`, default `info`.
- `LOG_FORMAT`: `pretty | json`. Default `json` when `NODE_ENV=production`, else `pretty`.
- JSON format: one object per line: `{ time, level, tag, message, depth, fields, conv, req, route, payload? }`, no colors.
- `LOG_LEVEL=debug` prints `payload` (pretty: indented JSON block under the line, dim).

### Example: one chat turn (info)

```
10:42:07.312 INFO  chat    ▶ POST /chat              conv=ab12f req=7f3c
10:42:07.312 INFO  chat      shopper says            "do you have this in 50ml?"
10:42:07.312 INFO  chat      history                 6 saved messages, 4 sent to model (2 tool parts dropped)
10:42:07.312 INFO  chat      flags                   teaser=no first-reply=no
10:42:07.401 INFO  context   shopper                 market=IT/it
10:42:07.401 INFO  context     page                  product "Vitamin C Serum" (serum)
10:42:07.401 INFO  context     visited               1. collection "Eye Care" (eyes)
10:42:07.401 INFO  context                           2. search "retinol"
10:42:07.401 INFO  context                           3. product ⚠ unknown (old-serum) — dropped
10:42:07.401 INFO  context     catalog               1 query, 2 handles, ms=83
10:42:08.902 INFO  agent     step 0                  ms=1501
10:42:08.902 INFO  agent       tokens                in=4120 out=38 (cached 3900)
10:42:08.902 INFO  agent       finish                tool-calls
10:42:08.903 INFO  tool          getProduct          ms=210
10:42:08.903 INFO  tool            input             handle=serum
10:42:08.903 INFO  tool            result            "Vitamin C Serum", 2 variants (30 ml ✓, 50 ml ✓), €29.00–€45.00
10:42:10.115 INFO  agent     step 1                  ms=1212
10:42:10.115 INFO  agent       tokens                in=6230 out=61
10:42:10.115 INFO  agent       text                  "Yes, the 50 ml is in stock — here it is."
10:42:10.116 INFO  tool          showProducts        ms=180
10:42:10.116 INFO  tool            input             handles=[serum]
10:42:10.116 INFO  tool            result            1. "Vitamin C Serum" €45.00
10:42:10.116 INFO  agent       finish                display tool (stop)
10:42:10.980 INFO  suggest   ok                      attempt=1 ms=863
10:42:10.980 INFO  suggest     replies               "Good for oily skin?" | "Shipping to Italy?" | "Something cheaper?"
10:42:10.981 INFO  db        saved                   2 messages
10:42:10.981 INFO  chat    ■ done                    status=200 ms=3669
10:42:10.981 INFO  chat      totals                  steps=2 tools=2 tokens in=10350 out=99
```

## Events

### Chat (`POST /chat`)

- Start: shopper text, history (saved messages, sent to model, tool parts dropped), flags (`teaser`, `first-reply`).
- Context block (below).
- Teaser turn: a `teaser-turn` line naming the tool the prompt points to.
- Each step: ms, tokens in/out/cached, finish reason, text if any.
- Each tool: ms, input as key=value, result summary (below), or `⚠ error "<message>"`.
- Suggestions: each attempt (`ok` / `retry` with the reason), the replies, or `✗ failed` after 3 attempts.
- Save: number of messages saved.
- End: `■ done` with status and ms, totals (steps, tools, tokens). Logged from the stream's end and error callbacks, because the route returns before streaming finishes. A stream error logs `ERROR agent stream failed` with the message, then `■ done status=error`.
- Debug payloads: system prompt, model messages sent, each raw tool output, final reply message.

### Context block (chat and teasers)

- `shopper`: `market=<country>/<language>`; omit country when empty.
- `page`: type, resolved title in quotes, raw handle in parentheses; search shows the terms; `other` shows `other`.
- `visited`: numbered, oldest first; unresolved handles as `⚠ unknown (<handle>) — dropped`.
- `catalog`: number of queries, handles resolved, ms; or `⚠ failed, empty catalog` with the error; or `skipped` when there is nothing to resolve.
- Debug payload: the exact context prompt text.

### Tool result summaries

- `listProducts`: filters used, match count, first 5 titles with price range, `+N more`.
- `listCollections`: count and titles.
- `getProduct`: title, variants with option values and ✓ / ✗ availability, price range; `⚠ not found` for null.
- `listStorePages`: count and titles.
- `getStorePage`: title and text length; `⚠ not found` for null.
- `showProducts`: numbered titles with prices.
- `showFaqCard`: page title and the answer in quotes.

### Teasers (`POST /teasers`)

- Start, context block, `page details` (product: description length and option count; collection: product count; search: match count), `chat` (number of lines).
- `skipped` with reason when the raw or resolved page is `other`.
- Each generation attempt: ms, `ok` or `retry` with the rejection reason.
- Result: the three teasers numbered; or `⚠ timeout` at 10000 ms; or `✗ failed` with the error.
- End line as for every request.

### Other

- Conversation load (`GET /chat`): `found` with message count, `created`, or `⚠ unknown id, created new`.
- Widget events (`POST /events`): type and data on one line, e.g. `product_clicked handle=serum`; `⚠ unknown conversation` when not saved.
- Client errors: `ERROR client <kind>` with `message`, `open`, `busy`, `page`.
- Webhooks: topic and shop.
- Rejected requests: 400 lists the zod issue paths and messages, e.g. `context.page.handle: too long`; 401 logs `auth failed`; 404 logs what was not found.
- Uncaught render errors in `app/entry.server.tsx`: `ERROR server render failed` with the error.

## Architecture

### New units in `app/log/`

- `logger.server.ts`: `log.debug | info | warn | error(tag, message, fields?, options?)` where `options` holds `depth` and `payload`. Reads `LOG_LEVEL`, `LOG_FORMAT`; writes through a replaceable sink (stdout by default; tests inject one). Adds the current request context to every event.
- `request.server.ts`: `AsyncLocalStorage` holding `{ req, conv?, route, start, ended }`. `withRequestLog(route, handler, { endsLater? })` wraps a loader or action: logs `▶`, runs the handler inside the context, logs `■ done` with status and ms unless `endsLater` (chat action), and converts thrown `Response`s into the matching warn line before rethrowing. `setConversation(id)` stores the conversation id once known. `endRequest(status, fields)` logs `■ done` once for `endsLater` routes.
- `format.ts`: pure `formatPretty(event, { color })` and `formatJson(event)`. No I/O.
- `summaries.ts`: pure `summarizeToolResult(toolName, output)` returning display strings.

### Changes to existing code

- Routes `proxy.chat.tsx`, `proxy.teasers.tsx`, `proxy.events.tsx`, `webhooks.app.*.tsx`: wrapped with `withRequestLog`; zod failures logged with issue paths.
- `app/agent/agent.server.ts`: `onStepEnd` and a new `onError` log through the logger; `streamReply` logs save, totals and calls `endRequest`; `DEBUG` and `console.log` removed.
- `app/agent/tools.server.ts`: each `execute` wrapped once by `logged(name, execute)` recording ms, input, summary and errors. Tool definitions unchanged.
- `app/agent/context.server.ts`: `resolveContext` additionally returns the dropped entries; `loadCatalog` logs query count, handles, ms, failures.
- `app/agent/suggestions.server.ts`, `app/agent/teasers.server.ts`: log attempts, rejection reasons, timeout and failure.
- `app/conversations.server.ts`: log found / created / saved.
- `app/entry.server.tsx`: `console.error` replaced by the logger.
- `evals/`: default `LOG_LEVEL=warn` unless set.

### Widget

- `shared/chat.ts`: new event `client_error { kind, message, open, busy, page }` with `kind` one of `conversation_load_failed | chat_stream_failed | reset_failed | teasers_failed`, `message` ≤ 500, `page` ≤ 200.
- `chat-widget/src`: send it on each of those four failures through `sendEvent`. Conversation-load failure has no conversation id; it is sent with `conversationId: null` and the server logs it without saving.
- `proxy.events.tsx`: accepts `conversationId: null` only for `client_error`; logs at `ERROR`.

### Dev script

- If Shopify CLI strips colors from the web process, `scripts/dev.sh` exports `FORCE_COLOR=1`. Checked first during implementation.

## Testing

- `format.ts`: field line, nested indent, each level color, color off, `ms` thresholds, JSON shape with request context, truncation.
- `summaries.ts`: each tool's summary from sample output, empty results, not-found, error.
- `logger.server.ts`: level filtering, debug payload only at `debug`.
- `request.server.ts`: context visible in nested async calls and in a callback started inside the request; `done` once; thrown 400 logged and rethrown; `endsLater` waits for `endRequest`.
- Widget: each failure sends `client_error` with the right `kind` (stubbed `fetch`).
- `chatEventSchema`: `client_error` valid and too-long cases.
- Manual: one chat turn, a teaser tap, a reset, a forced stream error under `npm run dev`; colors visible; `grep conv=` gives the whole turn; `LOG_LEVEL=debug` and `LOG_LEVEL=warn` behave as above.

## Out of scope

- Persisting logs to a file or the database, a trace viewer, external observability tools.
- Logging inside the widget beyond reporting the four failures.
