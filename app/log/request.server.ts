import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import type { z } from "zod";
import type { Fields, Tag } from "./format";
import { log, setContextProvider } from "./logger.server";

type Store = {
  req: string;
  conv?: string;
  route: string;
  start: number;
  ended: boolean;
};

const storage = new AsyncLocalStorage<Store>();

const TAGS: Record<string, Tag> = {
  chat: "chat",
  teasers: "teaser",
  events: "events",
  webhook: "webhook",
};

const tagFor = (route: string): Tag => TAGS[route] ?? "server";

setContextProvider(() => {
  const store = storage.getStore();
  return store && { req: store.req, conv: store.conv, route: store.route };
});

export function requestTag(): Tag {
  const store = storage.getStore();
  return store ? tagFor(store.route) : "server";
}

export function setConversation(id: string) {
  const store = storage.getStore();
  if (store) store.conv = id;
}

export function endRequest(status: number | "error", fields: Fields = {}) {
  const store = storage.getStore();
  if (!store || store.ended) return;
  store.ended = true;
  log.info(
    tagFor(store.route),
    "■ done",
    { status, ms: Date.now() - store.start, ...fields },
    { edge: "end" },
  );
}

export function logRejected(tag: Tag, issues: z.core.$ZodIssue[]) {
  log.warn(tag, "invalid body");
  for (const issue of issues) {
    log.warn(
      tag,
      `${issue.path.join(".")}: ${issue.message}`,
      {},
      { depth: 1 },
    );
  }
}

export function withRequestLog<A extends { request: Request }>(
  route: string,
  handler: (args: A) => Promise<Response>,
  options: { endsLater?: boolean } = {},
): (args: A) => Promise<Response> {
  return (args) => {
    const store: Store = {
      req: randomBytes(2).toString("hex"),
      route,
      start: Date.now(),
      ended: false,
    };
    return storage.run(store, async () => {
      const tag = tagFor(route);
      log.info(tag, `${args.request.method} /${route}`, {}, { edge: "start" });
      try {
        const response = await handler(args);
        if (!options.endsLater) endRequest(response.status);
        return response;
      } catch (error) {
        if (error instanceof Response) {
          log.warn(tag, "rejected", { status: error.status });
          endRequest(error.status);
        } else {
          log.error(tag, "failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          endRequest(500);
        }
        throw error;
      }
    });
  };
}
