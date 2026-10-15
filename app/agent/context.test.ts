import { describe, expect, it } from "vitest";

import { resolveContext } from "./context.server";
import { contextPrompt } from "./prompts/context";

const catalog = {
  products: [{ handle: "serum", title: "Vitamin C Serum" }],
  collections: [{ handle: "eyes", title: "Eye Care" }],
};
const base = { country: "IT", language: "it" };

describe("resolveContext", () => {
  it("resolves titles and drops unknown history handles", () => {
    const resolved = resolveContext(
      {
        ...base,
        page: { type: "collection", handle: "eyes" },
        history: [
          { type: "product", handle: "gone", at: 1 },
          { type: "product", handle: "serum", at: 2 },
          { type: "search", terms: "retinol", at: 3 },
        ],
      },
      catalog,
    );
    expect(resolved.page).toEqual({
      type: "collection",
      handle: "eyes",
      title: "Eye Care",
    });
    expect(resolved.history).toEqual([
      { type: "product", handle: "serum", title: "Vitamin C Serum" },
      { type: "search", terms: "retinol" },
    ]);
  });

  it("treats an unknown current page as other", () => {
    expect(
      resolveContext(
        { ...base, page: { type: "product", handle: "gone" }, history: [] },
        catalog,
      ).page,
    ).toEqual({ type: "other" });
  });
});

describe("contextPrompt", () => {
  it("names page, visits and searches", () => {
    const prompt = contextPrompt({
      country: "IT",
      page: { type: "product", handle: "serum", title: "Vitamin C Serum" },
      history: [{ type: "search", terms: "retinol" }],
    });
    expect(prompt).toContain("IT");
    expect(prompt).toContain('"Vitamin C Serum"');
    expect(prompt).toContain('handle "serum"');
    expect(prompt).toContain('"retinol"');
  });
});
