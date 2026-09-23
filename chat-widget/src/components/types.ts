import type { UIMessage } from "ai";

import type { FaqCardProps } from "./FaqCard";
import type { ProductCardProps } from "./ProductCard";
import type { ProductCardsProps } from "./ProductCards";

export type ChatMessage = UIMessage<
  never,
  { suggestions: string[]; like: { handle: string; title: string } },
  {
    listProducts: { input: Record<string, never>; output: unknown };
    getProduct: { input: { handle: string }; output: unknown };
    listStorePages: { input: Record<string, never>; output: unknown };
    getStorePage: { input: { handle: string }; output: unknown };
    showProductCard: { input: { handle: string }; output: ProductCardProps };
    showProductCards: {
      input: { handles: string[] };
      output: ProductCardsProps;
    };
    showFaqCard: {
      input: { handle: string; answer: string };
      output: FaqCardProps;
    };
  }
>;

export type ChatPart = ChatMessage["parts"][number];
