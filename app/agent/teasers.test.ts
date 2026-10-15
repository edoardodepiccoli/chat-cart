import { describe, expect, it } from "vitest";

import { conversationText, teasersSchema } from "./teasers.server";

describe("teasersSchema", () => {
  it("accepts three distinct short teasers", () => {
    expect(teasersSchema.safeParse({ teasers: ["a", "b", "c"] }).success).toBe(
      true,
    );
  });

  it("rejects duplicates, a fourth item and teasers over 50 characters", () => {
    expect(teasersSchema.safeParse({ teasers: ["a", "A", "c"] }).success).toBe(
      false,
    );
    expect(
      teasersSchema.safeParse({ teasers: ["a", "b", "c", "d"] }).success,
    ).toBe(false);
    expect(
      teasersSchema.safeParse({ teasers: ["a", "b", "x".repeat(51)] }).success,
    ).toBe(false);
  });
});

describe("conversationText", () => {
  it("renders the last messages as plain chat lines", () => {
    const messages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "eye cream?" }] },
      {
        id: "2",
        role: "assistant",
        parts: [
          {
            type: "tool-listProducts",
            state: "output-available",
            toolCallId: "t",
            input: {},
            output: [],
          },
          { type: "text", text: "Try these." },
          {
            type: "tool-showProducts",
            state: "output-available",
            toolCallId: "u",
            input: { handles: ["e"] },
            output: {
              products: [
                {
                  handle: "e",
                  title: "Eye Elixir",
                  image: null,
                  price: { amount: "1", currencyCode: "EUR" },
                  compareAtPrice: null,
                },
              ],
            },
          },
        ],
      },
    ];

    expect(conversationText(messages as never)).toBe(
      "Shopper: eye cream?\nAssistant: Try these.\nAssistant showed: Eye Elixir",
    );
    expect(conversationText([])).toBe("");
  });
});
