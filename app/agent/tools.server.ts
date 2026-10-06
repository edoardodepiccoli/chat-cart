import { tool, type InferUITools } from "ai";
import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";
import { z } from "zod";

import type { Market } from "../../shared/chat";
import {
  pickOptions,
  type Product,
  type SelectedOption,
} from "../../shared/product";
import {
  getProduct,
  getStorePage,
  listProducts,
  listStorePages,
} from "./storefront.server";

async function productCard(
  storefront: StorefrontApiContext,
  market: Market,
  handle: string,
  picks?: SelectedOption[],
): Promise<Product> {
  const product = await getProduct(storefront, market, handle);
  if (!product) throw new Error(`No product with handle ${handle}`);
  return {
    handle: product.handle,
    title: product.title,
    images: product.images,
    options: product.options,
    variants: product.variants,
    selectedOptions: pickOptions(product.variants, picks),
  };
}

export function tools(storefront: StorefrontApiContext, market: Market) {
  return {
    listProducts: tool({
      description:
        "List every product in the store: handle, title, short description, tags, price range, availability, options.",
      inputSchema: z.object({}),
      execute: () => listProducts(storefront, market),
    }),
    getProduct: tool({
      description:
        "Full details of one product by its handle from listProducts: full description, every variant with price, sale price and stock.",
      inputSchema: z.object({ handle: z.string() }),
      execute: ({ handle }) => getProduct(storefront, market, handle),
    }),
    listStorePages: tool({
      description:
        "List the store's policies and info pages (shipping, returns, privacy, terms, FAQ, contact...): handle, title, url, short summary.",
      inputSchema: z.object({}),
      execute: () => listStorePages(storefront, market),
    }),
    getStorePage: tool({
      description:
        "Full text of one store policy or info page by its handle from listStorePages.",
      inputSchema: z.object({ handle: z.string() }),
      execute: ({ handle }) => getStorePage(storefront, market, handle),
    }),
    showProductCard: tool({
      description:
        "Show the shopper a product card by its handle from listProducts, where they can pick size and color and add it to the cart.",
      inputSchema: z.object({
        handle: z.string(),
        options: z
          .array(z.object({ name: z.string(), value: z.string() }))
          .describe(
            "The size, color or other options the shopper asked for anywhere in the conversation, plus the size they picked for anything they added to their cart (\"I added Jacket (Harvest / L)\" means Size L), with names and values exactly as listProducts shows them. Empty only if there are none.",
          ),
      }),
      execute: ({ handle, options }) =>
        productCard(storefront, market, handle, options),
    }),
    showProductCards: tool({
      description:
        "Show the shopper two or more products side by side, by their handles from listProducts, each with its photo, price and a button to say they like it.",
      inputSchema: z.object({ handles: z.array(z.string()).min(2).max(6) }),
      execute: async ({ handles }) => ({
        products: await Promise.all(
          handles.map((handle) => productCard(storefront, market, handle)),
        ),
      }),
    }),
    showFaqCard: tool({
      description:
        "Show the shopper the answer to their store question, with a link to the store page it comes from, by its handle from listStorePages.",
      inputSchema: z.object({ handle: z.string(), answer: z.string() }),
      execute: async ({ handle, answer }) => {
        const page = await getStorePage(storefront, market, handle);
        if (!page) throw new Error(`No store page with handle ${handle}`);
        return { title: page.title, answer, url: page.url };
      },
    }),
    showCart: tool({
      description:
        "Show the shopper their cart, with what's in it, the total and a button to check out.",
      inputSchema: z.object({}),
      execute: async () => ({}),
    }),
  };
}

export type ChatTools = InferUITools<ReturnType<typeof tools>>;
