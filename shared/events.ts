import { z } from "zod";

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
    }),
  }),
  z.object({ type: z.literal("checkout_clicked") }),
  z.object({
    type: z.literal("link_clicked"),
    data: z.object({ url: z.string().max(2000) }),
  }),
]);

export type ChatEvent = z.infer<typeof chatEventSchema>;
