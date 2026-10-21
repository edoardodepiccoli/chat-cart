import { describe, expect, it } from "vitest";

import { buttonLabel } from "./AddToCart";

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
