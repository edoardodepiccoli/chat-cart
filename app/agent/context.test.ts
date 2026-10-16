import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import { setSink } from "../log/logger.server";
import { loadCatalog, logContext, resolveContext } from "./context.server";
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
    const { catalog, stats } = await loadCatalog(storefront, {
      ...base,
      page: { type: "product", handle: "a" },
      history: [],
    });
    expect(catalog).toEqual({ products: [], collections: [] });
    expect(stats).toMatchObject({ queries: 1, handles: 0, error: "boom" });
  });

  it("queries nothing for other pages and searches", async () => {
    const { storefront, calls } = fakeStorefront({});
    expect(
      await loadCatalog(storefront, {
        ...base,
        page: { type: "other" },
        history: [{ type: "search", terms: "x", at: 1 }],
      }),
    ).toEqual({ catalog: { products: [], collections: [] }, stats: "skipped" });
    expect(calls).toHaveLength(0);
  });

  it("fetches exactly the needed handles in one query", async () => {
    const { storefront, calls } = fakeStorefront({
      p0: { handle: "serum", title: "Vitamin C Serum" },
      p1: null,
      c0: { handle: "eyes", title: "Eye Care" },
    });
    const { catalog, stats } = await loadCatalog(storefront, {
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
    expect(stats).toMatchObject({ queries: 1, handles: 2 });
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

describe("resolveContext dropped", () => {
  it("lists unknown page and history handles with where", () => {
    const resolved = resolveContext(
      {
        ...base,
        page: { type: "collection", handle: "gone-eyes" },
        history: [
          { type: "product", handle: "old-serum", at: 1 },
          { type: "product", handle: "serum", at: 2 },
        ],
      },
      catalog,
    );
    expect(resolved.dropped).toEqual([
      { type: "collection", handle: "gone-eyes", where: "page" },
      { type: "product", handle: "old-serum", where: "history" },
    ]);
  });
});

describe("logContext", () => {
  let lines: string[];
  let restore: () => void;
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.LOG_LEVEL;
    process.env.LOG_FORMAT = "pretty";
    process.env.NO_COLOR = "1";
    lines = [];
    restore = setSink((line) => lines.push(line));
  });

  afterEach(() => {
    restore();
    process.env = { ...saved };
  });

  const context = {
    ...base,
    page: { type: "product" as const, handle: "serum" },
    history: [
      { type: "collection" as const, handle: "eyes", at: 1 },
      { type: "search" as const, terms: "retinol", at: 2 },
      { type: "product" as const, handle: "old-serum", at: 3 },
    ],
  };

  it("logs market, page, numbered visits with drops and the catalog", () => {
    logContext(context, resolveContext(context, catalog), {
      queries: 1,
      handles: 2,
      ms: 83,
    });
    const text = lines.join("\n");
    expect(text).toMatch(/shopper\s+market=IT\/it/);
    expect(text).toMatch(/page\s+product "Vitamin C Serum" \(serum\)/);
    expect(text).toMatch(/visited\s+1\. collection "Eye Care" \(eyes\)/);
    expect(text).toContain('2. search "retinol"');
    expect(text).toContain("3. product ⚠ unknown (old-serum) — dropped");
    expect(text).toMatch(/catalog\s+1 query, 2 handles ms=83/);
  });

  it("logs a skipped catalog", () => {
    const other = { ...base, page: { type: "other" as const }, history: [] };
    logContext(other, resolveContext(other, catalog), "skipped");
    expect(lines.join("\n")).toMatch(/catalog\s+skipped/);
  });

  it("puts the context prompt in a debug payload", () => {
    process.env.LOG_LEVEL = "debug";
    logContext(context, resolveContext(context, catalog), "skipped");
    expect(lines.join("\n")).toContain("Vitamin C Serum");
    expect(lines.some((line) => line.includes('handle \\"serum\\"'))).toBe(
      true,
    );
  });
});
