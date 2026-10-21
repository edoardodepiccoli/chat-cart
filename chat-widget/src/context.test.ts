import { describe, expect, it } from "vitest";

import { pageFromDataset } from "./context";

describe("pageFromDataset", () => {
  it("maps page type data attributes", () => {
    expect(
      pageFromDataset({ pageType: "collection", collectionHandle: "serums" }),
    ).toEqual({ type: "collection", handle: "serums" });
    expect(
      pageFromDataset({ pageType: "search", searchTerms: "retinol" }),
    ).toEqual({ type: "search", terms: "retinol" });
    expect(pageFromDataset({ pageType: "index" })).toEqual({ type: "other" });
    expect(pageFromDataset({ pageType: "product", productHandle: "" })).toEqual(
      { type: "other" },
    );
  });

  it("maps a product page carrying a collection handle to product", () => {
    expect(
      pageFromDataset({
        pageType: "product",
        productHandle: "a",
        collectionHandle: "c",
      }),
    ).toEqual({ type: "product", handle: "a" });
  });

  it("treats oversized or empty values as other", () => {
    const long = "x".repeat(201);
    expect(
      pageFromDataset({ pageType: "product", productHandle: long }),
    ).toEqual({ type: "other" });
    expect(
      pageFromDataset({ pageType: "collection", collectionHandle: long }),
    ).toEqual({ type: "other" });
    expect(pageFromDataset({ pageType: "search", searchTerms: long })).toEqual({
      type: "other",
    });
    expect(pageFromDataset({ pageType: "search", searchTerms: "" })).toEqual({
      type: "other",
    });
    expect(pageFromDataset({ pageType: "search" })).toEqual({ type: "other" });
  });
});
