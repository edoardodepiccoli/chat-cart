import type { UIMessage } from "ai";

import type { CartSummaryProps } from "./CartSummary";
import type { FaqCardProps } from "./FaqCard";
import type { ProductCardProps, SelectedOption } from "./ProductCard";
import type { ProductCardsProps } from "./ProductCards";

export type ChatMessage = UIMessage<
  never,
  { suggestions: string[] },
  {
    listProducts: { input: Record<string, never>; output: unknown };
    getProduct: { input: { handle: string }; output: unknown };
    listStorePages: { input: Record<string, never>; output: unknown };
    getStorePage: { input: { handle: string }; output: unknown };
    showProductCard: {
      input: { handle: string; options: SelectedOption[] };
      output: ProductCardProps;
    };
    showProductCards: {
      input: { handles: string[] };
      output: ProductCardsProps;
    };
    showFaqCard: {
      input: { handle: string; answer: string };
      output: FaqCardProps;
    };
    showCart: {
      input: Record<string, never>;
      output: CartSummaryProps;
    };
  }
>;

export type ChatPart = ChatMessage["parts"][number];
