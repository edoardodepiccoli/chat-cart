// @vitest-environment happy-dom
// @vitest-environment-options {"url": "https://shop.test/cart"}
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

import type { Cart } from "../cart";
import { dawnAdapter } from "./dawn";

const cart: Cart = {
  token: "tok",
  item_count: 3,
  total_price: 3000,
  currency: "EUR",
  items: [],
};

const BUBBLE = `<a id="cart-icon-bubble"><span class="cart-count-bubble">1</span></a>`;
const FOOTER = `<div id="main-cart-footer" data-id="template--1__cart-footer"><div class="js-contents">€10</div></div>`;
const FOOTER_ID = "template--1__cart-footer";
const bubbleHtml = (count: string) =>
  `<div id="shopify-section-cart-icon-bubble" class="shopify-section"><span class="cart-count-bubble">${count}</span></div>`;
const footerHtml = (total: string) =>
  `<div class="shopify-section"><div class="js-contents">${total}</div></div>`;

const bubbleText = () =>
  document.querySelector("#cart-icon-bubble .cart-count-bubble")?.textContent;
const footerText = () =>
  document.querySelector("#main-cart-footer .js-contents")?.textContent;

let publish: Mock;
let fetchMock: Mock;

beforeEach(() => {
  document.body.innerHTML = BUBBLE + FOOTER;
  publish = vi.fn();
  window.publish = publish;
  fetchMock = vi.fn(async () =>
    Response.json({
      "cart-icon-bubble": bubbleHtml("7"),
      [FOOTER_ID]: footerHtml("€70"),
    }),
  );
  window.fetch = fetchMock as unknown as typeof fetch;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  delete window.publish;
  vi.restoreAllMocks();
});

describe("dawnAdapter", () => {
  it("detects Dawn by its publish function and cart bubble", () => {
    expect(dawnAdapter.detect()).toBe(true);
    delete window.publish;
    expect(dawnAdapter.detect()).toBe(false);
    window.publish = publish;
    document.body.innerHTML = FOOTER;
    expect(dawnAdapter.detect()).toBe(false);
  });

  it("does not detect Horizon", () => {
    delete window.publish;
    document.body.innerHTML = `<cart-items-component data-section-id="s1"></cart-items-component>`;
    expect(dawnAdapter.detect()).toBe(false);
  });

  it("sections lists the bubble, plus the footer on the cart page", () => {
    expect(dawnAdapter.sections()).toEqual(["cart-icon-bubble", FOOTER_ID]);
    document.body.innerHTML = BUBBLE;
    expect(dawnAdapter.sections()).toEqual(["cart-icon-bubble"]);
  });

  it("refresh swaps the bubble and footer, then publishes", async () => {
    await dawnAdapter.refresh({
      cart,
      sections: {
        "cart-icon-bubble": bubbleHtml("3"),
        [FOOTER_ID]: footerHtml("€30"),
      },
    });
    expect(bubbleText()).toBe("3");
    expect(footerText()).toBe("€30");
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith("cart-update", {
      source: "chat-cart",
      cartData: cart,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refresh fetches the sections when the write brought none", async () => {
    await dawnAdapter.refresh({ cart, sections: {} });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `/?sections=cart-icon-bubble,${FOOTER_ID}`,
    );
    expect(bubbleText()).toBe("7");
    expect(footerText()).toBe("€70");
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("a null section still publishes and swaps the rest", async () => {
    await expect(
      dawnAdapter.refresh({
        cart,
        sections: { "cart-icon-bubble": null, [FOOTER_ID]: footerHtml("€30") },
      }),
    ).resolves.toBeUndefined();
    expect(bubbleText()).toBe("1");
    expect(footerText()).toBe("€30");
    expect(publish).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a failed sections fetch still publishes", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(
      dawnAdapter.refresh({ cart, sections: {} }),
    ).resolves.toBeUndefined();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
  });

  it("warns once when the bubble is missing from the page", async () => {
    document.body.innerHTML = FOOTER;
    const sections = { "cart-icon-bubble": bubbleHtml("3") };
    await dawnAdapter.refresh({ cart, sections });
    await dawnAdapter.refresh({ cart, sections });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(console.warn).mock.calls[0][0])).toContain(
      "#cart-icon-bubble",
    );
  });
});
