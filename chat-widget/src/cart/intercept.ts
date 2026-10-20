import type { Cart } from "./ajax";

export type CartWrite = "add" | "write";

type OnWrite = (kind: CartWrite, cart: Cart | null) => void;
type InterceptWin = {
  fetch: typeof fetch;
  XMLHttpRequest: typeof XMLHttpRequest;
};

const GUARD = "__chatCartIntercept";
const WRITE_PATH = /^cart\/(add|change|update|clear)(\.js)?$/;

export function cartWriteKind(
  url: string,
  root: string,
  origin: string,
): CartWrite | null {
  try {
    const parsed = new URL(url, origin);
    if (parsed.origin !== new URL(origin).origin) return null;
    if (!parsed.pathname.startsWith(root)) return null;
    const match = WRITE_PATH.exec(parsed.pathname.slice(root.length));
    if (!match) return null;
    return match[1] === "add" ? "add" : "write";
  } catch {
    return null;
  }
}

function toCart(body: unknown): Cart | null {
  return body !== null &&
    typeof body === "object" &&
    Array.isArray((body as { items?: unknown }).items)
    ? (body as Cart)
    : null;
}

function isOk(status: number): boolean {
  return status >= 200 && status < 300;
}

function report(onWrite: OnWrite, kind: CartWrite, cart: Cart | null): void {
  try {
    onWrite(kind, cart);
  } catch {
    // The theme must never see our errors.
  }
}

function fetchUrl(input: unknown): string {
  return typeof Request !== "undefined" && input instanceof Request
    ? input.url
    : String(input);
}

// Runs detached from the theme's promise: reads a clone, never the original body.
async function reportResponse(
  onWrite: OnWrite,
  kind: CartWrite,
  response: Response,
): Promise<void> {
  if (!isOk(response.status)) return;
  if (kind === "add") return report(onWrite, kind, null);
  let cart: Cart | null = null;
  try {
    cart = toCart(await response.clone().json());
  } catch {
    cart = null;
  }
  report(onWrite, kind, cart);
}

function xhrBody(xhr: XMLHttpRequest): unknown {
  if (xhr.responseType === "json") return xhr.response;
  return JSON.parse(xhr.responseText);
}

export function installIntercept(
  win: InterceptWin,
  root: string,
  origin: string,
  onWrite: OnWrite,
): typeof fetch {
  const guarded = win as InterceptWin & { [GUARD]?: typeof fetch };
  const saved = guarded[GUARD];
  if (saved) return saved;

  const original = win.fetch.bind(win);
  guarded[GUARD] = original;

  // cartWriteKind never throws.
  const kindOf = (url: string) => cartWriteKind(url, root, origin);

  // Rest args forward exactly what the theme passed, arity included.
  win.fetch = function chatCartFetch(...args: Parameters<typeof fetch>) {
    const pending = original(...args);
    let kind: CartWrite | null = null;
    try {
      kind = kindOf(fetchUrl(args[0]));
    } catch {
      kind = null; // e.g. a hostile toString on the input
    }
    if (kind) {
      const k = kind;
      // This handler is registered before the theme's, so the clone is taken
      // before the theme reads the body. The theme gets `pending` untouched.
      pending.then(
        (response) => reportResponse(onWrite, k, response).catch(() => {}),
        () => {},
      );
    }
    return pending;
  };

  const proto = win.XMLHttpRequest?.prototype as XMLHttpRequest | undefined;
  if (proto && typeof proto.open === "function") {
    const urls = new WeakMap<XMLHttpRequest, string>();
    const originalOpen = proto.open;
    const onLoad = (xhr: XMLHttpRequest): void => {
      try {
        const url = urls.get(xhr);
        const kind = url === undefined ? null : kindOf(url);
        if (!kind || !isOk(xhr.status)) return;
        if (kind === "add") return report(onWrite, kind, null);
        let cart: Cart | null = null;
        try {
          cart = toCart(xhrBody(xhr));
        } catch {
          cart = null;
        }
        report(onWrite, kind, cart);
      } catch {
        // Never throw into the theme.
      }
    };
    // Rest args keep `open(method, url)` from becoming
    // `open(method, url, undefined)`, which would make the request synchronous.
    proto.open = function chatCartOpen(
      this: XMLHttpRequest,
      ...args: unknown[]
    ): void {
      try {
        const first = !urls.has(this);
        urls.set(this, String(args[1]));
        // The arrow captures this XHR; don't rely on the listener's `this`.
        if (first) this.addEventListener("load", () => onLoad(this));
      } catch {
        // Never throw into the theme.
      }
      return (originalOpen as (...a: unknown[]) => void).apply(this, args);
    } as XMLHttpRequest["open"];
  }

  return original;
}
