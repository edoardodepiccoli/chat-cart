import { describe, expect, it } from "vitest";
import {
  defaultOptions,
  findVariant,
  isOptionValueAvailable,
  shownProductSchema,
  toProductSummary,
} from "./product";

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

describe("variant helpers", () => {
  const v = (id: string, size: string, color: string, available = true) => ({
    id,
    selectedOptions: [
      { name: "Size", value: size },
      { name: "Color", value: color },
    ],
    price: money("10.00"),
    compareAtPrice: null,
    available,
    imageUrl: null,
  });
  const variants = [
    v("1", "S", "Blue", false),
    v("2", "M", "Blue"),
    v("3", "M", "Black"),
  ];

  it("findVariant matches all picks", () => {
    expect(
      findVariant(variants, [
        { name: "Size", value: "M" },
        { name: "Color", value: "Black" },
      ])?.id,
    ).toBe("3");
    expect(
      findVariant(variants, [{ name: "Size", value: "M" }]),
    ).toBeUndefined();
  });

  it("defaultOptions starts on the first available variant", () => {
    expect(defaultOptions(variants)).toEqual(variants[1].selectedOptions);
  });

  it("isOptionValueAvailable disables sold-out values for the current picks", () => {
    const picks = defaultOptions(variants);
    expect(isOptionValueAvailable(variants, picks, "Size", "S")).toBe(false);
    expect(isOptionValueAvailable(variants, picks, "Color", "Black")).toBe(
      true,
    );
  });

  it("shownProductSchema still parses products saved without variants", () => {
    const old = {
      handle: "x",
      title: "X",
      image: null,
      price: money("1.00"),
      compareAtPrice: null,
      highlights: [],
    };
    expect(shownProductSchema.parse(old)).toEqual(old);
  });
});
