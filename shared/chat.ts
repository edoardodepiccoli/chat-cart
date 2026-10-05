import type { UIMessage } from "ai";

import type { ChatTools } from "../app/agent/tools.server";
import type { ChatEvent } from "./events";

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

export const COMPONENT_ACTIONS = {
  showProductCard: "added_to_cart",
  showProductCards: "product_liked",
  showFaqCard: "link_clicked",
  showCart: "checkout_clicked",
} as const satisfies Partial<Record<keyof ChatTools, ChatEvent["type"]>>;

export const COMPONENT_TOOLS = Object.keys(COMPONENT_ACTIONS) as Array<
  keyof typeof COMPONENT_ACTIONS
>;

export type ChatMessage = UIMessage<never, { suggestions: string[] }, ChatTools>;

export type ChatPart = ChatMessage["parts"][number];
