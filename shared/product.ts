export type Money = { amount: string; currencyCode: string };

export type ProductOption = { name: string; values: string[] };

export type ProductSummary = {
  handle: string;
  title: string;
  image: { url: string; alt: string | null } | null;
  price: Money;
  compareAtPrice: Money | null;
};

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
