import { describe, expect, it } from "vitest";

import { pageContextSchema, shopperContextSchema } from "./shopperContext";

describe("context schemas", () => {
  it("rejects search terms over 200 characters", () => {
    expect(
      pageContextSchema.safeParse({ type: "search", terms: "x".repeat(201) })
        .success,
    ).toBe(false);
  });

  it("accepts and drops history sent by an old widget", () => {
    const parsed = shopperContextSchema.parse({
      country: "IT",
      language: "it",
      page: { type: "other" },
      history: [{ type: "search", terms: "x", at: 1 }],
    });
    expect(parsed).toEqual({
      country: "IT",
      language: "it",
      page: { type: "other" },
    });
  });
});
