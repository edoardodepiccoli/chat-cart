import { expect, it } from "vitest";
import { trimHistory } from "./history";

const user = (id: string) => ({
  id,
  role: "user" as const,
  parts: [{ type: "text" as const, text: id }],
});

it("drops data tool parts and keeps display parts without images", () => {
  const assistant = {
    id: "a",
    role: "assistant" as const,
    parts: [
      {
        type: "tool-listProducts",
        toolCallId: "1",
        state: "output-available",
        input: {},
        output: [],
      },
      { type: "text", text: "Here" },
      {
        type: "tool-showProducts",
        toolCallId: "2",
        state: "output-available",
        input: {
          products: [
            {
              handle: "x",
              highlights: [
                { text: "a", kind: "pro" },
                { text: "b", kind: "pro" },
                { text: "c", kind: "con" },
              ],
            },
          ],
        },
        output: {
          products: [
            {
              handle: "x",
              title: "X",
              image: { url: "u", alt: null },
              price: { amount: "1", currencyCode: "EUR" },
              compareAtPrice: null,
            },
          ],
        },
      },
    ],
  };
  const [, trimmed] = trimHistory([user("u1"), assistant] as never);
  expect(trimmed.parts.map((p) => p.type)).toEqual([
    "text",
    "tool-showProducts",
  ]);
  expect(trimmed.parts[1]).toMatchObject({
    output: { products: [{ image: null }] },
  });
});

it("drops the options and variants of shown products", () => {
  const assistant = {
    id: "a",
    role: "assistant" as const,
    parts: [
      {
        type: "tool-showProducts",
        toolCallId: "1",
        state: "output-available",
        input: { products: [{ handle: "x", highlights: [] }] },
        output: {
          products: [
            {
              handle: "x",
              title: "X",
              image: { url: "u", alt: null },
              price: { amount: "1", currencyCode: "EUR" },
              compareAtPrice: null,
              options: [{ name: "Size", values: ["S", "M"] }],
              variants: [{ id: "gid://shopify/ProductVariant/1" }],
            },
          ],
        },
      },
    ],
  };
  const [, trimmed] = trimHistory([user("u1"), assistant] as never);
  const [product] = (trimmed.parts[0] as { output: { products: object[] } })
    .output.products;
  expect(product).toMatchObject({ handle: "x", title: "X", image: null });
  expect(product).not.toHaveProperty("options");
  expect(product).not.toHaveProperty("variants");
});

it("keeps at most 20 messages and starts at a user message", () => {
  const messages = Array.from({ length: 25 }, (_, i) => user(`u${i}`));
  const trimmed = trimHistory(messages as never);
  expect(trimmed).toHaveLength(20);
  expect(trimmed[0].id).toBe("u5");
});
