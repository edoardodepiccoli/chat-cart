import { describe, expect, it, vi } from "vitest";

import { CartError, createCartApi } from "./ajax";

const cart = {
  token: "t",
  item_count: 1,
  total_price: 100,
  currency: "EUR",
  items: [],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("createCartApi", () => {
  it("add posts, then reads the cart", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json({ items: [], sections: { a: "<a/>" } }))
      .mockResolvedValueOnce(json(cart));
    const api = createCartApi(
      fetchFn as unknown as typeof fetch,
      "/it/",
      () => "/it/products/tee",
    );
    const result = await api.add(42, 1, ["a", "b"]);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("/it/cart/add.js");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    expect(JSON.parse(init.body)).toEqual({
      items: [{ id: 42, quantity: 1 }],
      sections: "a,b",
      sections_url: "/it/products/tee",
    });
    expect(fetchFn.mock.calls[1][0]).toBe("/it/cart.js");
    expect(result).toEqual({ cart, sections: { a: "<a/>" } });
  });

  it("change makes one request", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json({ ...cart, sections: { a: "<a/>" } }));
    const api = createCartApi(
      fetchFn as unknown as typeof fetch,
      "/it/",
      () => "/it/products/tee",
    );
    const result = await api.change("k1", 2, ["a", "b"]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("/it/cart/change.js");
    expect(JSON.parse(init.body)).toEqual({
      id: "k1",
      quantity: 2,
      sections: "a,b",
      sections_url: "/it/products/tee",
    });
    expect(result).toEqual({ cart, sections: { a: "<a/>" } });
  });

  it("renderSections gets the section map", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(json({ a: "x", b: null }));
    const api = createCartApi(
      fetchFn as unknown as typeof fetch,
      "/it/",
      () => "/it/products/tee",
    );
    expect(await api.renderSections(["a", "b"])).toEqual({ a: "x", b: null });
    expect(fetchFn.mock.calls[0][0]).toBe("/it/products/tee?sections=a,b");
  });

  it("omits sections when the list is empty", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(json(cart));
    const api = createCartApi(
      fetchFn as unknown as typeof fetch,
      "/it/",
      () => "/it/products/tee",
    );
    const result = await api.change("k1", 0, []);
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({
      id: "k1",
      quantity: 0,
    });
    expect(result.sections).toEqual({});
  });

  it("rejects with the Shopify description", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        json(
          { status: 422, message: "Cart Error", description: "Only 2 left" },
          422,
        ),
      );
    const api = createCartApi(
      fetchFn as unknown as typeof fetch,
      "/it/",
      () => "/it/products/tee",
    );
    const error = await api.add(1, 5, []).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CartError);
    expect((error as CartError).message).toBe("Only 2 left");
    expect((error as CartError).status).toBe(422);
  });

  it("rejects with a CartError on a non-JSON failure", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("boom", { status: 500 }));
    const api = createCartApi(
      fetchFn as unknown as typeof fetch,
      "/it/",
      () => "/it/products/tee",
    );
    const error = await api.getCart().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CartError);
    expect((error as CartError).status).toBe(500);
    expect((error as CartError).message).toBe("Cart 500");
  });
});
