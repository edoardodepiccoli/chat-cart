import { z } from "zod";

const handle = z.string().min(1).max(200);

export const pageContextSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("product"), handle }),
  z.object({ type: z.literal("collection"), handle }),
  z.object({ type: z.literal("search"), terms: z.string().max(200) }),
  z.object({ type: z.literal("other") }),
]);

export type PageContext = z.infer<typeof pageContextSchema>;

export const shopperContextSchema = z.object({
  country: z.string().max(10),
  language: z.string().max(20),
  page: pageContextSchema,
});

export type ShopperContext = z.infer<typeof shopperContextSchema>;
