import { tool, type InferUITools } from "ai";
import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";
import { z } from "zod";

import type { Market } from "../../shared/chat";
import {
  isOptionValueAvailable,
  defaultOptions,
  type Product,
  type SelectedOption,
} from "../../shared/product";
import {
  getProduct,
  getStorePage,
  listCollections,
  listProducts,
  listStorePages,
} from "./storefront.server";

const optionsSchema = z
  .array(z.object({ name: z.string(), value: z.string() }))
  .describe(
    'The options the shopper asked for anywhere in the conversation, like a size, color or shade, plus the options of anything they added to their cart ("I added Serum (50 ml)" means the 50 ml option), with names and values exactly as listProducts shows them. Leave out if there are none.',
  )
  .optional();

async function buildProductCard(
  storefront: StorefrontApiContext,
  market: Market,
  handle: string,
  picks?: SelectedOption[],
): Promise<Product> {
  const product = await getProduct(storefront, market, handle);
  if (!product) throw new Error(`No product with handle ${handle}`);
  const selectedOptions = defaultOptions(product.variants, picks);
  const unavailable = (picks ?? []).filter(
    (pick) =>
      !isOptionValueAvailable(
        product.variants,
        selectedOptions,
        pick.name,
        pick.value,
      ),
  );
  return {
    handle: product.handle,
    title: product.title,
    images: product.images,
    options: product.options,
    variants: product.variants,
    selectedOptions,
    ...(unavailable.length && { unavailable }),
  };
}

export function createTools(storefront: StorefrontApiContext, market: Market) {
  return {
    listProducts: tool({
      description:
        "List the store's products with short details: handle, title, the start of the description, tags, product type, vendor, the handles of the collections it belongs to, price range, whether it is on sale (onSale) with its original price (compareAtPrice), availability, and each option's values with the ones in stock (inStock). Pass filters to get only the products that match: on sale, a price range, in stock, a collection, a product type, a vendor, or a specific option value in stock. No filters lists every product.",
      inputSchema: z.object({
        onSale: z.boolean().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        availableOnly: z.boolean().optional(),
        collection: z
          .string()
          .optional()
          .describe("A collection handle from listCollections."),
        productType: z.string().optional(),
        vendor: z.string().optional(),
        option: z
          .object({ name: z.string(), value: z.string() })
          .optional()
          .describe(
            "Only products with this option value in stock, like Size L, with the name and value as listProducts shows them.",
          ),
      }),
      execute: (filter) => listProducts(storefront, market, filter),
    }),
    listCollections: tool({
      description:
        "List the store's collections, the ranges the merchant groups products into: handle, title, the start of the description and how many products it holds. Use a handle as the collection filter of listProducts.",
      inputSchema: z.object({}),
      execute: () => listCollections(storefront, market),
    }),
    getProduct: tool({
      description:
        "Full details of one product by its handle: full description, tags, options, and every variant with its price, sale price and availability. Use it before answering a detail question or comparing products.",
      inputSchema: z.object({ handle: z.string() }),
      execute: ({ handle }) => getProduct(storefront, market, handle),
    }),
    listStorePages: tool({
      description:
        "List the store's policies and info pages, like shipping, returns, payments, FAQ, about and contact: handle, title, url and the start of the text.",
      inputSchema: z.object({}),
      execute: () => listStorePages(storefront, market),
    }),
    getStorePage: tool({
      description:
        "Full text of one store policy or info page, by its handle from listStorePages.",
      inputSchema: z.object({ handle: z.string() }),
      execute: ({ handle }) => getStorePage(storefront, market, handle),
    }),
    showProductCard: tool({
      description:
        "Show the shopper one product, by its handle, where they can choose its options and add it to the cart. Ends your reply: write your sentences first. The result lists any requested option the product doesn't have in stock, under unavailable.",
      inputSchema: z.object({
        handle: z.string(),
        options: optionsSchema,
      }),
      execute: ({ handle, options }) =>
        buildProductCard(storefront, market, handle, options),
    }),
    showProductCards: tool({
      description:
        "Show the shopper two to four products side by side, by their handles, best first, each with its photo, price and a button to say they like it. Ends your reply: write your sentences first. The result lists any requested option a product doesn't have in stock, under unavailable.",
      inputSchema: z.object({
        handles: z.array(z.string()).min(2).max(6),
        options: optionsSchema,
      }),
      execute: async ({ handles, options }) => ({
        products: await Promise.all(
          handles.map((handle) =>
            buildProductCard(storefront, market, handle, options),
          ),
        ),
      }),
    }),
    showFaqCard: tool({
      description:
        "Show the shopper the answer to a store question, with a link to the page it comes from, by its handle from listStorePages. The answer is one or two short sentences taken only from that page. Ends your reply, with no text of your own.",
      inputSchema: z.object({ handle: z.string(), answer: z.string() }),
      execute: async ({ handle, answer }) => {
        const page = await getStorePage(storefront, market, handle);
        if (!page) throw new Error(`No store page with handle ${handle}`);
        return { title: page.title, answer, url: page.url };
      },
    }),
    showCart: tool({
      description:
        "Show the shopper their cart, with what's in it, the total and a button to check out. Ends your reply: write your sentence first.",
      inputSchema: z.object({}),
      execute: async () => ({}),
    }),
  };
}

export type ChatTools = InferUITools<ReturnType<typeof createTools>>;
