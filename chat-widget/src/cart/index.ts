import { useSyncExternalStore } from "react";

import { t } from "../i18n";
import { ROOT, variantNumber } from "../urls";
import { pickAdapter } from "./adapters";
import { createCartApi } from "./ajax";
import type { Cart } from "./ajax";
import { installCatchup } from "./catchup";
import { installIntercept } from "./intercept";
import { createCartStore } from "./store";
import type { CartState, CartStore } from "./store";

let store: CartStore | null = null;

export function startCart(): void {
  if (store) return;
  // A failed setup must not take the chat down: report it and leave `store`
  // null, so useCart and cartSnapshot serve an empty cart.
  try {
    // Wiring order: the intercept goes in first so the store reads through
    // the original fetch, and its callback closes over `store`, assigned
    // just below. The store's onLocalChange closes over `catchup`, declared
    // after the store. Both are safe because no callback can fire
    // synchronously between these statements: theme writes, store writes
    // and the first load all settle asynchronously.
    const originalFetch = installIntercept(
      window,
      ROOT,
      location.origin,
      (_kind, cart) => store?.themeWrote(cart),
    );
    const created = createCartStore({
      api: createCartApi(originalFetch, ROOT),
      adapter: pickAdapter(window.Shopify?.theme?.schema_name),
      onLocalChange: () => catchup.announce(),
      failMessage: t("cartFailed"),
    });
    store = created;
    const catchup = installCatchup({
      win: window,
      doc: document,
      channel:
        typeof BroadcastChannel === "undefined"
          ? null
          : new BroadcastChannel("chat-cart:cart"),
      refresh: (withTheme) => created.refresh(withTheme),
    });
    void created.load();
  } catch (error) {
    console.error(error);
  }
}

const idle: CartState = { cart: null, pending: null, error: null };
const noSubscription = () => () => {};

export function useCart(): CartState & {
  add(gid: string): Promise<void>;
  setQuantity(key: string, q: number): Promise<void>;
} {
  const state = useSyncExternalStore(
    store ? store.subscribe : noSubscription,
    store ? store.getSnapshot : () => idle,
  );
  return {
    ...state,
    add: (gid) => store?.add(gid, 1) ?? Promise.resolve(),
    setQuantity: (key, q) => store?.setQuantity(key, q) ?? Promise.resolve(),
  };
}

export function cartSnapshot(): CartState {
  return store ? store.getSnapshot() : idle;
}

export function inCart(cart: Cart | null, variantGid: string): boolean {
  const id = variantNumber(variantGid);
  return cart?.items.some((item) => item.variant_id === id) ?? false;
}
