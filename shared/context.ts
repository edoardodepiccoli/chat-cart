import { z } from "zod";

const handle = z.string().min(1).max(200);

export const pageContextSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("product"), handle }),
  z.object({ type: z.literal("collection"), handle }),
  z.object({ type: z.literal("search"), terms: z.string().max(200) }),
  z.object({ type: z.literal("other") }),
]);

export type PageContext = z.infer<typeof pageContextSchema>;

export const visitSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("product"), handle, at: z.number() }),
  z.object({ type: z.literal("collection"), handle, at: z.number() }),
  z.object({
    type: z.literal("search"),
    terms: z.string().max(200),
    at: z.number(),
  }),
]);

export type Visit = z.infer<typeof visitSchema>;

export const shopperContextSchema = z.object({
  country: z.string().max(10),
  language: z.string().max(20),
  page: pageContextSchema,
  history: z.array(visitSchema).max(10),
});

export type ShopperContext = z.infer<typeof shopperContextSchema>;

export function samePage(a: PageContext, b: PageContext): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "search") return a.terms === (b as typeof a).terms;
  if (a.type === "other") return true;
  return a.handle === (b as typeof a).handle;
}
