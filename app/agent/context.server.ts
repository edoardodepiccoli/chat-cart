import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import type { ShopperContext } from "../../shared/context";
import { log } from "../log/logger.server";
import { contextPrompt } from "./prompts/context";
import { resolveTitles } from "./storefront.server";

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

export type CatalogStats =
  { queries: number; handles: number; ms: number; error?: string } | "skipped";

export type Dropped = {
  type: "product" | "collection";
  handle: string;
  where: "page" | "history";
};

export async function loadCatalog(
  storefront: StorefrontApiContext,
  context: ShopperContext,
): Promise<{ catalog: Catalog; stats: CatalogStats }> {
  const market = { country: context.country, language: context.language };
  const handles = (type: "product" | "collection") => [
    ...new Set(
      [context.page, ...context.history].flatMap((page) =>
        page.type === type ? [page.handle] : [],
      ),
    ),
  ];
  const products = handles("product");
  const collections = handles("collection");
  if (!products.length && !collections.length)
    return { catalog: { products: [], collections: [] }, stats: "skipped" };
  const start = Date.now();
  try {
    const catalog = await resolveTitles(storefront, market, {
      products,
      collections,
    });
    const found = catalog.products.length + catalog.collections.length;
    return {
      catalog,
      stats: { queries: 1, handles: found, ms: Date.now() - start },
    };
  } catch (error) {
    return {
      catalog: { products: [], collections: [] },
      stats: {
        queries: 1,
        handles: 0,
        ms: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      },
    };
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
): ResolvedContext & { dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const resolve = (
    page: ShopperContext["page"],
    where: Dropped["where"],
  ): ResolvedPage => {
    const resolved = resolvePage(page, catalog);
    if (
      resolved.type === "other" &&
      (page.type === "product" || page.type === "collection")
    )
      dropped.push({ type: page.type, handle: page.handle, where });
    return resolved;
  };
  return {
    country: context.country,
    page: resolve(context.page, "page"),
    history: context.history.flatMap((visit) => {
      const page = resolve(visit, "history");
      return page.type === "other" ? [] : [page];
    }),
    dropped,
  };
}

function describeVisit(
  page: ShopperContext["page"],
  resolved: ResolvedPage[],
): string {
  if (page.type === "search") return `search "${page.terms}"`;
  if (page.type === "other") return "other";
  const found = resolved.find(
    (item) =>
      item.type === page.type &&
      "handle" in item &&
      item.handle === page.handle,
  );
  return found && "title" in found
    ? `${page.type} "${found.title}" (${page.handle})`
    : `${page.type} ⚠ unknown (${page.handle}) — dropped`;
}

export function logContext(
  context: ShopperContext,
  resolved: ReturnType<typeof resolveContext>,
  catalog: CatalogStats,
) {
  const market = [context.country, context.language].filter(Boolean).join("/");
  log.info("context", "shopper", { market }, { depth: 1 });
  log.info(
    "context",
    "page",
    {},
    { depth: 2, detail: describeVisit(context.page, [resolved.page]) },
  );
  const known = [resolved.page, ...resolved.history];
  context.history.forEach((visit, i) =>
    log.info(
      "context",
      i ? "" : "visited",
      {},
      { depth: 2, detail: `${i + 1}. ${describeVisit(visit, known)}` },
    ),
  );
  if (catalog === "skipped")
    log.info("context", "catalog", {}, { depth: 2, detail: "skipped" });
  else if (catalog.error)
    log.warn(
      "context",
      "catalog",
      { ms: catalog.ms, error: `"${catalog.error}"` },
      { depth: 2, detail: "⚠ failed, empty catalog" },
    );
  else
    log.info(
      "context",
      "catalog",
      { ms: catalog.ms },
      {
        depth: 2,
        detail: `${catalog.queries} ${catalog.queries === 1 ? "query" : "queries"}, ${catalog.handles} ${catalog.handles === 1 ? "handle" : "handles"}`,
      },
    );
  log.debug(
    "context",
    "prompt",
    {},
    { depth: 2, payload: contextPrompt(resolved) },
  );
}
