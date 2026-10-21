import { describe, expect, it } from "vitest";

import { visibleRange } from "./carousel";
import { discountPercent } from "./components/Price";

const slots = [
  { left: 20, width: 228 },
  { left: 260, width: 228 },
  { left: 500, width: 228 },
];

describe("visibleRange", () => {
  it("counts only the cards wholly in view", () => {
    expect(visibleRange(slots, 20, 478)).toEqual({ first: 0, last: 1 });
  });

  it("follows the scroll to the end", () => {
    expect(visibleRange(slots, 260, 478)).toEqual({ first: 1, last: 2 });
  });

  it("tolerates subpixel offsets", () => {
    expect(visibleRange(slots, 20.4, 477.8)).toEqual({ first: 0, last: 1 });
  });

  it("falls back to the card under the start when none fits whole", () => {
    expect(visibleRange(slots, 100, 120)).toEqual({ first: 0, last: 0 });
  });
});

describe("discountPercent", () => {
  const eur = (amount: string) => ({ amount, currencyCode: "EUR" });

  it("rounds the discount off the compare-at price", () => {
    expect(discountPercent(eur("48.00"), eur("60.00"))).toBe(20);
    expect(discountPercent(eur("24.00"), eur("30.00"))).toBe(20);
    expect(discountPercent(eur("19.99"), eur("29.99"))).toBe(33);
  });

  it("is 0 without a higher compare-at price", () => {
    expect(discountPercent(eur("48.00"), null)).toBe(0);
    expect(discountPercent(eur("48.00"), eur("48.00"))).toBe(0);
    expect(discountPercent(eur("48.00"), eur("40.00"))).toBe(0);
  });
});
