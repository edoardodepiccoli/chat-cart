import { describe, expect, it, vi } from "vitest";

import {
  conversationText,
  teasersSchema,
  withDeadline,
} from "./teasers.server";

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

describe("teasersSchema trimming", () => {
  it("trims before checking distinctness and in the output", () => {
    expect(teasersSchema.safeParse({ teasers: [" a", "a", "c"] }).success).toBe(
      false,
    );
    expect(teasersSchema.parse({ teasers: [" a ", "b", "c"] }).teasers[0]).toBe(
      "a",
    );
  });
});

describe("withDeadline", () => {
  it("returns the result when the task finishes in time", async () => {
    expect(await withDeadline(async () => ["a"], 1000)).toEqual(["a"]);
  });

  it("aborts and returns an empty list when the deadline passes", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const result = withDeadline((s) => {
      signal = s;
      return new Promise<string[]>(() => {});
    }, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toEqual([]);
    expect(signal?.aborted).toBe(true);
    vi.useRealTimers();
  });
});

describe("conversationText", () => {
  it("keeps only the last messages", () => {
    const messages = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      role: "user",
      parts: [{ type: "text", text: `m${i}` }],
    }));
    const lines = conversationText(messages as never).split("\n");
    expect(lines).toHaveLength(10);
    expect(lines[0]).toBe("Shopper: m2");
  });

  it("renders a faq card as a showed line", () => {
    const messages = [
      {
        id: "1",
        role: "assistant",
        parts: [
          {
            type: "tool-showFaqCard",
            state: "output-available",
            toolCallId: "t",
            input: {},
            output: { title: "Returns", answer: "x", url: "/r" },
          },
        ],
      },
    ];
    expect(conversationText(messages as never)).toBe(
      "Assistant showed: Returns",
    );
  });

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
