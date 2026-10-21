import { useSyncExternalStore } from "react";

import { horizonSections, notifyTheme } from "./cartEvent";
import { t } from "./i18n";
import { ROOT, variantIdFromGid } from "./urls";

// The shopper's cart is Shopify's cookie cart, read and written through the
// AJAX Cart API. The widget keeps the last cart Shopify sent, re-reads it
// whenever the theme changes it, and tells the theme about its own changes.

export type CartItem = {
  key: string;
  variant_id: number;
  product_title: string;
  image: string | null;
  url: string;
  quantity: number;
  final_line_price: number;
  options_with_values: { name: string; value: string }[];
  product_has_only_default_variant: boolean;
};

export type Cart = {
  token: string;
  item_count: number;
  total_price: number;
  currency: string;
  items: CartItem[];
};

export type CartState = {
  cart: Cart | null;
  // The variant GID or line key being written.
  pending: string | null;
  error: { key: string; message: string } | null;
};

type Sections = Record<string, string | null>;

let state: CartState = { cart: null, pending: null, error: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<CartState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCartState(): CartState {
  return state;
}

export function useCart(): CartState {
  return useSyncExternalStore(subscribe, getCartState);
}

export function inCart(cart: Cart | null, variantGid: string): boolean {
  const id = variantIdFromGid(variantGid);
  return cart?.items.some((item) => item.variant_id === id) ?? false;
}

// An error Shopify answered with, whose message can be shown as is.
class CartError extends Error {}

// startCart swaps in the page's own fetch, saved before it is wrapped, so the
// widget's requests are not mistaken for theme writes.
let originalFetch: typeof fetch = (...args) => fetch(...args);

const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function request<T>(path: string, body?: object): Promise<T> {
  const response = await originalFetch(
    `${ROOT}${path}`,
    body === undefined
      ? { headers: HEADERS }
      : { method: "POST", headers: HEADERS, body: JSON.stringify(body) },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new CartError(data.description || data.message || t("cartFailed"));
  }
  return data as T;
}

// Asks Shopify to render the theme's cart sections along with a write.
function withSections(body: object): object {
  const ids = horizonSections();
  return ids.length
    ? { ...body, sections: ids.join(","), sections_url: location.pathname }
    : body;
}

export async function refreshCart(): Promise<void> {
  try {
    setState({ cart: await request<Cart>("cart.js") });
  } catch {
    // Keep the last cart; the next write, panel open or tab focus re-reads.
  }
}

// One write at a time: the UI disables every cart button while one is pending.
async function write(
  key: string,
  send: () => Promise<{ cart: Cart; sections: Sections }>,
): Promise<boolean> {
  if (state.pending !== null) return false;
  setState({ pending: key, error: null });
  try {
    const { cart, sections } = await send();
    setState({ cart });
    notifyTheme(cart, sections);
    return true;
  } catch (error) {
    const message =
      error instanceof CartError ? error.message : t("cartFailed");
    setState({ error: { key, message } });
    // Shopify can apply part of a quantity it cannot fully satisfy.
    await refreshCart();
    return false;
  } finally {
    setState({ pending: null });
  }
}

export function addToCart(variantGid: string): Promise<boolean> {
  return write(variantGid, async () => {
    const { sections } = await request<{ sections?: Sections }>(
      "cart/add.js",
      withSections({
        items: [{ id: variantIdFromGid(variantGid), quantity: 1 }],
      }),
    );
    // The add answer holds only the added item, so read the whole cart.
    return { cart: await request<Cart>("cart.js"), sections: sections ?? {} };
  });
}

export function changeQuantity(
  lineKey: string,
  quantity: number,
): Promise<boolean> {
  return write(lineKey, async () => {
    const { sections, ...cart } = await request<Cart & { sections?: Sections }>(
      "cart/change.js",
      withSections({ id: lineKey, quantity }),
    );
    return { cart, sections: sections ?? {} };
  });
}

const CART_WRITE = /\/cart\/(add|change|update|clear)(\.js)?$/;

function isCartWrite(url: string): boolean {
  try {
    return CART_WRITE.test(new URL(url, location.origin).pathname);
  } catch {
    return false;
  }
}

// Re-reads the cart after every cart write the theme makes, through fetch
// (modern themes) or XMLHttpRequest (older jQuery themes). The theme gets the
// same response, or the same rejection, it would get without the wrapper.
function watchTheme() {
  const pageFetch = window.fetch.bind(window);
  originalFetch = pageFetch;
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await pageFetch(...args);
    const input = args[0];
    const url = input instanceof Request ? input.url : String(input);
    if (response.ok && isCartWrite(url)) void refreshCart();
    return response;
  };

  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    ...args: unknown[]
  ) {
    if (isCartWrite(String(args[1]))) {
      this.addEventListener("load", () => {
        if (this.status >= 200 && this.status < 300) void refreshCart();
      });
    }
    // Rest args keep open(method, url) from becoming a synchronous request.
    return (open as (...a: unknown[]) => void).apply(this, args);
  } as XMLHttpRequest["open"];
}

let started = false;

export function startCart(): void {
  if (started) return;
  started = true;
  // A failed setup must not take the chat down: log it and show no cart.
  try {
    watchTheme();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void refreshCart();
    });
    void refreshCart();
  } catch (error) {
    console.error(error);
  }
}
