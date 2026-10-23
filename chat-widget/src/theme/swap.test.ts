// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import { swapFromHtml } from "./swap";

const texts = (selector: string) =>
  Array.from(document.querySelectorAll(selector), (el) => el.textContent);

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("swapFromHtml", () => {
  it("copies innerHTML pairwise by index", () => {
    document.body.innerHTML = `<b class="n">1</b><b class="n">2</b>`;
    const missing = swapFromHtml(`<b class="n">5</b><b class="n">6</b>`, [
      { live: ".n", fresh: ".n" },
    ]);
    expect(texts(".n")).toEqual(["5", "6"]);
    expect(missing).toEqual([]);
  });

  it("uses different live and fresh selectors", () => {
    document.body.innerHTML = `<a id="bubble">1</a>`;
    swapFromHtml(`<div class="shopify-section"><span>3</span></div>`, [
      { live: "#bubble", fresh: ".shopify-section" },
    ]);
    expect(document.getElementById("bubble")?.innerHTML).toBe("<span>3</span>");
  });

  it("leaves a live element without a parsed counterpart alone", () => {
    document.body.innerHTML = `<b class="n">1</b><b class="n">2</b>`;
    swapFromHtml(`<b class="n">5</b>`, [{ live: ".n", fresh: ".n" }]);
    expect(texts(".n")).toEqual(["5", "2"]);
  });

  it("does not touch elements outside the targets", () => {
    document.body.innerHTML = `<b class="n">1</b><i class="o">keep</i>`;
    swapFromHtml(`<b class="n">5</b><i class="o">new</i>`, [
      { live: ".n", fresh: ".n" },
    ]);
    expect(texts(".o")).toEqual(["keep"]);
  });

  it("returns targets whose live selector matched nothing", () => {
    document.body.innerHTML = `<b class="n">1</b>`;
    const missing = swapFromHtml(`<b class="n">5</b>`, [
      { live: ".n", fresh: ".n" },
      { live: ".gone", fresh: ".gone" },
    ]);
    expect(missing).toEqual([{ live: ".gone", fresh: ".gone" }]);
  });

  it("treats an invalid selector as unmatched and still swaps the others", () => {
    document.body.innerHTML = `<b class="n">1</b>`;
    let missing: unknown;
    expect(() => {
      missing = swapFromHtml(`<b class="n">5</b>`, [
        { live: "div[", fresh: "div[" },
        { live: ".n", fresh: ".n" },
      ]);
    }).not.toThrow();
    expect(texts(".n")).toEqual(["5"]);
    expect(missing).toEqual([{ live: "div[", fresh: "div[" }]);
  });
});
