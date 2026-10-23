// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import type { Cart } from "../cart";
import { horizonAdapter } from "./horizon";

const cart: Cart = {
  token: "tok",
  item_count: 0,
  total_price: 0,
  currency: "EUR",
  items: [],
};

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("horizonAdapter", () => {
  it("detects a page with cart-items-component[data-section-id]", () => {
    expect(horizonAdapter.detect()).toBe(false);
    document.body.innerHTML = `<cart-items-component></cart-items-component>`;
    expect(horizonAdapter.detect()).toBe(false);
    document.body.innerHTML = `<cart-items-component data-section-id="s1"></cart-items-component>`;
    expect(horizonAdapter.detect()).toBe(true);
  });

  it("sections lists unique non-empty ids", () => {
    document.body.innerHTML = `
      <cart-items-component data-section-id="s1"></cart-items-component>
      <cart-items-component data-section-id="s2"></cart-items-component>
      <cart-items-component data-section-id="s1"></cart-items-component>
      <cart-items-component data-section-id=""></cart-items-component>`;
    expect(horizonAdapter.sections()).toEqual(["s1", "s2"]);
  });

  it("refresh does nothing", () => {
    document.body.innerHTML = `<cart-items-component data-section-id="s1"></cart-items-component>`;
    const before = document.body.innerHTML;
    expect(horizonAdapter.refresh({ cart, sections: {} })).toBeUndefined();
    expect(document.body.innerHTML).toBe(before);
  });
});
