import { describe, expect, it } from "vitest";

import {
  addVisit,
  getShopperContext,
  pageFromDataset,
  readHistory,
  recordVisit,
} from "./context";
import type { Visit } from "../../shared/context";

const p = (handle: string) => ({ type: "product" as const, handle });

describe("addVisit", () => {
  it("collapses a repeat of the last visit", () => {
    expect(addVisit([{ ...p("a"), at: 1 }], p("a"), 2)).toEqual([
      { ...p("a"), at: 2 },
    ]);
  });

  it("ignores other pages", () => {
    expect(addVisit([], { type: "other" }, 1)).toEqual([]);
  });

  it("keeps the last 10", () => {
    let history: Visit[] = [];
    for (let i = 0; i < 12; i++) history = addVisit(history, p(`h${i}`), i);
    expect(history.map((v) => (v as { handle: string }).handle)).toEqual([
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "h7",
      "h8",
      "h9",
      "h10",
      "h11",
    ]);
  });
});

describe("readHistory", () => {
  it("reads corrupt storage as empty", () => {
    const storage = { getItem: () => "{not json" } as unknown as Storage;
    expect(readHistory(storage)).toEqual([]);
    const wrong = {
      getItem: () => JSON.stringify([{ type: "product" }]),
    } as unknown as Storage;
    expect(readHistory(wrong)).toEqual([]);
    expect(readHistory(undefined)).toEqual([]);
  });

  it("returns valid stored visits", () => {
    const visits = [{ ...p("a"), at: 1 }];
    const storage = {
      getItem: () => JSON.stringify(visits),
    } as unknown as Storage;
    expect(readHistory(storage)).toEqual(visits);
  });
});

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
});

function fakeStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial) data.set("chat-cart:history", initial);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

describe("recordVisit", () => {
  it("exposes history without the current page and stores the updated list", () => {
    const before = [{ ...p("a"), at: 1 }];
    const storage = fakeStorage(JSON.stringify(before));
    recordVisit(p("b"), storage as unknown as Storage);
    expect(getShopperContext().history).toEqual(before);
    const stored = JSON.parse(storage.data.get("chat-cart:history") ?? "[]");
    expect(stored.map((v: { handle: string }) => v.handle)).toEqual(["a", "b"]);
  });

  it("does not throw when storage throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    expect(() => recordVisit(p("a"), storage)).not.toThrow();
    expect(getShopperContext().history).toEqual([]);
  });

  it("leaves storage alone on other pages", () => {
    const storage = fakeStorage();
    recordVisit({ type: "other" }, storage as unknown as Storage);
    expect(storage.data.size).toBe(0);
  });
});

describe("more edge cases", () => {
  it("collapses only against the last visit", () => {
    const history = [
      { ...p("a"), at: 1 },
      { ...p("b"), at: 2 },
    ];
    expect(addVisit(history, p("a"), 3).map((v) => v.at)).toEqual([1, 2, 3]);
  });

  it("trims stored history to the last 10", () => {
    const visits = Array.from({ length: 12 }, (_, i) => ({
      ...p(`h${i}`),
      at: i,
    }));
    const storage = {
      getItem: () => JSON.stringify(visits),
    } as unknown as Storage;
    expect(readHistory(storage)).toEqual(visits.slice(2));
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
