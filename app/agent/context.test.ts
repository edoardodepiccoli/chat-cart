import { describe, expect, it } from "vitest";

import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import { loadCatalog, resolveContext } from "./context.server";
import { contextPrompt } from "./prompts/context";

const catalog = {
  products: [{ handle: "serum", title: "Vitamin C Serum" }],
  collections: [{ handle: "eyes", title: "Eye Care" }],
};
const base = { country: "IT", language: "it" };

describe("resolveContext", () => {
  it("resolves titles and drops unknown history handles", () => {
    const resolved = resolveContext(
      {
        ...base,
        page: { type: "collection", handle: "eyes" },
        history: [
          { type: "product", handle: "gone", at: 1 },
          { type: "product", handle: "serum", at: 2 },
          { type: "search", terms: "retinol", at: 3 },
        ],
      },
      catalog,
    );
    expect(resolved.page).toEqual({
      type: "collection",
      handle: "eyes",
      title: "Eye Care",
    });
    expect(resolved.history).toEqual([
      { type: "product", handle: "serum", title: "Vitamin C Serum" },
      { type: "search", terms: "retinol" },
    ]);
  });

  it("treats an unknown current page as other", () => {
    expect(
      resolveContext(
        { ...base, page: { type: "product", handle: "gone" }, history: [] },
        catalog,
      ).page,
    ).toEqual({ type: "other" });
  });
});

describe("contextPrompt", () => {
  it("names page, visits and searches", () => {
    const prompt = contextPrompt({
      country: "IT",
      page: { type: "product", handle: "serum", title: "Vitamin C Serum" },
      history: [{ type: "search", terms: "retinol" }],
    });
    expect(prompt).toContain("IT");
    expect(prompt).toContain('"Vitamin C Serum"');
    expect(prompt).toContain('handle "serum"');
    expect(prompt).toContain('"retinol"');
  });
});

describe("contextPrompt market and empty history", () => {
  it("omits the market sentence without a country", () => {
    const prompt = contextPrompt({
      country: "",
      page: { type: "other" },
      history: [],
    });
    expect(prompt).not.toContain("shopping from");
    expect(prompt).not.toContain("Before this page");
  });

  it("warns about outdated prices and not reciting history", () => {
    const prompt = contextPrompt({
      country: "IT",
      page: { type: "other" },
      history: [{ type: "search", terms: "retinol" }],
    });
    expect(prompt).toContain("outdated");
    expect(prompt).toContain("never to recite");
  });

  it("renders collection and search pages", () => {
    expect(
      contextPrompt({
        country: "IT",
        page: { type: "collection", handle: "eyes", title: "Eye Care" },
        history: [],
      }),
    ).toContain("listProducts");
    expect(
      contextPrompt({
        country: "IT",
        page: { type: "search", terms: "retinol" },
        history: [],
      }),
    ).toContain('"retinol"');
  });
});

describe("resolveContext by type", () => {
  it("resolves a collection whose handle equals a product handle", () => {
    const both = {
      products: [{ handle: "same", title: "Product" }],
      collections: [{ handle: "same", title: "Collection" }],
    };
    expect(
      resolveContext(
        { ...base, page: { type: "collection", handle: "same" }, history: [] },
        both,
      ).page,
    ).toEqual({ type: "collection", handle: "same", title: "Collection" });
  });
});

function fakeStorefront(data: unknown) {
  const calls: { query: string; variables: Record<string, string> }[] = [];
  const storefront = {
    graphql: (query: string, options: { variables: never }) => {
      calls.push({ query, variables: options.variables });
      return Promise.resolve({ json: () => Promise.resolve({ data }) });
    },
  } as unknown as StorefrontApiContext;
  return { storefront, calls };
}

describe("loadCatalog", () => {
  it("falls back to an empty catalog when the storefront fails", async () => {
    const storefront = {
      graphql: () => Promise.reject(new Error("boom")),
    } as unknown as StorefrontApiContext;
    expect(
      await loadCatalog(storefront, {
        ...base,
        page: { type: "product", handle: "a" },
        history: [],
      }),
    ).toEqual({ products: [], collections: [] });
  });

  it("queries nothing for other pages and searches", async () => {
    const { storefront, calls } = fakeStorefront({});
    expect(
      await loadCatalog(storefront, {
        ...base,
        page: { type: "other" },
        history: [{ type: "search", terms: "x", at: 1 }],
      }),
    ).toEqual({ products: [], collections: [] });
    expect(calls).toHaveLength(0);
  });

  it("fetches exactly the needed handles in one query", async () => {
    const { storefront, calls } = fakeStorefront({
      p0: { handle: "serum", title: "Vitamin C Serum" },
      p1: null,
      c0: { handle: "eyes", title: "Eye Care" },
    });
    const catalog = await loadCatalog(storefront, {
      ...base,
      page: { type: "collection", handle: "eyes" },
      history: [
        { type: "product", handle: "serum", at: 1 },
        { type: "product", handle: "gone-x", at: 2 },
        { type: "product", handle: "serum", at: 3 },
      ],
    });
    expect(catalog).toEqual({
      products: [{ handle: "serum", title: "Vitamin C Serum" }],
      collections: [{ handle: "eyes", title: "Eye Care" }],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].variables).toMatchObject({
      country: "IT",
      p0: "serum",
      p1: "gone-x",
      c0: "eyes",
    });
    expect(calls[0].query).not.toContain("products(first");
  });
});
