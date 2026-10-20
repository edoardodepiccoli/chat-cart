import { describe, expect, it, vi } from "vitest";
import type { Cart } from "./ajax";
import { cartWriteKind, installIntercept } from "./intercept";

const ORIGIN = "https://s.test";

const cart: Cart = {
  token: "t1",
  item_count: 1,
  total_price: 1000,
  currency: "EUR",
  items: [
    {
      key: "k1",
      variant_id: 1,
      product_title: "Shirt",
      image: null,
      url: "/products/shirt",
      quantity: 1,
      final_line_price: 1000,
      options_with_values: [],
      product_has_only_default_variant: true,
    },
  ],
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeWin(respond: () => Response) {
  const fetchFn = vi.fn<(...args: unknown[]) => Promise<Response>>(async () =>
    respond(),
  );
  return {
    fetch: fetchFn as unknown as typeof fetch,
    fetchFn,
    XMLHttpRequest: class {} as unknown as typeof XMLHttpRequest,
  };
}

describe("cartWriteKind", () => {
  it("classifies cart write urls", () => {
    expect(cartWriteKind("/it/cart/change.js", "/it/", ORIGIN)).toBe("write");
    expect(cartWriteKind("/cart/add", "/", ORIGIN)).toBe("add");
    expect(cartWriteKind("/cart/update.js", "/", ORIGIN)).toBe("write");
    expect(cartWriteKind("/cart/clear", "/", ORIGIN)).toBe("write");
    expect(cartWriteKind("/cart/add.js?x=1", "/", ORIGIN)).toBe("add");
    expect(cartWriteKind(`${ORIGIN}/cart/add.js`, "/", ORIGIN)).toBe("add");
  });

  it("ignores reads, other origins and other paths", () => {
    expect(cartWriteKind("/cart.js", "/", ORIGIN)).toBeNull();
    expect(
      cartWriteKind("https://other.test/cart/add.js", "/", ORIGIN),
    ).toBeNull();
    expect(cartWriteKind("/products/cart/add.js", "/", ORIGIN)).toBeNull();
    expect(cartWriteKind("/products/cart/add.js", "/it/", ORIGIN)).toBeNull();
    expect(
      cartWriteKind("https://other.test/cart/add.js", "/it/", ORIGIN),
    ).toBeNull();
  });

  it("sees bare-root cart writes on a locale storefront", () => {
    expect(cartWriteKind("/cart/change.js", "/it/", ORIGIN)).toBe("write");
    expect(cartWriteKind("/cart/add.js", "/it/", ORIGIN)).toBe("add");
  });
});

describe("installIntercept fetch", () => {
  it("the caller still reads the full body", async () => {
    const win = fakeWin(
      () => new Response(JSON.stringify(cart), { status: 200 }),
    );
    const onWrite = vi.fn();
    installIntercept(win, "/", ORIGIN, onWrite);
    const res = await win.fetch("/cart/change.js", { method: "POST" });
    expect(await res.json()).toEqual(cart);
    await vi.waitFor(() => expect(onWrite).toHaveBeenCalledWith("write", cart));
    expect(win.fetchFn).toHaveBeenCalledWith("/cart/change.js", {
      method: "POST",
    });
  });

  it("takes the url from a Request and a URL", async () => {
    const win = fakeWin(
      () => new Response(JSON.stringify(cart), { status: 200 }),
    );
    const onWrite = vi.fn();
    installIntercept(win, "/", ORIGIN, onWrite);
    await win.fetch(
      new Request(`${ORIGIN}/cart/update.js`, { method: "POST" }),
    );
    await win.fetch(new URL(`${ORIGIN}/cart/add.js`));
    await vi.waitFor(() => expect(onWrite).toHaveBeenCalledTimes(2));
    expect(onWrite).toHaveBeenCalledWith("write", cart);
    expect(onWrite).toHaveBeenCalledWith("add", null);
  });

  it("a theme add with an HTML response still triggers a re-read", async () => {
    const win = fakeWin(() => new Response("<html>", { status: 200 }));
    const onWrite = vi.fn();
    installIntercept(win, "/", ORIGIN, onWrite);
    const res = await win.fetch("/cart/add");
    expect(await res.text()).toBe("<html>");
    await vi.waitFor(() => expect(onWrite).toHaveBeenCalledWith("add", null));
  });

  it("a write with a non-cart body reports null", async () => {
    const win = fakeWin(() => new Response("<html>", { status: 200 }));
    const onWrite = vi.fn();
    installIntercept(win, "/", ORIGIN, onWrite);
    const res = await win.fetch("/cart/change");
    expect(await res.text()).toBe("<html>");
    await vi.waitFor(() => expect(onWrite).toHaveBeenCalledWith("write", null));
  });

  it("a 422 is not reported", async () => {
    const win = fakeWin(() => new Response("{}", { status: 422 }));
    const onWrite = vi.fn();
    installIntercept(win, "/", ORIGIN, onWrite);
    const res = await win.fetch("/cart/add.js");
    expect(res.status).toBe(422);
    await settle();
    await settle();
    expect(onWrite).not.toHaveBeenCalled();
  });

  it("non-cart requests pass straight through", async () => {
    const response = new Response("ok", { status: 200 });
    const win = fakeWin(() => response);
    const onWrite = vi.fn();
    installIntercept(win, "/", ORIGIN, onWrite);
    expect(await win.fetch("/cart.js")).toBe(response);
    await settle();
    expect(onWrite).not.toHaveBeenCalled();
  });

  it("resolves a cart write with the very same Response", async () => {
    const response = new Response(JSON.stringify(cart), { status: 200 });
    const win = fakeWin(() => response);
    installIntercept(win, "/", ORIGIN, vi.fn());
    expect(await win.fetch("/cart/change.js")).toBe(response);
  });

  it("rejects a cart write with the very same error", async () => {
    const win = fakeWin(() => new Response("{}"));
    const onWrite = vi.fn();
    installIntercept(win, "/", ORIGIN, onWrite);
    const error = new TypeError("offline");
    win.fetchFn.mockRejectedValueOnce(error);
    const caught = await win.fetch("/cart/change.js").catch((e: unknown) => e);
    expect(caught).toBe(error);
    await settle();
    expect(onWrite).not.toHaveBeenCalled();
  });

  it("takes the clone before the theme reads the body", async () => {
    const response = new Response(JSON.stringify(cart), { status: 200 });
    const clone = vi.spyOn(response, "clone");
    const win = fakeWin(() => response);
    const onWrite = vi.fn();
    installIntercept(win, "/", ORIGIN, onWrite);
    const res = await win.fetch("/cart/change.js");
    expect(clone).toHaveBeenCalledTimes(1);
    expect(res.bodyUsed).toBe(false);
    expect(await res.json()).toEqual(cart);
    await vi.waitFor(() => expect(onWrite).toHaveBeenCalledWith("write", cart));
  });

  it("onWrite throwing never reaches the caller", async () => {
    const win = fakeWin(
      () => new Response(JSON.stringify(cart), { status: 200 }),
    );
    const onWrite = vi.fn(() => {
      throw new Error("boom");
    });
    installIntercept(win, "/", ORIGIN, onWrite);
    const res = await win.fetch("/cart/change.js");
    expect(await res.json()).toEqual(cart);
    await vi.waitFor(() => expect(onWrite).toHaveBeenCalledTimes(1));
    await settle();
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it("the returned original fetch is not intercepted", async () => {
    const win = fakeWin(
      () => new Response(JSON.stringify(cart), { status: 200 }),
    );
    const onWrite = vi.fn();
    const original = installIntercept(win, "/", ORIGIN, onWrite);
    await original("/cart/change.js");
    await settle();
    expect(onWrite).not.toHaveBeenCalled();
    expect(win.fetchFn).toHaveBeenCalledTimes(1);
  });

  it("installing twice wraps once", async () => {
    const win = fakeWin(
      () => new Response(JSON.stringify(cart), { status: 200 }),
    );
    const onWrite = vi.fn();
    const first = installIntercept(win, "/", ORIGIN, onWrite);
    const wrapped = win.fetch;
    const second = installIntercept(win, "/", ORIGIN, onWrite);
    expect(second).toBe(first);
    expect(win.fetch).toBe(wrapped);
    await win.fetch("/cart/change.js");
    await vi.waitFor(() => expect(onWrite).toHaveBeenCalled());
    await settle();
    expect(onWrite).toHaveBeenCalledTimes(1);
  });
});

class FakeXhr {
  status = 0;
  responseType = "";
  responseText = "";
  listeners: (() => void)[] = [];
  openArgs: unknown[] = [];
  open(...args: unknown[]) {
    this.openArgs = args;
  }
  send() {}
  addEventListener(type: string, fn: () => void) {
    if (type === "load") this.listeners.push(fn);
  }
  respond(status: number, text: string) {
    this.status = status;
    this.responseText = text;
    for (const fn of this.listeners) fn();
  }
}

function xhrWin() {
  const Xhr = class extends FakeXhr {};
  return {
    fetch: vi.fn() as unknown as typeof fetch,
    XMLHttpRequest: Xhr as unknown as typeof XMLHttpRequest,
    Xhr,
  };
}

describe("installIntercept XHR", () => {
  it("reports a change", () => {
    const win = xhrWin();
    const onWrite = vi.fn();
    installIntercept(win, "/it/", ORIGIN, onWrite);
    const xhr = new win.Xhr();
    expect(xhr).toBeInstanceOf(win.XMLHttpRequest);
    xhr.open("POST", "/it/cart/change.js");
    xhr.send();
    xhr.respond(200, JSON.stringify(cart));
    expect(onWrite).toHaveBeenCalledWith("write", cart);
    expect(xhr.openArgs).toEqual(["POST", "/it/cart/change.js"]);
  });

  it("reports an add, skips non-2xx and other urls, and swallows onWrite errors", () => {
    const win = xhrWin();
    const onWrite = vi.fn(() => {
      throw new Error("boom");
    });
    installIntercept(win, "/", ORIGIN, onWrite);
    const add = new win.Xhr();
    add.open("POST", "/cart/add.js");
    expect(() => add.respond(200, "<html>")).not.toThrow();
    expect(onWrite).toHaveBeenCalledWith("add", null);

    const bad = new win.Xhr();
    bad.open("POST", "/cart/change.js");
    bad.respond(422, "{}");
    const other = new win.Xhr();
    other.open("GET", "/cart.js");
    other.respond(200, JSON.stringify(cart));
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it("reopening an XHR listens once and uses the latest url", () => {
    const win = xhrWin();
    const onWrite = vi.fn();
    installIntercept(win, "/", ORIGIN, onWrite);
    const xhr = new win.Xhr();
    xhr.open("GET", "/cart.js");
    xhr.open("POST", "/cart/clear.js");
    xhr.respond(200, JSON.stringify(cart));
    expect(onWrite).toHaveBeenCalledTimes(1);
    expect(onWrite).toHaveBeenCalledWith("write", cart);
  });
});
