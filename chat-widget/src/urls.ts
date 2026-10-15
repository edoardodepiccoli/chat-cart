declare global {
  interface Window {
    Shopify?: { routes?: { root?: string } };
  }
}

export const ROOT =
  (typeof window !== "undefined" && window.Shopify?.routes?.root) || "/";

export function productUrl(handle: string) {
  return `${ROOT}products/${handle}`;
}
