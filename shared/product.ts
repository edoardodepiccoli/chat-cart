export type Money = { amount: string; currencyCode: string };

export type ProductOption = { name: string; values: string[] };

export type SelectedOption = { name: string; value: string };

export type ProductVariant = {
  id: string;
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice: Money | null;
  available: boolean;
  imageUrl: string | null;
};

export type ProductImage = { url: string; alt: string | null };

export type Product = {
  handle: string;
  title: string;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  selectedOptions: SelectedOption[];
};

export function same(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function hasOption(variant: ProductVariant, pick: SelectedOption): boolean {
  return variant.selectedOptions.some(
    (option) => same(option.name, pick.name) && same(option.value, pick.value),
  );
}

function hasEvery(variant: ProductVariant, picks: SelectedOption[]): boolean {
  return picks.every((pick) => hasOption(variant, pick));
}

export function findVariant(
  variants: ProductVariant[],
  picks: SelectedOption[],
): ProductVariant | undefined {
  return variants.find(
    (variant) =>
      variant.selectedOptions.length === picks.length &&
      hasEvery(variant, picks),
  );
}

export function pickOptions(
  variants: ProductVariant[],
  picks: SelectedOption[] = [],
): SelectedOption[] {
  const offered = picks.filter((pick) =>
    variants.some((variant) => hasOption(variant, pick)),
  );
  const matching = variants.filter((variant) => hasEvery(variant, offered));
  const candidates = matching.length ? matching : variants;
  return (
    (candidates.find((variant) => variant.available) ?? candidates[0])
      ?.selectedOptions ?? []
  );
}

export function replacePick(
  picks: SelectedOption[],
  name: string,
  value: string,
): SelectedOption[] {
  return [...picks.filter((pick) => pick.name !== name), { name, value }];
}

export function isOptionValueAvailable(
  variants: ProductVariant[],
  picks: SelectedOption[],
  name: string,
  value: string,
): boolean {
  const candidate = replacePick(picks, name, value);
  return variants.some(
    (variant) => variant.available && hasEvery(variant, candidate),
  );
}
