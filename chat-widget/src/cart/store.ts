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
  // Writes and adoptions bump `local`, so a read that started before one
  // drops its result. Each read takes a start number from `reads`, and
  // `applied` holds the start number of the newest read whose result was
  // used, so an older read that resolves late cannot overwrite it.
  let local = 0;
  let reads = 0;
  let applied = 0;
  let tail: Promise<void> = Promise.resolve();
  let queued = 0;
  let dirty = false;

  function set(patch: Partial<CartState>) {
    const keys = Object.keys(patch) as (keyof CartState)[];
    if (keys.every((key) => state[key] === patch[key])) return;
    state = { ...state, ...patch };
    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        // Report it without letting one subscriber break the store.
        console.error(error);
      }
    }
  }

  function setLocal(cart: Cart) {
    local++;
    set({ cart });
  }

  async function read(withTheme: boolean) {
    const started = ++reads;
    const localAtStart = local;
    const stale = () => local !== localAtStart || applied > started;
    try {
      const cart = await api.getCart();
      if (stale()) return;
      if (!cartsDiffer(state.cart, cart)) {
        applied = started;
        return;
      }
      const sections = withTheme ? adapter.sections() : [];
      if (sections.length) {
        const html = await api.renderSections(sections);
        if (stale()) return;
        adapter.apply({ cart, sections: html });
      }
      applied = started;
      set({ cart });
    } catch {
      // Keep the last confirmed cart; the next write or catch-up re-reads.
    }
  }

  async function run(key: string, write: () => Promise<WriteResult>) {
    try {
      set({ pending: key });
      let result: WriteResult;
      try {
        result = await write();
      } catch (error) {
        const message =
          error instanceof CartError ? error.message : failMessage;
        set({ error: { key, message } });
        await read(false);
        return;
      }
      adapter.apply({ cart: result.cart, sections: result.sections });
      setLocal(result.cart);
      onLocalChange();
    } finally {
      queued--;
      if (queued === 0) {
        try {
          set({ pending: null });
        } finally {
          if (dirty) {
            dirty = false;
            await read(false);
          }
        }
      }
    }
  }

  function enqueue(key: string, write: () => Promise<WriteResult>) {
    if (state.error?.key === key) set({ error: null });
    queued++;
    // Never reject and never poison the chain, whatever a subscriber does.
    const job = tail.then(() => run(key, write)).catch(() => {});
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
        api.add(variantNumber(variantGid), quantity, adapter.sections()),
      ),
    setQuantity: (lineKey, quantity) =>
      enqueue(lineKey, () =>
        api.change(lineKey, quantity, adapter.sections()),
      ),
    themeWrote(cart) {
      if (queued > 0) {
        dirty = true;
      } else if (cart) {
        setLocal(cart);
        onLocalChange();
      } else {
        void read(false).then(onLocalChange);
      }
    },
    refresh: read,
  };
}
