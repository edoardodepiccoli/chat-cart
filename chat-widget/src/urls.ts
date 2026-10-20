declare global {
  interface Window {
    Shopify?: {
      routes?: { root?: string };
      theme?: { schema_name?: string };
    };
  }
}

const root =
  (typeof window !== "undefined" && window.Shopify?.routes?.root) || "/";

// Shopify documents routes.root with a trailing slash; don't rely on it.
export const ROOT = root.endsWith("/") ? root : `${root}/`;

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
