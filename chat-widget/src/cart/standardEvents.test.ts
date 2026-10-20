// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Cart, CartItem } from "./ajax";
import {
  CART_LINES_UPDATE,
  standardEventsAdapter,
  toStandardCart,
} from "./standardEvents";

function item(key: string, quantity: number, linePrice: number): CartItem {
  return {
    key,
    variant_id: 1,
    product_title: "Tee",
    image: null,
    url: "/products/tee",
    quantity,
    final_line_price: linePrice,
    options_with_values: [],
    product_has_only_default_variant: true,
  };
}

const cart: Cart = {
  token: "tok123",
  item_count: 3,
  total_price: 14300,
  currency: "EUR",
  items: [item("1:abc", 2, 12900), item("2:def", 1, 1400)],
};

describe("toStandardCart", () => {
  it("ports the AJAX cart to the standard-events cart shape", () => {
    expect(toStandardCart(cart)).toEqual({
      id: "gid://shopify/Cart/tok123",
      totalQuantity: 3,
      cost: { totalAmount: { amount: "143.00", currencyCode: "EUR" } },
      lines: [
        {
          id: "gid://shopify/CartLine/1:abc",
          quantity: 2,
          cost: { totalAmount: { amount: "129.00", currencyCode: "EUR" } },
        },
        {
          id: "gid://shopify/CartLine/2:def",
          quantity: 1,
          cost: { totalAmount: { amount: "14.00", currencyCode: "EUR" } },
        },
      ],
      discountCodes: [],
    });
  });

  it("uses the currency's minor digits", () => {
    const yen = toStandardCart({
      ...cart,
      currency: "JPY",
      total_price: 150000,
      items: [],
    });
    expect(yen.cost.totalAmount.amount).toBe("1500");
  });
});

describe("standardEventsAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists the unique section ids of cart-items-component elements", () => {
    document.body.innerHTML = `
      <cart-items-component data-section-id="drawer"></cart-items-component>
      <cart-items-component data-section-id="main"></cart-items-component>
      <cart-items-component data-section-id="drawer"></cart-items-component>
      <cart-items-component></cart-items-component>`;
    expect(standardEventsAdapter.sections()).toEqual(["drawer", "main"]);
  });

  it("dispatches one bubbling lines-update event with action update", async () => {
    const events: Event[] = [];
    const listener = (event: Event) => events.push(event);
    document.addEventListener(CART_LINES_UPDATE, listener);
    const sections = { drawer: "<div></div>" };
    standardEventsAdapter.apply({ cart, sections });
    document.removeEventListener(CART_LINES_UPDATE, listener);

    expect(events).toHaveLength(1);
    const event = events[0] as Event & {
      action: string;
      context: string;
      lines: { id: string; quantity: number }[];
      promise: Promise<{
        cart: { totalQuantity: number };
        detail: { sections: unknown; itemCount: number };
      }>;
    };
    expect(event.type).toBe("shopify:cart:lines-update");
    expect(event.bubbles).toBe(true);
    expect(event.action).toBe("update");
    expect(event.action).not.toBe("add");
    expect(event.lines).toEqual([
      { id: "gid://shopify/CartLine/1:abc", quantity: 2 },
      { id: "gid://shopify/CartLine/2:def", quantity: 1 },
    ]);
    const resolved = await event.promise;
    expect(resolved.cart.totalQuantity).toBe(3);
    expect(resolved.detail).toEqual({ sections, itemCount: 3 });
  });

  it("does not throw when a listener throws", () => {
    const listener = () => {
      throw new Error("theme broke");
    };
    document.addEventListener(CART_LINES_UPDATE, listener);
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() =>
        standardEventsAdapter.apply({ cart, sections: {} }),
      ).not.toThrow();
    } finally {
      document.removeEventListener(CART_LINES_UPDATE, listener);
    }
  });
});
