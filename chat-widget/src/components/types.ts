import type { ProductCardProps } from "./ProductCard";
import type { TextMessageProps } from "./TextMessage";

export type ChatPart =
  | { type: "data-textMessage"; data: TextMessageProps }
  | { type: "data-productCard"; data: ProductCardProps };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: ChatPart[];
};
