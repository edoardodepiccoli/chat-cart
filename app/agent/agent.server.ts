import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  isStepCount,
  Output,
  streamText,
  tool,
  type ModelMessage,
} from "ai";
import { createGateway } from "@ai-sdk/gateway";
import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";
import { existsSync } from "node:fs";
import { z } from "zod";

import type { ChatMessage } from "../../chat-widget/src/components/types";
import type { ProductCardProps } from "../../chat-widget/src/components/ProductCard";
import { getProduct, listProducts } from "../storefront/storefront.server";

if (existsSync(".env")) process.loadEnvFile();

const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });

const DEEPSEEK = gateway("deepseek/deepseek-v4.1-flash");

const SYSTEM = `You are the shopping assistant of an online store, chatting with a shopper in a small widget on the storefront.
Be very concise: reply in the shopper's language, in at most 2 short sentences of plain text, with no markdown and no filler.
All you know is the store's product catalog, through your tools: which products exist, their descriptions, tags, prices, sale prices, sizes, colors and other options, and what's in stock.
Never invent products, prices, stock or details: check with your tools before answering. Use listProducts to browse, filter by price, type or availability, and find similar products by their tags; use getProduct for a specific product, size or color.
You can't see shipping, delivery times, returns, orders, payments, discount codes, reviews or store policies: if asked, say you can't check that here.
When the shopper wants to see, find or buy a product, show it with showProductCard, up to 3 cards when several fit. Don't repeat in text what the cards already show.
You can't add to the cart yourself: the shopper does it from the card.
If the request is too vague to pick products, ask one short question about what they need.
The shopper just wants to shop: talk in everyday shopping words, and never mention cards, tools, tags, handles, variants, the catalog or anything else about how this chat works.
If the message has nothing to do with shopping in this store, politely steer back to it.`;

const SUGGEST = `Write three short messages I could send you next.
You only know what this store sells: which products exist, what they're like, their prices, sizes, colors and other options, and which are in stock. You can also show me a product so I can pick options and buy it.
Every message must be something you can fully answer with that alone. Never suggest anything about shipping, delivery times, returns, orders, payments, discount codes, reviews, bestsellers, new arrivals or store policies.
Keep them generic, so they make sense whatever you just replied: browsing what the store sells, narrowing by price, type or availability, asking about sizes or colors, seeing something similar, seeing a product. Name a product only if it already came up in this conversation.
I'm just a shopper: write in everyday shopping words, and never mention cards, tools, tags, handles, variants, the catalog or anything else about how this chat works.
Make the three different from each other and from what I already asked.
Write them in my language, as I would type them, each under 8 words.`;

function tools(storefront: StorefrontApiContext) {
  return {
    listProducts: tool({
      description:
        "List every product in the store: handle, title, short description, tags, price range, availability, options.",
      inputSchema: z.object({}),
      execute: () => listProducts(storefront),
    }),
    getProduct: tool({
      description:
        "Full details of one product by its handle from listProducts: full description, every variant with price, sale price and stock.",
      inputSchema: z.object({ handle: z.string() }),
      execute: ({ handle }) => getProduct(storefront, handle),
    }),
    showProductCard: tool({
      description:
        "Show the shopper a product card by its handle from listProducts, where they can pick size and color and add it to the cart.",
      inputSchema: z.object({ handle: z.string() }),
      execute: async ({ handle }): Promise<ProductCardProps> => {
        const product = await getProduct(storefront, handle);
        if (!product) throw new Error(`No product with handle ${handle}`);
        return {
          handle: product.handle,
          title: product.title,
          imageUrl: product.imageUrl,
          imageAlt: product.imageAlt,
          options: product.options,
          variants: product.variants,
        };
      },
    }),
  };
}

async function suggest(messages: ModelMessage[]): Promise<string[]> {
  const { output } = await generateText({
    model: DEEPSEEK,
    reasoning: "none",
    output: Output.object({
      schema: z.object({ suggestions: z.array(z.string()).length(3) }),
    }),
    messages: [
      ...messages,
      { role: "user", content: SUGGEST },
    ],
  });

  return output.suggestions;
}

export async function reply(
  messages: ChatMessage[],
  storefront: StorefrontApiContext,
): Promise<Response> {
  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer }) => {
      const result = streamText({
        model: DEEPSEEK,
        reasoning: "none",
        system: SYSTEM,
        messages: modelMessages,
        tools: tools(storefront),
        stopWhen: isStepCount(10),
      });

      writer.merge(result.toUIMessageStream({ sendFinish: false }));

      const suggestions = await suggest([
        ...modelMessages,
        ...(await result.responseMessages),
      ]);
      writer.write({ type: "data-suggestions", data: suggestions });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
