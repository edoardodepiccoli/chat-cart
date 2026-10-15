import { describe, expect, it } from "vitest";

import { addVisit, pageFromDataset, readHistory } from "./context";
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
