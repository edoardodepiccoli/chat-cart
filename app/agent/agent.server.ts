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
Never invent prices, stock, shipping or store policies: look them up with your tools, and if they don't say, tell the shopper you can't check that.
When the shopper wants to see, find or buy a product, show it with showProductCard. Don't repeat in text what the card already shows.
If the message has nothing to do with shopping in this store, politely steer back to it.`;

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
        "Full details of one product: full description, every variant with price and stock.",
      inputSchema: z.object({ handle: z.string() }),
      execute: ({ handle }) => getProduct(storefront, handle),
    }),
    showProductCard: tool({
      description:
        "Show the shopper a product card, where they can pick size and color and add it to the cart.",
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
    system: `Write three short messages the shopper might send next in this conversation with an online store's shopping assistant.
Write them in the shopper's language, from the shopper's point of view, each under 8 words.`,
    messages,
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
