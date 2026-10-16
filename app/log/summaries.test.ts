import { describe, expect, it } from "vitest";
import type {
  getProduct,
  getStorePage,
  listCollections,
  listProducts,
  listStorePages,
} from "../agent/storefront.server";
import type { ProductSummary } from "../../shared/product";
import { formatInput, summarizeToolResult } from "./summaries";

type Products = Awaited<ReturnType<typeof listProducts>>;
type Collections = Awaited<ReturnType<typeof listCollections>>;
type Product = NonNullable<Awaited<ReturnType<typeof getProduct>>>;
type Pages = Awaited<ReturnType<typeof listStorePages>>;
type Page = NonNullable<Awaited<ReturnType<typeof getStorePage>>>;

function listed(title: string, min: string, max: string): Products[number] {
  return {
    handle: title.toLowerCase(),
    title,
    description: "",
    tags: [],
    productType: "",
    vendor: "",
    collections: [],
    price: { min, max, currencyCode: "EUR" },
    onSale: false,
    compareAtPrice: null,
    available: true,
    options: [],
  };
}

const money = (amount: string) => ({ amount, currencyCode: "EUR" });

describe("summarizeToolResult", () => {
  it("summarizes listProducts with a cap", () => {
    const output: Products = [
      listed("Serum", "10.00", "12.00"),
      listed("Cream", "8.00", "8.00"),
      ...["A", "B", "C", "D", "E"].map((t) => listed(t, "1.00", "1.00")),
    ];
    expect(summarizeToolResult("listProducts", output)).toEqual([
      "7 match",
      '"Serum" 10.00–12.00 EUR',
      '"Cream" 8.00 EUR',
      '"A" 1.00 EUR',
      '"B" 1.00 EUR',
      '"C" 1.00 EUR',
      "+2 more",
    ]);
  });

  it("summarizes empty listProducts", () => {
    expect(summarizeToolResult("listProducts", [] satisfies Products)).toEqual([
      "0 match",
    ]);
  });

  it("summarizes listCollections and listStorePages", () => {
    const collections: Collections = [
      { handle: "a", title: "Face", description: "", productCount: 2 },
      { handle: "b", title: "Body", description: "", productCount: 1 },
    ];
    expect(summarizeToolResult("listCollections", collections)).toEqual([
      '2: "Face", "Body"',
    ]);
    const pages: Pages = [
      { handle: "shipping", title: "Shipping", url: "u", summary: "" },
    ];
    expect(summarizeToolResult("listStorePages", pages)).toEqual([
      '1: "Shipping"',
    ]);
  });

  it("summarizes getProduct", () => {
    const output: Product = {
      handle: "tee",
      title: "Tee",
      description: "",
      tags: [],
      images: [],
      options: [],
      variants: [
        {
          id: "1",
          selectedOptions: [
            { name: "Size", value: "S" },
            { name: "Color", value: "Red" },
          ],
          price: money("20.00"),
          compareAtPrice: null,
          available: true,
          imageUrl: null,
        },
        {
          id: "2",
          selectedOptions: [{ name: "Size", value: "M" }],
          price: money("25.00"),
          compareAtPrice: null,
          available: false,
          imageUrl: null,
        },
      ],
    };
    expect(summarizeToolResult("getProduct", output)).toEqual([
      '"Tee", 2 variants (S / Red ✓, M ✗), 20.00–25.00 EUR',
    ]);
  });

  it("summarizes a single default variant", () => {
    const output: Product = {
      handle: "mug",
      title: "Mug",
      description: "",
      tags: [],
      images: [],
      options: [],
      variants: [
        {
          id: "1",
          selectedOptions: [],
          price: money("9.00"),
          compareAtPrice: null,
          available: true,
          imageUrl: null,
        },
      ],
    };
    expect(summarizeToolResult("getProduct", output)).toEqual([
      '"Mug", 1 variant, 9.00 EUR',
    ]);
  });

  it("flags missing product and page", () => {
    expect(summarizeToolResult("getProduct", null)).toEqual(["⚠ not found"]);
    expect(summarizeToolResult("getStorePage", null)).toEqual(["⚠ not found"]);
  });

  it("summarizes getStorePage", () => {
    const output: Page = {
      handle: "faq",
      title: "FAQ",
      url: "u",
      text: "hello world",
    };
    expect(summarizeToolResult("getStorePage", output)).toEqual([
      '"FAQ", 11 chars',
    ]);
  });

  it("summarizes showProducts", () => {
    const product = (title: string, amount: string): ProductSummary => ({
      handle: title,
      title,
      image: null,
      price: money(amount),
      compareAtPrice: null,
    });
    expect(
      summarizeToolResult("showProducts", {
        products: [product("Serum", "10.00"), product("Cream", "8.00")],
      }),
    ).toEqual(['1. "Serum" 10.00 EUR', '2. "Cream" 8.00 EUR']);
  });

  it("summarizes showFaqCard", () => {
    expect(
      summarizeToolResult("showFaqCard", {
        title: "Shipping",
        answer: "3 days",
        url: "u",
      }),
    ).toEqual(['"Shipping": "3 days"']);
  });

  it("never throws on garbage", () => {
    for (const tool of [
      "listProducts",
      "listCollections",
      "getProduct",
      "listStorePages",
      "getStorePage",
      "showProducts",
      "showFaqCard",
    ] as const) {
      for (const garbage of [{ a: 1 }, "x", 42, undefined, [null, 1]]) {
        const lines = summarizeToolResult(tool, garbage);
        expect(lines).toHaveLength(1);
        expect(lines[0]).toMatch(/ B$/);
      }
    }
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(summarizeToolResult("getProduct", cyclic)).toEqual(["0 B"]);
  });
});

describe("formatInput", () => {
  it("formats pairs", () => {
    expect(formatInput({ handle: "serum" })).toBe("handle=serum");
    expect(formatInput({ handles: ["a", "b"] })).toBe("handles=[a,b]");
    expect(formatInput({ option: { name: "Size", value: "L" } })).toBe(
      'option={"name":"Size","value":"L"}',
    );
    expect(formatInput({ onSale: true, minPrice: 5 })).toBe(
      "onSale=true minPrice=5",
    );
  });

  it("handles empty and non-objects", () => {
    expect(formatInput({})).toBe("");
    expect(formatInput(undefined)).toBe("");
    expect(formatInput(null)).toBe("");
  });
});
