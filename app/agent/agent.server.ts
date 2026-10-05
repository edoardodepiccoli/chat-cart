import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  hasToolCall,
  isStepCount,
  Output,
  streamText,
  tool,
  type InferUITools,
  type ModelMessage,
} from "ai";
import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";
import { existsSync } from "node:fs";
import { z } from "zod";

import {
  COMPONENT_TOOLS,
  type CartSummaryProps,
  type ChatMessage,
  type FaqCardProps,
  type Market,
  type ProductCardProps,
  type ProductCardsProps,
  type SelectedOption,
} from "../../shared/chat";
import { pickOptions } from "../../shared/variants";
import { saveMessage } from "../conversations.server";
import { marketPrompt, SUGGEST, SYSTEM } from "./prompts";
import {
  getProduct,
  getStorePage,
  listProducts,
  listStorePages,
} from "./storefront.server";

if (existsSync(".env")) process.loadEnvFile();

const MODEL = "deepseek/deepseek-v4.1-flash";

async function productCard(
  storefront: StorefrontApiContext,
  market: Market,
  handle: string,
  picks?: SelectedOption[],
): Promise<ProductCardProps> {
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

function tools(storefront: StorefrontApiContext, market: Market) {
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
      execute: async ({ handles }): Promise<ProductCardsProps> => ({
        products: await Promise.all(
          handles.map((handle) => productCard(storefront, market, handle)),
        ),
      }),
    }),
    showFaqCard: tool({
      description:
        "Show the shopper the answer to their store question, with a link to the store page it comes from, by its handle from listStorePages.",
      inputSchema: z.object({ handle: z.string(), answer: z.string() }),
      execute: async ({ handle, answer }): Promise<FaqCardProps> => {
        const page = await getStorePage(storefront, market, handle);
        if (!page) throw new Error(`No store page with handle ${handle}`);
        return { title: page.title, answer, url: page.url };
      },
    }),
    showCart: tool({
      description:
        "Show the shopper their cart, with what's in it, the total and a button to check out.",
      inputSchema: z.object({}),
      execute: async (): Promise<CartSummaryProps> => ({}),
    }),
  };
}

export type ChatTools = InferUITools<ReturnType<typeof tools>>;

async function suggest(messages: ModelMessage[]): Promise<string[]> {
  const { output } = await generateText({
    model: MODEL,
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
  market: Market,
): Promise<Response> {
  const modelMessages = await convertToModelMessages<ChatMessage>(messages);
  const firstReply = !messages.some((message) => message.role === "assistant");

  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages,
    onEnd: async ({ responseMessage }) => {
      if (responseMessage.parts.length) {
        await saveMessage(conversationId, responseMessage);
      }
    },
    execute: async ({ writer }) => {
      const result = streamText({
        model: MODEL,
        reasoning: "none",
        system:
          market.country && market.currency
            ? `${SYSTEM}\n\n${marketPrompt(market.country, market.currency)}`
            : SYSTEM,
        messages: modelMessages,
        tools: tools(storefront, market),
        stopWhen: [isStepCount(10), hasToolCall(...COMPONENT_TOOLS)],
        prepareStep: ({ stepNumber }) =>
          firstReply && stepNumber === 0
            ? { toolChoice: { type: "tool", toolName: "listProducts" } }
            : undefined,
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
