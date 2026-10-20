// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Cart } from "./ajax";
import { noopAdapter, sectionAdapter } from "./theme";

const cart: Cart = {
  token: "t",
  item_count: 0,
  total_price: 0,
  currency: "EUR",
  items: [],
};

const targets = [
  { section: "icon", selector: "#count" },
  { section: "drawer", selector: "#drawer" },
];

describe("sectionAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<span id="count">1</span><div id="drawer">old</div>';
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces matching elements and calls after once", () => {
    const after = vi.fn();
    const adapter = sectionAdapter("t", targets, after);
    adapter.apply({
      cart,
      sections: {
        icon: '<div><span id="count">2</span></div>',
        drawer: '<div id="drawer">new</div>',
      },
    });
    expect(document.querySelector("#count")?.innerHTML).toBe("2");
    expect(document.querySelector("#drawer")?.innerHTML).toBe("new");
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("skips null sections and applies the others", () => {
    const adapter = sectionAdapter("t", targets);
    adapter.apply({
      cart,
      sections: { icon: null, drawer: '<div id="drawer">new</div>' },
    });
    expect(document.querySelector("#count")?.innerHTML).toBe("1");
    expect(document.querySelector("#drawer")?.innerHTML).toBe("new");
  });

  it("skips targets whose live element is missing", () => {
    document.body.innerHTML = '<div id="drawer">old</div>';
    const adapter = sectionAdapter("t", targets);
    expect(() =>
      adapter.apply({
        cart,
        sections: {
          icon: '<span id="count">2</span>',
          drawer: '<div id="drawer">new</div>',
        },
      }),
    ).not.toThrow();
    expect(document.querySelector("#drawer")?.innerHTML).toBe("new");
  });

  it("warns once when nothing matches, even across applies", () => {
    document.body.innerHTML = "";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const after = vi.fn();
    const adapter = sectionAdapter("t", targets, after);
    adapter.apply({ cart, sections: { icon: '<span id="count">2</span>' } });
    adapter.apply({ cart, sections: { icon: '<span id="count">2</span>' } });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("chat-widget/src/cart/adapters.ts"),
    );
    expect(after).not.toHaveBeenCalled();
  });

  it("lists unique section ids", () => {
    const adapter = sectionAdapter("t", [
      ...targets,
      { section: "icon", selector: ".other" },
    ]);
    expect(adapter.sections()).toEqual(["icon", "drawer"]);
  });
});

describe("noopAdapter", () => {
  it("does nothing", () => {
    expect(noopAdapter.sections()).toEqual([]);
    expect(() =>
      noopAdapter.apply({ cart, sections: { a: "<div></div>" } }),
    ).not.toThrow();
  });
});
