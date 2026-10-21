import { describe, expect, it } from "vitest";

import { buttonLabel } from "./AddToCart";

describe("buttonLabel", () => {
  const base = {
    inCart: false,
    soldOut: false,
    pending: false,
    multiple: false,
  };

  it("prefers inCart over soldOut, adding and addToCart", () => {
    expect(
      buttonLabel({ ...base, inCart: true, soldOut: true, pending: true }),
    ).toBe("Added");
  });

  it("prefers soldOut over adding, and adding over addToCart", () => {
    expect(buttonLabel({ ...base, soldOut: true, pending: true })).toBe(
      "Sold out",
    );
    expect(buttonLabel({ ...base, pending: true })).toBe("Adding…");
    expect(buttonLabel(base)).toBe("Add");
  });

  it("asks to select when the product has variants to pick", () => {
    expect(buttonLabel({ ...base, multiple: true })).toBe("Select");
    expect(buttonLabel({ ...base, multiple: true, pending: true })).toBe(
      "Adding…",
    );
  });
});
