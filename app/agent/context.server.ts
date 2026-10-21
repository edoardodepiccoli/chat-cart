import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import type { PageContext } from "../../shared/context";
import { getTitle, type Market } from "./storefront.server";

export type ResolvedPage =
  | { type: "product" | "collection"; handle: string; title: string }
  | { type: "search"; terms: string }
  | { type: "other" };

export type ResolvedContext = { country: string; page: ResolvedPage };

export async function resolvePage(
  storefront: StorefrontApiContext,
  market: Market,
  page: PageContext,
): Promise<ResolvedPage> {
  if (page.type === "search" || page.type === "other") return page;
  try {
    const title = await getTitle(storefront, market, page.type, page.handle);
    return title === null
      ? { type: "other" }
      : { type: page.type, handle: page.handle, title };
  } catch {
    return { type: "other" };
  }
}
