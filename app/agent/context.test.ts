import { describe, expect, it } from "vitest";

import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import { loadCatalog, needsCatalog, resolveContext } from "./context.server";
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

describe("needsCatalog", () => {
  it("needs nothing for other pages and searches", () => {
    expect(
      needsCatalog({
        ...base,
        page: { type: "other" },
        history: [{ type: "search", terms: "x", at: 1 }],
      }),
    ).toEqual({ products: false, collections: false });
  });

  it("needs products and collections only when handles are present", () => {
    expect(
      needsCatalog({
        ...base,
        page: { type: "collection", handle: "a" },
        history: [],
      }),
    ).toEqual({ products: false, collections: true });
    expect(
      needsCatalog({
        ...base,
        page: { type: "other" },
        history: [{ type: "product", handle: "a", at: 1 }],
      }),
    ).toEqual({ products: true, collections: false });
  });
});

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
});
