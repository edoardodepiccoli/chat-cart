// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Cart } from "../cart";
import type { ThemeAdapter } from "./adapter";
import { CART_LINES_UPDATE } from "./standardEvent";

const cart: Cart = {
  token: "tok",
  item_count: 1,
  total_price: 1000,
  currency: "EUR",
  items: [],
};

let spy: {
  detect: ReturnType<typeof vi.fn>;
  sections: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
};
let theme: typeof import("./index");
const events: Event[] = [];
const listener = (event: Event) => events.push(event);

// Replaces the Horizon adapter with a spy, the only one in the default registry.
async function load(matches = true) {
  spy = {
    detect: vi.fn(() => matches),
    sections: vi.fn(() => ["s1"]),
    refresh: vi.fn(),
  };
  const adapter: ThemeAdapter = { name: "spy", ...spy };
  vi.doMock("./horizon", () => ({ horizonAdapter: adapter }));
  theme = await import("./index");
}

beforeEach(() => {
  vi.resetModules();
  events.length = 0;
  document.addEventListener(CART_LINES_UPDATE, listener);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  document.removeEventListener(CART_LINES_UPDATE, listener);
  vi.doUnmock("./horizon");
  vi.restoreAllMocks();
});

describe("theme", () => {
  it("startTheme does not call detect; the first use does, once", async () => {
    await load();
    theme.startTheme([]);
    expect(spy.detect).not.toHaveBeenCalled();

    expect(theme.themeSections()).toEqual(["s1"]);
    theme.themeSections();
    theme.refreshTheme(cart, {});
    expect(spy.detect).toHaveBeenCalledTimes(1);
  });

  it("refreshTheme dispatches the event, then calls refresh with the same update", async () => {
    await load();
    const sections = { s1: "<div></div>" };
    theme.refreshTheme(cart, sections);

    expect(events).toHaveLength(1);
    expect((events[0] as Event & { action: string }).action).toBe("update");
    expect(spy.refresh).toHaveBeenCalledWith({ cart, sections });
  });

  it("a throwing event does not stop refresh", async () => {
    await load();
    const bad = { ...cart, currency: "XXX-not-a-code" };
    expect(() => theme.refreshTheme(bad, {})).not.toThrow();
    expect(events).toHaveLength(0);
    expect(spy.refresh).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("a throwing refresh does not stop the event", async () => {
    await load();
    spy.refresh.mockImplementation(() => {
      throw new Error("theme broke");
    });
    expect(() => theme.refreshTheme(cart, {})).not.toThrow();
    expect(events).toHaveLength(1);
    expect(console.error).toHaveBeenCalled();
  });

  it("a rejected refresh is logged", async () => {
    await load();
    spy.refresh.mockRejectedValue(new Error("offline"));
    theme.refreshTheme(cart, {});
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(events).toHaveLength(1);
  });

  it("a throwing theme listener does not escape", async () => {
    await load();
    const broken = () => {
      throw new Error("theme listener broke");
    };
    document.addEventListener(CART_LINES_UPDATE, broken);
    try {
      expect(() => theme.refreshTheme(cart, {})).not.toThrow();
    } finally {
      document.removeEventListener(CART_LINES_UPDATE, broken);
    }
  });

  it("the fallback is picked when no theme adapter matches", async () => {
    await load(false);
    const fetchMock = vi.fn(async () => new Response("<html></html>"));
    window.fetch = fetchMock as unknown as typeof fetch;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    theme.startTheme([".count"]);
    theme.refreshTheme(cart, {});
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe(
      location.href,
    );
  });

  it("with no matching adapter, only the event is dispatched and there are no sections", async () => {
    await load(false);
    expect(theme.themeSections()).toEqual([]);
    theme.refreshTheme(cart, {});
    expect(events).toHaveLength(1);
    expect(spy.refresh).not.toHaveBeenCalled();
  });
});
