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

export const CHECKOUT_URL = `${ROOT}checkout`;

export function localUrl(path: string) {
  return `${ROOT}${path.replace(/^\//, "")}`;
}

export function variantNumber(gid: string) {
  return Number(gid.split("/").pop());
}
