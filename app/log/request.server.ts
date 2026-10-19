import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import type { z } from "zod";
import type { Fields, Tag } from "./format";
import { log, setBeforeWrite, setContextProvider } from "./logger.server";

type Store = {
  req: string;
  conv?: string;
  route: string;
  start: number;
  ended: boolean;
  warned: boolean;
  pending?: string;
};

const storage = new AsyncLocalStorage<Store>();

const TAGS: Record<string, Tag> = {
  chat: "chat",
  events: "events",
  webhook: "webhook",
};

const tagFor = (route: string): Tag => TAGS[route] ?? "server";

setContextProvider(() => {
  const store = storage.getStore();
  return store && { req: store.req, conv: store.conv, route: store.route };
});

function flush(store: Store) {
  const message = store.pending;
  if (message === undefined) return;
  store.pending = undefined;
  log.info(
    tagFor(store.route),
    message,
    {},
    { edge: "start", time: new Date(store.start) },
  );
}

setBeforeWrite((level) => {
  const store = storage.getStore();
  if (!store) return;
  flush(store);
  if (level === "warn" || level === "error") store.warned = true;
});

export function bindRequest<F extends (...args: never[]) => unknown>(fn: F): F {
  const store = storage.getStore();
  if (!store) return fn;
  return ((...args: Parameters<F>) =>
    storage.run(store, () => fn(...args))) as F;
}

export function requestTag(): Tag {
  const store = storage.getStore();
  return store ? tagFor(store.route) : "server";
}

export function setConversation(id: string) {
  const store = storage.getStore();
  if (!store) return;
  store.conv = id;
  flush(store);
}

export function endRequest(
  status: number | "error" | "cancelled",
  fields: Fields = {},
) {
  const store = storage.getStore();
  if (!store || store.ended) return;
  store.ended = true;
  flush(store);
  log.info(
    tagFor(store.route),
    "done",
    { status, ms: Date.now() - store.start, ...fields },
    { edge: "end" },
  );
}

export function logRejected(tag: Tag, issues: z.core.$ZodIssue[]) {
  log.warn(tag, "invalid body");
  for (const issue of issues) {
    log.warn(
      tag,
      `${issue.path.join(".") || "(body)"}: ${issue.message}`,
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
      warned: false,
    };
    const path =
      route === "webhook" ? new URL(args.request.url).pathname : `/${route}`;
    store.pending = `${args.request.method} ${path}`;
    return storage.run(store, async () => {
      const tag = tagFor(route);
      try {
        const response = await handler(args);
        if (!options.endsLater) endRequest(response.status);
        return response;
      } catch (error) {
        if (error instanceof Response) {
          if (store.warned)
            log.info(tag, "rejected", { status: error.status }, { depth: 1 });
          else log.warn(tag, "rejected", { status: error.status });
          endRequest(error.status);
        } else {
          log.error(tag, "failed", {
            error: `"${error instanceof Error ? error.message : String(error)}"`,
          });
          endRequest(500);
        }
        throw error;
      }
    });
  };
}
