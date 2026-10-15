import { describe, expect, it } from "vitest";

import { teasersApply } from "./useTeasers";

describe("teasersApply", () => {
  it("runs on product, collection and search pages", () => {
    expect(teasersApply({ type: "product", handle: "a" })).toBe(true);
    expect(teasersApply({ type: "collection", handle: "a" })).toBe(true);
    expect(teasersApply({ type: "search", terms: "a" })).toBe(true);
  });

  it("does not run elsewhere", () => {
    expect(teasersApply({ type: "other" })).toBe(false);
  });
});
