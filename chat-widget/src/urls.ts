declare global {
  interface Window {
    Shopify?: {
      routes?: { root?: string };
      theme?: { schema_name?: string };
    };
    // Dawn's pubsub (assets/pubsub.js), a global on Dawn-family themes.
    publish?: (event: string, data: unknown) => unknown;
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

export function storeUrl(path: string) {
  return `${ROOT}${path.replace(/^\//, "")}`;
}

export function variantIdFromGid(gid: string) {
  return Number(gid.split("/").pop());
}
