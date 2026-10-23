// @vitest-environment happy-dom
// @vitest-environment-options {"url": "https://shop.test/products/tee"}
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
import { parseSelectors, selectorsAdapter } from "./selectors";

const cart: Cart = {
  token: "tok",
  item_count: 1,
  total_price: 1000,
  currency: "EUR",
  items: [],
};
const update = { cart, sections: {} };
const page = (count: string) =>
  new Response(`<html><body><span class="count">${count}</span></body></html>`);

let fetchMock: Mock;

beforeEach(() => {
  document.body.innerHTML = `<span class="count">1</span>`;
  fetchMock = vi.fn(async () => page("3"));
  window.fetch = fetchMock as unknown as typeof fetch;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const count = () => document.querySelector(".count")?.textContent;

describe("parseSelectors", () => {
  it("splits on commas, trims and drops empties", () => {
    expect(parseSelectors(" , .a ,, .b ")).toEqual([".a", ".b"]);
    expect(parseSelectors("")).toEqual([]);
    expect(parseSelectors(undefined)).toEqual([]);
  });
});

describe("selectorsAdapter", () => {
  it("detect is always true and sections is empty", () => {
    const adapter = selectorsAdapter([".count"]);
    expect(adapter.detect()).toBe(true);
    expect(adapter.sections()).toEqual([]);
  });

  it("with no selectors, refresh makes no request", async () => {
    await selectorsAdapter([]).refresh(update);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refresh fetches location.href and swaps each selector", async () => {
    await selectorsAdapter([".count"]).refresh(update);
    expect(count()).toBe("3");
    expect(String(fetchMock.mock.calls[0][0])).toBe(location.href);
  });

  it("drops a stale response", async () => {
    let releaseFirst!: (response: Response) => void;
    fetchMock
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => (releaseFirst = resolve)),
      )
      .mockImplementationOnce(async () => page("4"));
    const adapter = selectorsAdapter([".count"]);

    const first = adapter.refresh(update);
    await adapter.refresh(update);
    releaseFirst(page("2"));
    await first;
    expect(count()).toBe("4");
  });

  it("logs and skips swapping when the page answers with an error", async () => {
    fetchMock.mockImplementationOnce(
      async () => new Response("", { status: 500 }),
    );
    await expect(
      selectorsAdapter([".count"]).refresh(update),
    ).resolves.toBeUndefined();
    expect(count()).toBe("1");
    expect(console.error).toHaveBeenCalled();
  });

  it("logs and skips swapping when the page fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(
      selectorsAdapter([".count"]).refresh(update),
    ).resolves.toBeUndefined();
    expect(count()).toBe("1");
    expect(console.error).toHaveBeenCalled();
  });

  it("warns once for a selector that matches nothing", async () => {
    const adapter = selectorsAdapter([".count", ".missing"]);
    await adapter.refresh(update);
    await adapter.refresh(update);
    expect(console.warn).toHaveBeenCalledTimes(1);
    const message = String(vi.mocked(console.warn).mock.calls[0][0]);
    expect(message).toContain(".missing");
    expect(message).toContain("Cart elements to refresh");
  });
});
