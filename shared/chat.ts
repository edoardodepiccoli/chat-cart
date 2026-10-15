import type { UIMessage } from "ai";
import { z } from "zod";

import type { ChatTools, DisplayTool } from "./tools";

export type ChatMessage = UIMessage<
  never,
  { suggestions: string[] },
  ChatTools
>;

export type ChatPart = ChatMessage["parts"][number];

export const chatEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("widget_opened") }),
  z.object({
    type: z.literal("suggestion_clicked"),
    data: z.object({ text: z.string().max(500) }),
  }),
  z.object({
    type: z.literal("teaser_shown"),
    data: z.object({ count: z.number().int().min(0).max(10) }),
  }),
  z.object({
    type: z.literal("teaser_clicked"),
    data: z.object({ text: z.string().max(500) }),
  }),
  z.object({ type: z.literal("teaser_dismissed") }),
  z.object({
    type: z.literal("product_clicked"),
    data: z.object({ handle: z.string().max(200) }),
  }),
  z.object({
    type: z.literal("link_clicked"),
    data: z.object({ url: z.string().max(2000) }),
  }),
]);

export type ChatEvent = z.infer<typeof chatEventSchema>;

export const COMPONENT_ACTIONS: Record<DisplayTool, ChatEvent["type"]> = {
  showProducts: "product_clicked",
  showFaqCard: "link_clicked",
};
