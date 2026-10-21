import { describe, expect, it } from "vitest";

import { buttonLabel } from "./AddToCart";

describe("buttonLabel", () => {
  const base = { inCart: false, soldOut: false, pending: false };

  it("prefers inCart over soldOut, adding and addToCart", () => {
    expect(buttonLabel({ inCart: true, soldOut: true, pending: true })).toEqual(
      { short: "Added", full: "In cart" },
    );
  });

  it("prefers soldOut over adding, and adding over addToCart", () => {
    expect(buttonLabel({ ...base, soldOut: true, pending: true }).full).toBe(
      "Sold out",
    );
    expect(buttonLabel({ ...base, pending: true }).full).toBe("Adding…");
    expect(buttonLabel(base)).toEqual({ short: "Add", full: "Add to cart" });
  });
});
