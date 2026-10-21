import { describe, expect, it } from "vitest";

import { buttonLabel } from "./AddToCart";

describe("buttonLabel", () => {
  const base = { inCart: false, soldOut: false, pending: false };

  it("prefers inCart over soldOut, adding and addToCart", () => {
    expect(buttonLabel({ inCart: true, soldOut: true, pending: true })).toBe(
      "Added",
    );
  });

  it("prefers soldOut over adding, and adding over addToCart", () => {
    expect(buttonLabel({ ...base, soldOut: true, pending: true })).toBe(
      "Sold out",
    );
    expect(buttonLabel({ ...base, pending: true })).toBe("Adding…");
    expect(buttonLabel(base)).toBe("Add");
  });
});
