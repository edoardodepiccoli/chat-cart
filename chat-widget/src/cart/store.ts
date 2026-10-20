import { variantNumber } from "../urls";
import { CartError } from "./ajax";
import type { Cart, CartApi, WriteResult } from "./ajax";
import type { ThemeAdapter } from "./theme";

export type CartState = {
  cart: Cart | null;
  pending: string | null;
  error: { key: string; message: string } | null;
};

export type CartStore = {
  getSnapshot(): CartState;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  add(variantGid: string, quantity: number): Promise<void>;
  setQuantity(lineKey: string, quantity: number): Promise<void>;
  themeWrote(cart: Cart | null): void;
  refresh(withTheme: boolean): Promise<void>;
};

const lines = (cart: Cart) =>
  cart.items.map((item) => `${item.key}:${item.quantity}`).join(",");

export function cartsDiffer(a: Cart | null, b: Cart): boolean {
  return (
    a === null ||
    a.token !== b.token ||
    a.item_count !== b.item_count ||
    a.total_price !== b.total_price ||
    lines(a) !== lines(b)
  );
}

export function createCartStore(deps: {
  api: CartApi;
  adapter: ThemeAdapter;
  onLocalChange: () => void;
  failMessage: string;
}): CartStore {
  const { api, adapter, onLocalChange, failMessage } = deps;
  const listeners = new Set<() => void>();
  let state: CartState = { cart: null, pending: null, error: null };
  // Bumped on every cart change, so a read that started earlier can tell
  // a newer cart landed while it was in flight and drop its stale result.
  let version = 0;
  let tail: Promise<void> = Promise.resolve();
  let queued = 0;
  let dirty = false;

  function set(patch: Partial<CartState>) {
    const keys = Object.keys(patch) as (keyof CartState)[];
    if (keys.every((key) => state[key] === patch[key])) return;
    if ("cart" in patch && patch.cart !== state.cart) version++;
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }

  async function read(withTheme: boolean) {
    const started = version;
    try {
      const cart = await api.getCart();
      if (version !== started || !cartsDiffer(state.cart, cart)) return;
      if (withTheme && adapter.sections.length) {
        const html = await api.renderSections(adapter.sections);
        if (version !== started) return;
        adapter.apply(html);
      }
      set({ cart });
    } catch {
      // Keep the last confirmed cart; the next write or catch-up re-reads.
    }
  }

  function enqueue(key: string, write: () => Promise<WriteResult>) {
    queued++;
    if (state.error?.key === key) set({ error: null });
    const job = tail.then(async () => {
      set({ pending: key });
      try {
        const { cart, sections } = await write();
        adapter.apply(sections);
        set({ cart });
        onLocalChange();
      } catch (error) {
        const message =
          error instanceof CartError ? error.message : failMessage;
        set({ error: { key, message } });
        await read(false);
      }
      queued--;
      if (queued === 0) {
        set({ pending: null });
        if (dirty) {
          dirty = false;
          await read(false);
        }
      }
    });
    tail = job;
    return job;
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load: () => read(false),
    add: (variantGid, quantity) =>
      enqueue(variantGid, () =>
        api.add(variantNumber(variantGid), quantity, adapter.sections),
      ),
    setQuantity: (lineKey, quantity) =>
      enqueue(lineKey, () => api.change(lineKey, quantity, adapter.sections)),
    themeWrote(cart) {
      if (queued > 0) {
        dirty = true;
      } else if (cart) {
        set({ cart });
        onLocalChange();
      } else {
        void read(false).then(onLocalChange);
      }
    },
    refresh: read,
  };
}
