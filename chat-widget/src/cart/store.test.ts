import { describe, expect, it, vi } from "vitest";

import { CartError } from "./ajax";
import type { Cart, CartApi, Sections, WriteResult } from "./ajax";
import type { ThemeAdapter, ThemeUpdate } from "./theme";
import { cartsDiffer, createCartStore } from "./store";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Deferred<T> = ReturnType<typeof deferred<T>>;

function makeCart(token: string, quantity = 1): Cart {
  return {
    token,
    item_count: quantity,
    total_price: quantity * 100,
    currency: "EUR",
    items: [
      {
        key: "k1",
        variant_id: 1,
        product_title: "Tee",
        image: null,
        url: "/products/tee",
        quantity,
        final_line_price: quantity * 100,
        options_with_values: [],
        product_has_only_default_variant: true,
      },
    ],
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeApi() {
  const calls = {
    getCart: [] as Deferred<Cart>[],
    add: [] as { args: unknown[]; d: Deferred<WriteResult> }[],
    change: [] as { args: unknown[]; d: Deferred<WriteResult> }[],
    renderSections: [] as { args: unknown[]; d: Deferred<Sections> }[],
  };
  const api: CartApi = {
    getCart: vi.fn(() => {
      const d = deferred<Cart>();
      calls.getCart.push(d);
      return d.promise;
    }),
    add: vi.fn((...args: unknown[]) => {
      const d = deferred<WriteResult>();
      calls.add.push({ args, d });
      return d.promise;
    }),
    change: vi.fn((...args: unknown[]) => {
      const d = deferred<WriteResult>();
      calls.change.push({ args, d });
      return d.promise;
    }),
    renderSections: vi.fn((...args: unknown[]) => {
      const d = deferred<Sections>();
      calls.renderSections.push({ args, d });
      return d.promise;
    }),
  };
  return { api, calls };
}

function setup(sections: string[] = ["cart-drawer"]) {
  const { api, calls } = fakeApi();
  const log: { html: Sections; next: Cart; cart: Cart | null }[] = [];
  const adapter = {
    sections: vi.fn(() => sections),
    apply: vi.fn((update: ThemeUpdate) => {
      log.push({
        html: update.sections,
        next: update.cart,
        cart: store.getSnapshot().cart,
      });
    }),
  } satisfies ThemeAdapter;
  const onLocalChange = vi.fn();
  const store = createCartStore({
    api,
    adapter,
    onLocalChange,
    failMessage: "Could not update the cart",
  });
  return { api, calls, adapter, log, onLocalChange, store };
}

async function loaded(cart: Cart, sections?: string[]) {
  const ctx = setup(sections);
  const load = ctx.store.load();
  ctx.calls.getCart[0].resolve(cart);
  await load;
  return ctx;
}

describe("createCartStore", () => {
  it("three setQuantity calls run one at a time, in order", async () => {
    const { api, calls, store } = await loaded(makeCart("t", 1));
    const writes = [
      store.setQuantity("k1", 2),
      store.setQuantity("k1", 3),
      store.setQuantity("k1", 4),
    ];
    await flush();
    expect(api.change).toHaveBeenCalledTimes(1);
    expect(calls.change[0].args).toEqual(["k1", 2, ["cart-drawer"]]);
    expect(store.getSnapshot().pending).toBe("k1");

    calls.change[0].d.resolve({ cart: makeCart("t", 2), sections: {} });
    await flush();
    expect(api.change).toHaveBeenCalledTimes(2);
    expect(calls.change[1].args[1]).toBe(3);

    calls.change[1].d.resolve({ cart: makeCart("t", 3), sections: {} });
    await flush();
    expect(api.change).toHaveBeenCalledTimes(3);
    expect(calls.change[2].args[1]).toBe(4);

    calls.change[2].d.resolve({ cart: makeCart("t", 4), sections: {} });
    await Promise.all(writes);
    expect(store.getSnapshot().cart?.item_count).toBe(4);
    expect(store.getSnapshot().pending).toBeNull();
  });

  it("a write applies sections before the cart is published", async () => {
    const old = makeCart("t", 1);
    const next = makeCart("t", 2);
    const { calls, log, onLocalChange, store } = await loaded(old);
    const write = store.setQuantity("k1", 2);
    await flush();
    calls.change[0].d.resolve({
      cart: next,
      sections: { "cart-drawer": "<b/>" },
    });
    await write;

    expect(log).toEqual([
      { html: { "cart-drawer": "<b/>" }, next, cart: old },
    ]);
    expect(log[0].next).toBe(next);
    expect(store.getSnapshot().cart).toBe(next);
    expect(onLocalChange).toHaveBeenCalledTimes(1);
  });

  it("asks the adapter for its sections on every write", async () => {
    const { adapter, api, calls, store } = await loaded(makeCart("t", 1));
    adapter.sections.mockReturnValueOnce(["a"]).mockReturnValueOnce(["b"]);
    const first = store.setQuantity("k1", 2);
    const second = store.setQuantity("k1", 3);
    await flush();
    calls.change[0].d.resolve({ cart: makeCart("t", 2), sections: {} });
    await first;
    await flush();
    calls.change[1].d.resolve({ cart: makeCart("t", 3), sections: {} });
    await second;
    expect(api.change).toHaveBeenNthCalledWith(1, "k1", 2, ["a"]);
    expect(api.change).toHaveBeenNthCalledWith(2, "k1", 3, ["b"]);
  });

  it("add converts the variant GID and marks it pending", async () => {
    const { api, calls, store } = await loaded(makeCart("t", 1));
    const write = store.add("gid://shopify/ProductVariant/42", 1);
    await flush();
    expect(api.add).toHaveBeenCalledWith(42, 1, ["cart-drawer"]);
    expect(store.getSnapshot().pending).toBe("gid://shopify/ProductVariant/42");
    calls.add[0].d.resolve({ cart: makeCart("t", 2), sections: {} });
    await write;
    expect(store.getSnapshot().pending).toBeNull();
  });

  it("a refused write keeps the cart, records the error and the queue continues", async () => {
    const old = makeCart("t", 1);
    const second = makeCart("t", 3);
    const { api, calls, onLocalChange, store } = await loaded(old);
    const first = store.setQuantity("k1", 5);
    const next = store.setQuantity("k2", 3);
    await flush();

    calls.change[0].d.reject(new CartError("Only 2 left", 422));
    await flush();
    expect(store.getSnapshot().error).toEqual({
      key: "k1",
      message: "Only 2 left",
    });
    expect(store.getSnapshot().cart).toBe(old);
    expect(api.getCart).toHaveBeenCalledTimes(2); // load + refresh
    calls.getCart[1].resolve(old);
    await first;
    expect(store.getSnapshot().cart).toBe(old);

    await flush();
    calls.change[1].d.resolve({ cart: second, sections: {} });
    await next;
    expect(store.getSnapshot().cart).toBe(second);
    expect(api.getCart).toHaveBeenCalledTimes(2);
    expect(onLocalChange).toHaveBeenCalledTimes(1);
  });

  it("a non-CartError failure uses failMessage", async () => {
    const { calls, store } = await loaded(makeCart("t", 1));
    const write = store.setQuantity("k1", 2);
    await flush();
    calls.change[0].d.reject(new TypeError("Failed to fetch"));
    await flush();
    calls.getCart[1].resolve(makeCart("t", 1));
    await expect(write).resolves.toBeUndefined();
    expect(store.getSnapshot().error).toEqual({
      key: "k1",
      message: "Could not update the cart",
    });
  });

  it("a new write for a key clears that key's error", async () => {
    const { calls, store } = await loaded(makeCart("t", 1));
    const write = store.setQuantity("k1", 9);
    await flush();
    calls.change[0].d.reject(new CartError("Only 2 left", 422));
    await flush();
    calls.getCart[1].resolve(makeCart("t", 1));
    await write;

    void store.setQuantity("k2", 1);
    expect(store.getSnapshot().error?.key).toBe("k1");
    void store.setQuantity("k1", 2);
    expect(store.getSnapshot().error).toBeNull();
  });

  it("themeWrote during a write reconciles once after the queue drains", async () => {
    const { api, calls, onLocalChange, store } = await loaded(makeCart("t", 1));
    const write = store.setQuantity("k1", 2);
    await flush();
    store.themeWrote(makeCart("t", 7));
    store.themeWrote(makeCart("t", 8));
    expect(store.getSnapshot().cart?.item_count).toBe(1);
    expect(api.getCart).toHaveBeenCalledTimes(1);

    calls.change[0].d.resolve({ cart: makeCart("t", 2), sections: {} });
    await flush();
    expect(api.getCart).toHaveBeenCalledTimes(2);
    calls.getCart[1].resolve(makeCart("t", 8));
    await write;
    await flush();
    expect(api.getCart).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().cart?.item_count).toBe(8);
    expect(onLocalChange).toHaveBeenCalledTimes(1);
  });

  it("themeWrote(null) while idle re-reads; themeWrote(cart) while idle adopts without a request", async () => {
    const { api, calls, onLocalChange, store } = await loaded(makeCart("t", 1));
    const adopted = makeCart("t", 4);
    store.themeWrote(adopted);
    expect(store.getSnapshot().cart).toBe(adopted);
    expect(api.getCart).toHaveBeenCalledTimes(1);
    expect(onLocalChange).toHaveBeenCalledTimes(1);

    const reread = makeCart("t", 6);
    store.themeWrote(null);
    expect(api.getCart).toHaveBeenCalledTimes(2);
    calls.getCart[1].resolve(reread);
    await flush();
    expect(store.getSnapshot().cart).toBe(reread);
    expect(onLocalChange).toHaveBeenCalledTimes(2);
  });

  it("refresh(true) renders sections only when the cart changed", async () => {
    const old = makeCart("t", 1);
    const { api, adapter, calls, log, onLocalChange, store } =
      await loaded(old);

    const same = store.refresh(true);
    calls.getCart[1].resolve(makeCart("t", 1));
    await same;
    expect(api.renderSections).not.toHaveBeenCalled();
    expect(store.getSnapshot().cart).toBe(old);

    const changed = makeCart("t", 3);
    const refresh = store.refresh(true);
    calls.getCart[2].resolve(changed);
    await flush();
    expect(api.renderSections).toHaveBeenCalledWith(["cart-drawer"]);
    calls.renderSections[0].d.resolve({ "cart-drawer": "<c/>" });
    await refresh;
    expect(adapter.apply).toHaveBeenCalledTimes(1);
    expect(log[0].cart).toBe(old);
    expect(log[0].next).toBe(changed);
    expect(store.getSnapshot().cart).toBe(changed);
    expect(onLocalChange).not.toHaveBeenCalled();
  });

  it("refresh(true) skips renderSections when the adapter has no sections", async () => {
    const { api, adapter, calls, store } = await loaded(makeCart("t", 1), []);
    const changed = makeCart("t", 3);
    const refresh = store.refresh(true);
    calls.getCart[1].resolve(changed);
    await refresh;
    expect(api.renderSections).not.toHaveBeenCalled();
    expect(adapter.apply).not.toHaveBeenCalled();
    expect(store.getSnapshot().cart).toBe(changed);
  });

  it("refresh(false) sets a changed cart without touching the theme", async () => {
    const { api, adapter, calls, store } = await loaded(makeCart("t", 1));
    const changed = makeCart("t", 2);
    const refresh = store.refresh(false);
    calls.getCart[1].resolve(changed);
    await refresh;
    expect(api.renderSections).not.toHaveBeenCalled();
    expect(adapter.apply).not.toHaveBeenCalled();
    expect(store.getSnapshot().cart).toBe(changed);
  });

  it("a read that resolves after a newer cart was set is dropped", async () => {
    const { calls, store } = await loaded(makeCart("t", 1));
    const refresh = store.refresh(false);
    const write = store.setQuantity("k1", 5);
    await flush();
    calls.change[0].d.resolve({ cart: makeCart("t", 5), sections: {} });
    await write;
    calls.getCart[1].resolve(makeCart("t", 1));
    await refresh;
    expect(store.getSnapshot().cart?.item_count).toBe(5);
  });

  it("getSnapshot returns the same object when nothing changed", async () => {
    const { calls, store } = await loaded(makeCart("t", 1));
    const listener = vi.fn();
    store.subscribe(listener);
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);

    const refresh = store.refresh(false);
    calls.getCart[1].resolve(makeCart("t", 1));
    await refresh;
    expect(store.getSnapshot()).toBe(first);
    expect(listener).not.toHaveBeenCalled();

    store.themeWrote(makeCart("t", 2));
    expect(store.getSnapshot()).not.toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("of two overlapping reads, the later-started one wins even if it resolves second", async () => {
    const { adapter, calls, store } = await loaded(makeCart("t", 1));
    const first = store.refresh(false);
    const second = store.refresh(true);
    const older = makeCart("t", 2);
    const newer = makeCart("t", 3);

    calls.getCart[1].resolve(older);
    await first;
    expect(store.getSnapshot().cart).toBe(older);

    calls.getCart[2].resolve(newer);
    await flush();
    calls.renderSections[0].d.resolve({ "cart-drawer": "<n/>" });
    await second;
    expect(adapter.apply).toHaveBeenCalledWith({
      cart: newer,
      sections: { "cart-drawer": "<n/>" },
    });
    expect(store.getSnapshot().cart).toBe(newer);
  });

  it("an older read that resolves after a later one is dropped", async () => {
    const current = makeCart("t", 1);
    const { calls, store } = await loaded(current);
    const first = store.refresh(false);
    const second = store.refresh(false);
    const third = store.refresh(false);

    calls.getCart[2].resolve(makeCart("t", 1)); // later read, unchanged
    await second;
    calls.getCart[1].resolve(makeCart("t", 9)); // older read, stale
    await first;
    expect(store.getSnapshot().cart).toBe(current);

    const newest = makeCart("t", 4);
    calls.getCart[3].resolve(newest);
    await third;
    expect(store.getSnapshot().cart).toBe(newest);
  });

  it("a throwing subscriber neither rejects the write nor stalls the queue", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { api, calls, store } = await loaded(makeCart("t", 1));
    store.subscribe(() => {
      throw new Error("render failed");
    });
    const first = store.setQuantity("k1", 2);
    const second = store.setQuantity("k1", 3);
    await flush();
    calls.change[0].d.resolve({ cart: makeCart("t", 2), sections: {} });
    await expect(first).resolves.toBeUndefined();
    await flush();
    expect(api.change).toHaveBeenCalledTimes(2);
    calls.change[1].d.resolve({ cart: makeCart("t", 3), sections: {} });
    await expect(second).resolves.toBeUndefined();
    expect(store.getSnapshot().cart?.item_count).toBe(3);
    expect(store.getSnapshot().pending).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("a throwing onLocalChange neither rejects the write nor stalls the queue", async () => {
    const { api, calls, onLocalChange, store } = await loaded(makeCart("t", 1));
    onLocalChange.mockImplementation(() => {
      throw new Error("broadcast failed");
    });
    const first = store.setQuantity("k1", 2);
    await flush();
    calls.change[0].d.resolve({ cart: makeCart("t", 2), sections: {} });
    await expect(first).resolves.toBeUndefined();
    expect(store.getSnapshot().pending).toBeNull();

    const second = store.setQuantity("k1", 3);
    await flush();
    expect(api.change).toHaveBeenCalledTimes(2);
    calls.change[1].d.resolve({ cart: makeCart("t", 3), sections: {} });
    await expect(second).resolves.toBeUndefined();
    expect(store.getSnapshot().cart?.item_count).toBe(3);
  });

  it("subscribe returns an unsubscribe function", async () => {
    const { store } = await loaded(makeCart("t", 1));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.themeWrote(makeCart("t", 2));
    expect(listener).not.toHaveBeenCalled();
  });

  it("a failed load leaves cart null and does not reject; the first successful write fills it", async () => {
    const { calls, store } = setup();
    const load = store.load();
    calls.getCart[0].reject(new TypeError("offline"));
    await expect(load).resolves.toBeUndefined();
    expect(store.getSnapshot().cart).toBeNull();

    const filled = makeCart("t", 1);
    const write = store.add("gid://shopify/ProductVariant/1", 1);
    await flush();
    calls.add[0].d.resolve({ cart: filled, sections: {} });
    await write;
    expect(store.getSnapshot().cart).toBe(filled);
  });
});

describe("cartsDiffer", () => {
  const base = makeCart("t", 1);
  it("is true when the old cart is null", () => {
    expect(cartsDiffer(null, base)).toBe(true);
  });
  it("is false for an equal cart", () => {
    expect(cartsDiffer(base, makeCart("t", 1))).toBe(false);
  });
  it("is true when the token, count, total or lines differ", () => {
    expect(cartsDiffer(base, makeCart("u", 1))).toBe(true);
    expect(cartsDiffer(base, { ...base, item_count: 2 })).toBe(true);
    expect(cartsDiffer(base, { ...base, total_price: 1 })).toBe(true);
    expect(
      cartsDiffer(base, {
        ...base,
        items: [{ ...base.items[0], key: "k2" }],
      }),
    ).toBe(true);
  });
});
