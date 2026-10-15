import { tool, type Tool } from "ai";
import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import type { Market } from "../../shared/chat";
import { toProductSummary } from "../../shared/product";
import {
  TOOLS,
  type ChatTools,
  type DisplayTool,
  type ToolName,
} from "../../shared/tools";
import {
  getProduct,
  getStorePage,
  listCollections,
  listProducts,
  listStorePages,
} from "./storefront.server";

export function createTools(storefront: StorefrontApiContext, market: Market) {
  return {
    listProducts: tool({
      description:
        "List the store's products with short details: handle, title, the start of the description, tags, product type, vendor, the handles of the collections it belongs to, price range, whether it is on sale (onSale) with its original price (compareAtPrice), availability, and each option's values with the ones in stock (inStock). Pass filters to get only the products that match: on sale, a price range, in stock, a collection, a product type, a vendor, or a specific option value in stock. No filters lists every product.",
      inputSchema: TOOLS.listProducts.input,
      execute: (filter) => listProducts(storefront, market, filter),
    }),
    listCollections: tool({
      description:
        "List the store's collections, the ranges the merchant groups products into: handle, title, the start of the description and how many products it holds. Use a handle as the collection filter of listProducts.",
      inputSchema: TOOLS.listCollections.input,
      execute: () => listCollections(storefront, market),
    }),
    getProduct: tool({
      description:
        "Full details of one product by its handle: full description, tags, options, and every variant with its price, sale price and availability. Use it before answering a detail question or comparing products.",
      inputSchema: TOOLS.getProduct.input,
      execute: ({ handle }) => getProduct(storefront, market, handle),
    }),
    listStorePages: tool({
      description:
        "List the store's policies and info pages, like shipping, returns, payments, FAQ, about and contact: handle, title, url and the start of the text.",
      inputSchema: TOOLS.listStorePages.input,
      execute: () => listStorePages(storefront, market),
    }),
    getStorePage: tool({
      description:
        "Full text of one store policy or info page, by its handle from listStorePages.",
      inputSchema: TOOLS.getStorePage.input,
      execute: ({ handle }) => getStorePage(storefront, market, handle),
    }),
    showProducts: tool({
      description:
        "Show the shopper one to four products, by their handles, best first, each with its photo and price, linking to its page. Ends your reply: write your sentences first.",
      inputSchema: TOOLS.showProducts.input,
      execute: async ({ handles }) => {
        const products = (
          await Promise.all(
            handles.map((handle) => getProduct(storefront, market, handle)),
          )
        )
          .filter((product) => product !== null)
          .map(toProductSummary);
        if (!products.length) throw new Error("No product with those handles");
        return { products };
      },
    }),
    showFaqCard: tool({
      description:
        "Show the shopper the answer to a store question, with a link to the page it comes from, by its handle from listStorePages. The answer is one or two short sentences taken only from that page. Ends your reply, with no text of your own.",
      inputSchema: TOOLS.showFaqCard.input,
      execute: async ({ handle, answer }) => {
        const page = await getStorePage(storefront, market, handle);
        if (!page) throw new Error(`No store page with handle ${handle}`);
        return { title: page.title, answer, url: page.url };
      },
    }),
  } satisfies {
    [K in ToolName]: K extends DisplayTool
      ? Tool<ChatTools[K]["input"], ChatTools[K]["output"]>
      : Tool<ChatTools[K]["input"]>;
  };
}
