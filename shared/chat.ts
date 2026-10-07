import type { UIMessage } from "ai";
import { z } from "zod";

import type { ChatTools } from "../app/agent/tools.server";

export type Market = { country: string; language: string };

export type Page = { productHandle: string };

export type ChatMessage = UIMessage<never, { suggestions: string[] }, ChatTools>;

export type ChatPart = ChatMessage["parts"][number];

export const chatEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("widget_opened") }),
  z.object({
    type: z.literal("suggestion_clicked"),
    data: z.object({ text: z.string().max(500) }),
  }),
  z.object({
    type: z.literal("product_liked"),
    data: z.object({ handle: z.string().max(200) }),
  }),
  z.object({
    type: z.literal("added_to_cart"),
    data: z.object({
      handle: z.string().max(200),
      variantId: z.string().max(200),
      price: z.object({
        amount: z.string().max(50),
        currencyCode: z.string().max(10),
      }),
    }),
  }),
  z.object({ type: z.literal("checkout_clicked") }),
  z.object({
    type: z.literal("link_clicked"),
    data: z.object({ url: z.string().max(2000) }),
  }),
]);

export type ChatEvent = z.infer<typeof chatEventSchema>;

export const COMPONENT_ACTIONS: Record<string, ChatEvent["type"]> = {
  showProductCard: "added_to_cart",
  showProductCards: "product_liked",
  showFaqCard: "link_clicked",
  showCart: "checkout_clicked",
};

export const COMPONENT_TOOLS = Object.keys(COMPONENT_ACTIONS);
