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
import type { FaqCardProps } from "../../chat-widget/src/components/FaqCard";
import type { ProductCardProps } from "../../chat-widget/src/components/ProductCard";
import type { ProductCardsProps } from "../../chat-widget/src/components/ProductCards";
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
For questions about the store itself, like shipping, delivery times, returns, payments, contact or policies, use listStorePages to find the right page, then getStorePage to read it, then show the answer with showFaqCard, in 1 or 2 short sentences taken only from what the page says. Don't repeat the answer in text: use your sentence to take the shopper back to shopping. If no page covers it, say you can't check that here.
You can't see orders, discount codes or reviews: if asked, say you can't check that here.
Every reply should bring the shopper one step closer to buying.
Whenever your reply is about specific products, including whether the store has something, its price, sizes, colors or stock, show them: one product with showProductCard, two or more with a single showProductCards call holding all of them (up to 6), never several showProductCard calls. Don't repeat in text what the cards already show: use your sentences to help them pick, like the size or color that matches what they asked for.
When the shopper says they like a product, reply with one short upbeat sentence and show it with showProductCard so they can pick size and color and add it to the cart.
You can't add to the cart yourself: the shopper does it from the card.
If a few products could fit, show them rather than asking. Only if the request is too vague to pick any, ask one short question about what they need.
The shopper just wants to shop: talk in everyday shopping words, and never mention cards, tools, tags, handles, variants, the catalog or anything else about how this chat works.
If the message has nothing to do with this store or shopping in it, politely steer back to it.`;

const SUGGEST = `Write the three replies I'm most likely to send you next, as I would type them.
I'm a shopper who just found this store and doesn't know it yet. I go one small step at a time: first what the store has, then a kind of product, then a few products, then one product, then buying it. Each reply takes me at most one step further than where your last message left me, never more.
Answer your last message:
- If you asked me something, all three answer that question, each with a different answer. Asked "Who is the gift for?": "For my dad", "For my girlfriend", "For a friend who camps".
- If you told me what the store has, each picks one kind of product you named.
- If you showed me a few products, they help me choose among them: more about one of them, which one fits a need I mentioned, or cheaper ones. No sizes, colors or prices yet.
- If you showed me one product, I'm deciding whether to buy it. Two are what I'd still want to know about it: something its description answers that you haven't told me yet, or shipping or returns. One is a similar product.
- If you answered a question about the store, they take me back to what I was shopping for, or if I haven't said yet, each to a different kind of product the store has.
Only talk about what's in the conversation: products, kinds of products and needs that you or I already mentioned. Use your tool results only to check that the store has it, never to bring up something new.
Never ask what I already know: once you showed or described a product, I already see its price, sizes, colors and stock. If you said only size M is left, don't ask for size L or when more come in.
Nothing you can't check: no orders, discounts, reviews, best sellers, restocks, or products, sizes, colors or price ranges the store doesn't have.
Each one makes sense on its own: never "it" or "this one" instead of a product name.
All three different from each other and from what I already asked. In my language, in everyday shopping words, under 8 words each, never about how this chat works.`;

async function productCard(
  storefront: StorefrontApiContext,
  handle: string,
): Promise<ProductCardProps> {
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
}

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
      execute: ({ handle }) => productCard(storefront, handle),
    }),
    showProductCards: tool({
      description:
        "Show the shopper two or more products side by side, by their handles from listProducts, each with its photo, price and a button to say they like it.",
      inputSchema: z.object({ handles: z.array(z.string()).min(2).max(6) }),
      execute: async ({ handles }): Promise<ProductCardsProps> => ({
        products: await Promise.all(
          handles.map((handle) => productCard(storefront, handle)),
        ),
      }),
    }),
    showFaqCard: tool({
      description:
        "Show the shopper the answer to their store question, with a link to the store page it comes from, by its handle from listStorePages.",
      inputSchema: z.object({ handle: z.string(), answer: z.string() }),
      execute: async ({ handle, answer }): Promise<FaqCardProps> => {
        const page = await getStorePage(storefront, handle);
        if (!page) throw new Error(`No store page with handle ${handle}`);
        return { title: page.title, answer, url: page.url };
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
  const modelMessages = await convertToModelMessages<ChatMessage>(messages, {
    convertDataPart: (part) =>
      part.type === "data-like"
        ? {
            type: "text",
            text: `I like ${part.data.title} (${part.data.handle}), tell me more about it.`,
          }
        : undefined,
  });

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
