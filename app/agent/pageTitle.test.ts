import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import { resolvePage } from "./pageTitle.server";
import { shopperPrompt } from "./prompts/shopper";

const market = { country: "IT", language: "it" };
const graphql = vi.fn();
const storefront = { graphql } as unknown as StorefrontApiContext;

beforeEach(() => {
  graphql.mockReset();
});

describe("resolvePage", () => {
  it("returns the page with its title", async () => {
    graphql.mockResolvedValue(
      Response.json({ data: { product: { title: "Vitamin C Serum" } } }),
    );
    expect(
      await resolvePage(storefront, market, {
        type: "product",
        handle: "serum",
      }),
    ).toEqual({ type: "product", handle: "serum", title: "Vitamin C Serum" });
  });

  it("asks for a collection with the collection query", async () => {
    graphql.mockResolvedValue(
      Response.json({ data: { collection: { title: "Eye Care" } } }),
    );
    expect(
      await resolvePage(storefront, market, {
        type: "collection",
        handle: "eyes",
      }),
    ).toEqual({ type: "collection", handle: "eyes", title: "Eye Care" });
    expect(graphql.mock.calls[0][0]).toContain("collection(handle");
  });

  it("returns other for an unknown handle", async () => {
    graphql.mockResolvedValue(Response.json({ data: { product: null } }));
    expect(
      await resolvePage(storefront, market, {
        type: "product",
        handle: "gone",
      }),
    ).toEqual({ type: "other" });
  });

  it("returns other when the storefront fails", async () => {
    graphql.mockRejectedValue(new Error("down"));
    expect(
      await resolvePage(storefront, market, {
        type: "product",
        handle: "serum",
      }),
    ).toEqual({ type: "other" });
  });

  it("queries nothing for search and other pages", async () => {
    expect(
      await resolvePage(storefront, market, {
        type: "search",
        terms: "retinol",
      }),
    ).toEqual({ type: "search", terms: "retinol" });
    expect(await resolvePage(storefront, market, { type: "other" })).toEqual({
      type: "other",
    });
    expect(graphql).not.toHaveBeenCalled();
  });
});

describe("shopperPrompt", () => {
  it("names the market and the page", () => {
    const prompt = shopperPrompt({
      country: "IT",
      page: { type: "product", handle: "serum", title: "Vitamin C Serum" },
    });
    expect(prompt).toContain("IT");
    expect(prompt).toContain('"Vitamin C Serum"');
    expect(prompt).toContain('handle "serum"');
  });

  it("omits the market sentence without a country", () => {
    const prompt = shopperPrompt({ country: "", page: { type: "other" } });
    expect(prompt).not.toContain("shopping from");
  });

  it("warns about outdated prices", () => {
    const prompt = shopperPrompt({ country: "IT", page: { type: "other" } });
    expect(prompt).toContain("outdated");
  });

  it("renders collection and search pages", () => {
    const collection = shopperPrompt({
      country: "IT",
      page: { type: "collection", handle: "eyes", title: "Eye Care" },
    });
    expect(collection).toContain("listProducts");
    expect(collection).not.toContain("Before this page");
    expect(
      shopperPrompt({
        country: "IT",
        page: { type: "search", terms: "retinol" },
      }),
    ).toContain('"retinol"');
  });
});
