import { z } from "zod";

const moneySchema = z.object({ amount: z.string(), currencyCode: z.string() });

export type Money = z.infer<typeof moneySchema>;

export type ProductOption = { name: string; values: string[] };

export const productSummarySchema = z.object({
  handle: z.string(),
  title: z.string(),
  image: z.object({ url: z.string(), alt: z.string().nullable() }).nullable(),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable(),
});

export type ProductSummary = z.infer<typeof productSummarySchema>;

export const highlightSchema = z.object({
  text: z.string(),
  kind: z.enum(["pro", "con"]),
});

export type Highlight = z.infer<typeof highlightSchema>;

export const shownProductSchema = productSummarySchema.extend({
  highlights: z.array(highlightSchema),
});

export type ShownProduct = z.infer<typeof shownProductSchema>;

export function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function toProductSummary(product: {
  handle: string;
  title: string;
  images: { url: string; alt: string | null }[];
  variants: {
    price: Money;
    compareAtPrice: Money | null;
    available: boolean;
    imageUrl: string | null;
  }[];
}): ProductSummary {
  const variant =
    product.variants.find((candidate) => candidate.available) ??
    product.variants[0];
  const first = product.images[0];
  const image = variant.imageUrl
    ? { url: variant.imageUrl, alt: first?.alt ?? null }
    : (first ?? null);
  return {
    handle: product.handle,
    title: product.title,
    image,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
  };
}
