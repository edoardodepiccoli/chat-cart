import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import type { ShopperContext } from "../../shared/context";
import { listCollections, listProducts } from "./storefront.server";

type Titled = { handle: string; title: string };

export type Catalog = { products: Titled[]; collections: Titled[] };

export type ResolvedPage =
  | { type: "product" | "collection"; handle: string; title: string }
  | { type: "search"; terms: string }
  | { type: "other" };

export type ResolvedContext = {
  country: string;
  page: ResolvedPage;
  history: Exclude<ResolvedPage, { type: "other" }>[];
};

export function needsCatalog(context: ShopperContext) {
  const pages = [context.page, ...context.history];
  return {
    products: pages.some((page) => page.type === "product"),
    collections: pages.some((page) => page.type === "collection"),
  };
}

export async function loadCatalog(
  storefront: StorefrontApiContext,
  context: ShopperContext,
): Promise<Catalog> {
  const market = { country: context.country, language: context.language };
  const needs = needsCatalog(context);
  try {
    const products = needs.products
      ? await listProducts(storefront, market)
      : [];
    const collections = needs.collections
      ? await listCollections(storefront, market, products)
      : [];
    return { products, collections };
  } catch {
    return { products: [], collections: [] };
  }
}

function resolvePage(
  page: ShopperContext["page"],
  catalog: Catalog,
): ResolvedPage {
  if (page.type === "search") return { type: "search", terms: page.terms };
  if (page.type === "other") return page;
  const list = page.type === "product" ? catalog.products : catalog.collections;
  const found = list.find((item) => item.handle === page.handle);
  return found
    ? { type: page.type, handle: found.handle, title: found.title }
    : { type: "other" };
}

export function resolveContext(
  context: ShopperContext,
  catalog: Catalog,
): ResolvedContext {
  return {
    country: context.country,
    page: resolvePage(context.page, catalog),
    history: context.history.flatMap((visit) => {
      const page = resolvePage(visit, catalog);
      return page.type === "other" ? [] : [page];
    }),
  };
}
