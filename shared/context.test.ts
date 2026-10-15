import { describe, expect, it } from "vitest";

import {
  pageContextSchema,
  samePage,
  shopperContextSchema,
  visitSchema,
} from "./context";

describe("context schemas", () => {
  it("rejects search terms over 200 characters", () => {
    expect(
      pageContextSchema.safeParse({ type: "search", terms: "x".repeat(201) })
        .success,
    ).toBe(false);
  });

  it("rejects more than 10 history items", () => {
    const visit = { type: "product", handle: "a", at: 1 };
    expect(
      shopperContextSchema.safeParse({
        country: "IT",
        language: "it",
        page: { type: "other" },
        history: Array(11).fill(visit),
      }).success,
    ).toBe(false);
  });

  it("rejects other as a visit", () => {
    expect(visitSchema.safeParse({ type: "other", at: 1 }).success).toBe(false);
  });
});

describe("samePage", () => {
  it("compares type and key", () => {
    expect(
      samePage(
        { type: "product", handle: "a" },
        { type: "product", handle: "a" },
      ),
    ).toBe(true);
    expect(
      samePage(
        { type: "product", handle: "a" },
        { type: "collection", handle: "a" },
      ),
    ).toBe(false);
    expect(
      samePage({ type: "search", terms: "a" }, { type: "search", terms: "b" }),
    ).toBe(false);
  });
});
