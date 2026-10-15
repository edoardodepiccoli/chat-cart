import { generateText, isToolUIPart, getToolName, Output } from "ai";
import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";
import { z } from "zod";

import type { ChatMessage } from "../../shared/chat";
import type { ShopperContext } from "../../shared/context";
import { loadCatalog, resolveContext } from "./context.server";
import { MODEL } from "./model";
import { teasersPrompt, type TeaserInput } from "./prompts/teasers";
import { getCollection, getProduct, searchProducts } from "./storefront.server";

export const teasersSchema = z.object({
  teasers: z
    .array(z.string().trim().min(1).max(50))
    .length(3)
    .refine(
      (teasers) =>
        new Set(teasers.map((teaser) => teaser.toLowerCase())).size ===
        teasers.length,
      "Teasers must be distinct",
    ),
});

export type { TeaserInput };

export const TEASER_TIMEOUT_MS = 10_000;

function partText(part: ChatMessage["parts"][number]): string | null {
  if (part.type === "text") return part.text;
  if (!isToolUIPart(part) || part.state !== "output-available") return null;

  const name = getToolName(part);
  if (name === "showProducts") {
    const { products } = part.output as { products: { title: string }[] };
    return `showed: ${products.map((product) => product.title).join(", ")}`;
  }
  if (name === "showFaqCard")
    return `showed: ${(part.output as { title: string }).title}`;
  return null;
}

export function conversationText(messages: ChatMessage[], limit = 10) {
  return messages
    .slice(-limit)
    .flatMap((message) => {
      const speaker = message.role === "user" ? "Shopper" : "Assistant";
      const lines = message.parts.flatMap((part) => {
        const text = partText(part);
        if (text === null) return [];
        return [
          part.type === "text" ? `${speaker}: ${text}` : `Assistant ${text}`,
        ];
      });
      return lines;
    })
    .join("\n");
}

const listing = (
  products: { handle: string; title: string; description: string }[],
) =>
  products
    .map((product) => `- ${product.title}: ${product.description}`)
    .join("\n");

async function describePage(
  storefront: StorefrontApiContext,
  context: ShopperContext,
) {
  const market = { country: context.country, language: context.language };
  const { page } = context;

  if (page.type === "product") {
    const product = await getProduct(storefront, market, page.handle);
    if (!product) return "";
    const options = product.options
      .map((option) => `${option.name}: ${option.values.join(", ")}`)
      .join("; ");
    return `Title: ${product.title}\nDescription: ${product.description}\nOptions: ${options || "none"}`;
  }
  if (page.type === "collection") {
    const collection = await getCollection(storefront, market, page.handle);
    if (!collection) return "";
    return `Collection: ${collection.title}\nDescription: ${collection.description}\nFirst products:\n${listing(collection.products)}`;
  }
  if (page.type === "search") {
    const products = await searchProducts(storefront, market, page.terms);
    return `Searched for: ${page.terms}\nTop matching products:\n${listing(products)}`;
  }
  return "";
}

export async function buildTeaserInput(
  storefront: StorefrontApiContext,
  context: ShopperContext,
  messages: ChatMessage[],
): Promise<TeaserInput> {
  const [catalog, pageDetails] = await Promise.all([
    loadCatalog(storefront, context),
    describePage(storefront, context),
  ]);

  return {
    context: resolveContext(context, catalog),
    language: context.language,
    pageDetails,
    chat: conversationText(messages),
  };
}

export async function withDeadline(
  task: (signal: AbortSignal) => Promise<string[]>,
  ms: number,
): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const aborted = new Promise<string[]>((resolve) =>
    controller.signal.addEventListener("abort", () => resolve([])),
  );
  try {
    return await Promise.race([task(controller.signal), aborted]);
  } finally {
    clearTimeout(timer);
  }
}

export async function generateTeasers(
  input: TeaserInput,
  signal?: AbortSignal,
): Promise<string[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const { output } = await generateText({
        model: MODEL,
        reasoning: "none",
        output: Output.object({ schema: teasersSchema }),
        prompt: teasersPrompt(input),
        abortSignal: signal,
      });

      return output.teasers;
    } catch (error) {
      if (attempt === 3 || signal?.aborted) throw error;
    }
  }
}
