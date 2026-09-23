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
import {
  getProduct,
  getStorePage,
  listProducts,
  listStorePages,
} from "../storefront/storefront.server";
import { saveMessage } from "./conversations.server";

if (existsSync(".env")) process.loadEnvFile();

const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });

const DEEPSEEK = gateway("deepseek/deepseek-v4.1-flash");

const SYSTEM = `You are the shopping assistant of an online store, chatting with a shopper in a small widget on the storefront.
Be very concise: reply in the shopper's language, in at most 2 short sentences of plain text, with no markdown and no filler.
All you know comes from your tools: the store's product catalog (which products exist, their descriptions, tags, prices, sale prices, sizes, colors and other options, and what's in stock), and the store's policies and info pages.
Never invent products, prices, stock or details: check with your tools before answering. Use listProducts to browse, filter by price, type or availability, and find similar products by their tags; use getProduct for a specific product, size or color.
For questions about the store itself, like shipping, delivery times, returns, payments, contact or policies, use listStorePages to find the right page, then getStorePage to read it, and answer only from what it says. If no page covers it, say you can't check that here.
You can't see orders, discount codes or reviews: if asked, say you can't check that here.
When the shopper wants to see, find or buy a product, show it with showProductCard, up to 3 cards when several fit. Don't repeat in text what the cards already show.
You can't add to the cart yourself: the shopper does it from the card.
If the request is too vague to pick products, ask one short question about what they need.
The shopper just wants to shop: talk in everyday shopping words, and never mention cards, tools, tags, handles, variants, the catalog or anything else about how this chat works.
If the message has nothing to do with this store or shopping in it, politely steer back to it.`;

const SUGGEST = `Write the three replies I'm most likely to send you next, as I would type them.
Start from your last message:
- If you asked me something, all three answer it, each with a different concrete choice. Asked "What are you looking for?" in a store selling shirts and bags: "Show me your shirts", "A bag under $50", "Something in black".
- If you showed me products, one is about them by name (another color, a size, something similar) and the others narrow or change my search.
- If you answered a question about the store, one is a follow-up that the same page answers and the others take me back to shopping.
- Otherwise, they take my search one step further: a kind of product, a price limit, a color or a size.
Every reply must lead to a yes: only ask for products, kinds of products, colors, sizes and price ranges that your tool results show the store has, and only ask about shipping, returns, payments or other store topics that a store page in your tool results covers.
Stick to what you can check: products, prices, sizes, colors, stock and what the store's pages say. Nothing about orders, discounts, reviews or bestsellers.
Each one makes sense on its own: never "it" or "this one" instead of a product name.
All three different from each other and from what I already asked. In my language, in everyday shopping words, under 8 words each, never about how this chat works.`;

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
    listStorePages: tool({
      description:
        "List the store's policies and info pages (shipping, returns, privacy, terms, FAQ, contact...): handle, title, url, short summary.",
      inputSchema: z.object({}),
      execute: () => listStorePages(storefront),
    }),
    getStorePage: tool({
      description:
        "Full text of one store policy or info page by its handle from listStorePages.",
      inputSchema: z.object({ handle: z.string() }),
      execute: ({ handle }) => getStorePage(storefront, handle),
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
  conversationId: string,
  messages: ChatMessage[],
  storefront: StorefrontApiContext,
): Promise<Response> {
  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages,
    onEnd: async ({ responseMessage }) => {
      if (responseMessage.parts.length) {
        await saveMessage(conversationId, responseMessage);
      }
    },
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
