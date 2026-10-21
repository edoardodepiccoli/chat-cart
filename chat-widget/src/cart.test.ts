// @vitest-environment happy-dom
// @vitest-environment-options {"url": "https://shop.test/"}
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

import type { Cart, CartItem } from "./cart";

function item(key: string, variantId: number, quantity: number): CartItem {
  return {
    key,
    variant_id: variantId,
    product_title: "Tee",
    image: null,
    url: "/products/tee",
    quantity,
    final_line_price: 1000 * quantity,
    options_with_values: [],
    product_has_only_default_variant: true,
  };
}

const CART: Cart = {
  token: "tok",
  item_count: 3,
  total_price: 3000,
  currency: "EUR",
  items: [item("1:abc", 42, 2), item("2:def", 43, 1)],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function pathOf(input: unknown): string {
  const url = input instanceof Request ? input.url : String(input);
  return new URL(url, location.origin).pathname;
}

let cart: typeof import("./cart");
let fetchMock: Mock;
let routes: Record<string, () => Response | Promise<Response>>;
const originalOpen = XMLHttpRequest.prototype.open;

const callsTo = (path: string) =>
  fetchMock.mock.calls.filter(([input]) => pathOf(input) === path);
const cartReads = () => callsTo("/cart.js").length;

// Starts the cart and waits for its first read, then forgets that read.
async function start() {
  cart.startCart();
  await vi.waitFor(() => expect(cartReads()).toBe(1));
  fetchMock.mockClear();
}

beforeEach(async () => {
  vi.resetModules();
  routes = {
    "/cart.js": () => json(CART),
    "/cart/add.js": () => json({ items: [] }),
    "/it/cart/add.js": () => json({ items: [] }),
    "/cart/change.js": () => json(CART),
    "/cart/update.js": () => json(CART),
    "/products/tee.js": () => json({}),
  };
  fetchMock = vi.fn(async (input: unknown) =>
    (routes[pathOf(input)] ?? (() => json({}, 404)))(),
  );
  window.fetch = fetchMock as unknown as typeof fetch;
  cart = await import("./cart");
});

afterEach(() => {
  XMLHttpRequest.prototype.open = originalOpen;
});

describe("quantityInCart", () => {
  it("sums the lines of one variant and is 0 without any", () => {
    const split = { ...CART, items: [...CART.items, item("3:ghi", 42, 1)] };
    expect(cart.quantityInCart(split, "gid://shopify/ProductVariant/42")).toBe(
      3,
    );
    expect(cart.quantityInCart(CART, "gid://shopify/ProductVariant/99")).toBe(
      0,
    );
    expect(cart.quantityInCart(null, "gid://shopify/ProductVariant/42")).toBe(
      0,
    );
  });
});

describe("reads", () => {
  it("refreshCart stores the cart", async () => {
    await start();
    await cart.refreshCart();
    expect(cart.getCartState().cart).toEqual(CART);
  });

  it("a failed read keeps the previous cart", async () => {
    await start();
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await cart.refreshCart();
    expect(cart.getCartState().cart).toEqual(CART);
  });
});

describe("writes", () => {
  it("addToCart posts the variant id, re-reads, notifies the theme", async () => {
    await start();
    const events: Event[] = [];
    const listener = (event: Event) => events.push(event);
    document.addEventListener("shopify:cart:lines-update", listener);

    expect(await cart.addToCart("gid://shopify/ProductVariant/42")).toBe(true);
    document.removeEventListener("shopify:cart:lines-update", listener);

    const [, init] = callsTo("/cart/add.js")[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).items).toEqual([
      { id: 42, quantity: 1 },
    ]);
    expect(cartReads()).toBe(1);
    expect(cart.getCartState()).toMatchObject({
      cart: CART,
      pending: null,
      error: null,
    });
    expect(events).toHaveLength(1);
  });

  it("a failed write sets Shopify's description and returns false", async () => {
    await start();
    routes["/cart/change.js"] = () => json({ description: "Only 2 left" }, 422);
    expect(await cart.changeQuantity("1:abc", 9)).toBe(false);
    expect(cart.getCartState().error).toEqual({
      key: "1:abc",
      message: "Only 2 left",
    });
    expect(cart.getCartState().pending).toBeNull();
  });

  it("a failed write that still changed the cart notifies the theme", async () => {
    await start();
    const partial = { ...CART, item_count: 4, items: [item("1:abc", 42, 3)] };
    routes["/cart/change.js"] = () => json({ description: "Only 3 left" }, 422);
    routes["/cart.js"] = () => json(partial);
    const events: Event[] = [];
    const listener = (event: Event) => events.push(event);
    document.addEventListener("shopify:cart:lines-update", listener);

    expect(await cart.changeQuantity("1:abc", 9)).toBe(false);
    document.removeEventListener("shopify:cart:lines-update", listener);

    expect(cart.getCartState().cart).toEqual(partial);
    expect(events).toHaveLength(1);
  });

  it("a failed write that changed nothing does not notify the theme", async () => {
    await start();
    routes["/cart/change.js"] = () => json({ description: "Only 2 left" }, 422);
    const events: Event[] = [];
    const listener = (event: Event) => events.push(event);
    document.addEventListener("shopify:cart:lines-update", listener);

    await cart.changeQuantity("1:abc", 9);
    document.removeEventListener("shopify:cart:lines-update", listener);

    expect(events).toHaveLength(0);
  });

  it("a write while another is pending returns false without a request", async () => {
    await start();
    let release = () => {};
    routes["/cart/change.js"] = () =>
      new Promise((resolve) => {
        release = () => resolve(json(CART));
      });

    const first = cart.changeQuantity("1:abc", 2);
    await vi.waitFor(() => expect(callsTo("/cart/change.js")).toHaveLength(1));
    expect(cart.getCartState().pending).toBe("1:abc");
    expect(await cart.changeQuantity("2:def", 3)).toBe(false);

    release();
    expect(await first).toBe(true);
    expect(callsTo("/cart/change.js")).toHaveLength(1);
  });
});

describe("watching the theme", () => {
  it("a theme fetch cart write triggers a re-read and gets the original response", async () => {
    await start();
    const response = await window.fetch("/cart/change.js", {
      method: "POST",
      body: "{}",
    });
    expect(await response.json()).toEqual(CART);
    await vi.waitFor(() => expect(cartReads()).toBe(1));
  });

  it("theme writes under a locale root or as a Request are seen", async () => {
    await start();
    await window.fetch("/it/cart/add.js", { method: "POST" });
    await window.fetch(
      new Request("https://shop.test/cart/update.js", { method: "POST" }),
    );
    await vi.waitFor(() => expect(cartReads()).toBe(2));
  });

  it("other paths, refused writes and offline writes trigger nothing", async () => {
    await start();
    await window.fetch("/products/tee.js");

    routes["/cart/add.js"] = () => json({ description: "Sold out" }, 422);
    const refused = await window.fetch("/cart/add.js", { method: "POST" });
    expect(refused.status).toBe(422);

    const offline = new TypeError("offline");
    fetchMock.mockRejectedValueOnce(offline);
    await expect(
      window.fetch("/cart/clear.js", { method: "POST" }),
    ).rejects.toBe(offline);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cartReads()).toBe(0);
  });

  it("a theme XHR cart write triggers a re-read on load", async () => {
    await start();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/cart/add.js");
    Object.defineProperty(xhr, "status", { value: 200 });
    xhr.dispatchEvent(new Event("load"));
    await vi.waitFor(() => expect(cartReads()).toBe(1));
  });

  it("startCart twice wraps fetch once", async () => {
    await start();
    const wrapped = window.fetch;
    cart.startCart();
    expect(window.fetch).toBe(wrapped);
  });
});
