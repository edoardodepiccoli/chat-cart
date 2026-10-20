import { describe, expect, it, vi } from "vitest";
import type { Cart } from "./ajax";
import { cartsDiffer, installCatchup } from "./catchup";

function cartOf(quantities: number[]): Cart {
  return {
    token: "t",
    item_count: quantities.reduce((a, b) => a + b, 0),
    total_price: 1000,
    currency: "EUR",
    items: quantities.map((quantity, i) => ({
      key: `k${i + 1}`,
      variant_id: 7,
      product_title: "Shirt",
      image: null,
      url: "/products/shirt",
      quantity,
      final_line_price: 1000,
      options_with_values: [],
      product_has_only_default_variant: true,
    })),
  };
}

type Handler = (e: unknown) => void;

function fakeTarget(extra: Record<string, unknown> = {}) {
  const handlers: Record<string, Handler> = {};
  return {
    handlers,
    addEventListener: (type: string, h: Handler) => {
      handlers[type] = h;
    },
    ...extra,
  };
}

function setup(
  visibilityState: "visible" | "hidden" = "visible",
  withChannel = true,
) {
  const win = fakeTarget();
  const doc = fakeTarget({ visibilityState });
  const channel = withChannel
    ? {
        postMessage: vi.fn(),
        onmessage: null as ((e: MessageEvent) => void) | null,
      }
    : null;
  const refresh = vi.fn<(withTheme: boolean) => Promise<void>>(async () => {});
  const api = installCatchup({
    win: win as never,
    doc: doc as never,
    channel,
    refresh,
  });
  return { win, doc, channel, refresh, api };
}

describe("cartsDiffer", () => {
  it("is false for equal carts", () => {
    expect(cartsDiffer(cartOf([1, 2]), cartOf([1, 2]))).toBe(false);
  });

  it("is true when one of two lines of the same variant changes quantity", () => {
    expect(cartsDiffer(cartOf([1, 2]), cartOf([1, 3]))).toBe(true);
  });
});

describe("installCatchup", () => {
  it("refreshes on pageshow only when persisted", () => {
    const { win, refresh } = setup();
    win.handlers.pageshow({ persisted: false });
    expect(refresh).not.toHaveBeenCalled();
    win.handlers.pageshow({ persisted: true });
    expect(refresh).toHaveBeenCalledWith(true);
  });

  it("refreshes on visibilitychange only when visible", () => {
    const hidden = setup("hidden");
    hidden.doc.handlers.visibilitychange({});
    expect(hidden.refresh).not.toHaveBeenCalled();
    const visible = setup("visible");
    visible.doc.handlers.visibilitychange({});
    expect(visible.refresh).toHaveBeenCalledWith(true);
  });

  it("a channel message refreshes and never adopts its payload", () => {
    const { channel, refresh } = setup();
    const read = vi.fn();
    const event = {
      get data() {
        read();
        return { cart: "x" };
      },
    };
    channel!.onmessage!(event as unknown as MessageEvent);
    expect(refresh).toHaveBeenCalledWith(true);
    expect(read).not.toHaveBeenCalled();
  });

  it("announce posts on the channel", () => {
    const { channel, api } = setup();
    api.announce();
    expect(channel!.postMessage).toHaveBeenCalledWith("changed");
  });

  it("announce is a no-op with a null channel, and the rest still works", () => {
    const { api, win, refresh } = setup("visible", false);
    expect(() => api.announce()).not.toThrow();
    win.handlers.pageshow({ persisted: true });
    expect(refresh).toHaveBeenCalledWith(true);
  });
});
