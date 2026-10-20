import { useSyncExternalStore } from "react";

import { t } from "../i18n";
import { ROOT, variantNumber } from "../urls";
import { createCartApi } from "./ajax";
import type { Cart } from "./ajax";
import { installCatchup } from "./catchup";
import { installIntercept } from "./intercept";
import { rangerAdapter } from "./ranger";
import { createCartStore } from "./store";
import type { CartState, CartStore } from "./store";

let store: CartStore | null = null;

export function startCart(): void {
  if (store) return;
  // The callback closes over `store`, which is assigned right after.
  const originalFetch = installIntercept(
    window,
    ROOT,
    location.origin,
    (_kind, cart) => store?.themeWrote(cart),
  );
  const created = createCartStore({
    api: createCartApi(originalFetch, ROOT),
    adapter: rangerAdapter,
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
