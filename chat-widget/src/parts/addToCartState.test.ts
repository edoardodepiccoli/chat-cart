import { describe, expect, it } from "vitest";

import { buttonLabel, errorFor, shouldClosePicker } from "./addToCartState";

const A = "gid://shopify/ProductVariant/1";
const B = "gid://shopify/ProductVariant/2";
const staleA = { key: A, message: "Couldn't update your cart. Try again." };

describe("card cart errors", () => {
  it("ignores a stale error for another variant", () => {
    expect(errorFor(staleA, B)).toBeNull();
    expect(shouldClosePicker(staleA, B)).toBe(true);
  });

  it("shows an error for the selected variant and keeps the picker open", () => {
    expect(errorFor(staleA, A)).toBe(staleA.message);
    expect(shouldClosePicker(staleA, A)).toBe(false);
  });

  it("closes the picker when there is no error", () => {
    expect(errorFor(null, A)).toBeNull();
    expect(shouldClosePicker(null, A)).toBe(true);
  });
});

describe("buttonLabel", () => {
  const base = {
    inCart: false,
    multiple: true,
    soldOut: false,
    pending: false,
    values: "Blue / M",
  };

  it("prefers inCart over soldOut, adding and addToCart", () => {
    expect(
      buttonLabel({ ...base, inCart: true, soldOut: true, pending: true }),
    ).toBe("In cart · Blue / M");
    expect(buttonLabel({ ...base, inCart: true, multiple: false })).toBe(
      "In cart",
    );
  });

  it("prefers soldOut over adding, and adding over addToCart", () => {
    expect(buttonLabel({ ...base, soldOut: true, pending: true })).toBe(
      "Sold out",
    );
    expect(buttonLabel({ ...base, pending: true })).toBe("Adding…");
    expect(buttonLabel(base)).toBe("Add to cart");
  });
});
