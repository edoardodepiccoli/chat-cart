import { describe, expect, it } from "vitest";
import { toProductSummary } from "./product";

const money = (amount: string) => ({ amount, currencyCode: "EUR" });
const variant = (over = {}) => ({
  price: money("20.00"),
  compareAtPrice: null,
  available: true,
  imageUrl: null,
  ...over,
});

describe("toProductSummary", () => {
  it("uses the first available variant's price and image", () => {
    const summary = toProductSummary({
      handle: "serum",
      title: "Serum",
      images: [{ url: "a.jpg", alt: "A" }],
      variants: [
        variant({ available: false, price: money("10.00") }),
        variant({
          price: money("30.00"),
          compareAtPrice: money("40.00"),
          imageUrl: "v.jpg",
        }),
      ],
    });
    expect(summary).toEqual({
      handle: "serum",
      title: "Serum",
      image: { url: "v.jpg", alt: "A" },
      price: money("30.00"),
      compareAtPrice: money("40.00"),
    });
  });

  it("falls back to the first variant and the first image", () => {
    const summary = toProductSummary({
      handle: "x",
      title: "X",
      images: [{ url: "a.jpg", alt: null }],
      variants: [variant({ available: false, price: money("5.00") })],
    });
    expect(summary.price).toEqual(money("5.00"));
    expect(summary.image).toEqual({ url: "a.jpg", alt: null });
  });

  it("has no image when the product has none", () => {
    const summary = toProductSummary({
      handle: "x",
      title: "X",
      images: [],
      variants: [variant()],
    });
    expect(summary.image).toBeNull();
  });
});
