import type { UIMessage } from "ai";

export type Market = { country: string; language: string; currency: string };

export type Money = { amount: string; currencyCode: string };

export type ProductOption = { name: string; values: string[] };

export type SelectedOption = { name: string; value: string };

export type ProductVariant = {
  id: string;
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice: Money | null;
  available: boolean;
  imageUrl: string | null;
};

export type ProductImage = { url: string; alt: string | null };

export type ProductCardProps = {
  handle: string;
  title: string;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  selectedOptions: SelectedOption[];
};

export type ProductCardsProps = { products: ProductCardProps[] };

export type FaqCardProps = {
  title: string;
  answer: string;
  url: string;
};

export type CartSummaryProps = Record<string, never>;

export const COMPONENT_TOOLS = [
  "showProductCard",
  "showProductCards",
  "showFaqCard",
  "showCart",
] as const;

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
