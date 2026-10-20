import { describe, expect, it } from "vitest";

import type { Cart } from "./ajax";
import { inCart } from "./index";

const line = (key: string, variant_id: number) =>
  ({ key, variant_id, quantity: 1 }) as Cart["items"][number];

const cart = (items: Cart["items"]): Cart => ({
  token: "t",
  item_count: items.length,
  total_price: 0,
  currency: "EUR",
  items,
});

describe("inCart", () => {
  const gid = "gid://shopify/ProductVariant/7";

  it("is true when any line holds the variant", () => {
    expect(inCart(cart([line("k1", 3), line("k2", 7)]), gid)).toBe(true);
  });

  it("is false when no line holds the variant", () => {
    expect(inCart(cart([line("k1", 3)]), gid)).toBe(false);
  });

  it("is false for a null cart", () => {
    expect(inCart(null, gid)).toBe(false);
  });
});
