import type { UIMessage } from "ai";

import type { FaqCardProps } from "./FaqCard";
import type { ProductCardProps } from "./ProductCard";

export type ChatMessage = UIMessage<
  never,
  { suggestions: string[] },
  {
    listProducts: { input: Record<string, never>; output: unknown };
    getProduct: { input: { handle: string }; output: unknown };
    listStorePages: { input: Record<string, never>; output: unknown };
    getStorePage: { input: { handle: string }; output: unknown };
    showProductCard: { input: { handle: string }; output: ProductCardProps };
    showFaqCard: {
      input: { handle: string; answer: string };
      output: FaqCardProps;
    };
  }
>;

export type ChatPart = ChatMessage["parts"][number];
