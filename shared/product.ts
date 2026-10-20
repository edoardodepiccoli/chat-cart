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

const selectedOptionSchema = z.object({ name: z.string(), value: z.string() });

export type SelectedOption = z.infer<typeof selectedOptionSchema>;

export const shownVariantSchema = z.object({
  id: z.string(),
  selectedOptions: z.array(selectedOptionSchema),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable(),
  available: z.boolean(),
  imageUrl: z.string().nullable(),
});

export type ShownVariant = z.infer<typeof shownVariantSchema>;

// options and variants are optional: conversations saved before they existed
// still parse.
export const shownProductSchema = productSummarySchema.extend({
  highlights: z.array(highlightSchema),
  options: z
    .array(z.object({ name: z.string(), values: z.array(z.string()) }))
    .optional(),
  variants: z.array(shownVariantSchema).optional(),
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

function hasOption(variant: ShownVariant, pick: SelectedOption): boolean {
  return variant.selectedOptions.some(
    (option) =>
      sameText(option.name, pick.name) && sameText(option.value, pick.value),
  );
}

function matchesAll(variant: ShownVariant, picks: SelectedOption[]): boolean {
  return picks.every((pick) => hasOption(variant, pick));
}

export function findVariant(
  variants: ShownVariant[],
  picks: SelectedOption[],
): ShownVariant | undefined {
  return variants.find(
    (variant) =>
      variant.selectedOptions.length === picks.length &&
      matchesAll(variant, picks),
  );
}

export function defaultOptions(variants: ShownVariant[]): SelectedOption[] {
  return (
    (variants.find((variant) => variant.available) ?? variants[0])
      ?.selectedOptions ?? []
  );
}

export function withPick(
  picks: SelectedOption[],
  name: string,
  value: string,
): SelectedOption[] {
  return [
    ...picks.filter((pick) => !sameText(pick.name, name)),
    { name, value },
  ];
}

export function isOptionValueAvailable(
  variants: ShownVariant[],
  picks: SelectedOption[],
  name: string,
  value: string,
): boolean {
  const candidate = withPick(picks, name, value);
  return variants.some(
    (variant) => variant.available && matchesAll(variant, candidate),
  );
}
