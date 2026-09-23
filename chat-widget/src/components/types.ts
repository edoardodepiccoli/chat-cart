import type { UIMessage } from "ai";

import type { ProductCardProps } from "./ProductCard";

export type ChatMessage = UIMessage<
  never,
  { suggestions: string[] },
  {
    listProducts: { input: Record<string, never>; output: unknown };
    getProduct: { input: { handle: string }; output: unknown };
    showProductCard: { input: { handle: string }; output: ProductCardProps };
  }
>;

export type ChatPart = ChatMessage["parts"][number];
