import { useState, type ReactNode } from "react";

import type { Cart } from "../cart";
import type { ChatMessage, ChatPart } from "../../../shared/chat";
import type { Product, ProductVariant } from "../../../shared/product";
import CartCard from "./CartCard";
import FaqCard from "./FaqCard";
import ProductCard from "./ProductCard";
import ProductCards from "./ProductCards";
import TextMessage from "./TextMessage";

export type PartContext = {
  cart: Cart | undefined;
  streaming: boolean;
  onLike: (product: Product) => void;
  onAdd: (product: Product, variant: ProductVariant) => Promise<void>;
};

function renderPart(
  part: ChatPart,
  { cart, onLike, onAdd }: PartContext,
  animate: boolean,
) {
  switch (part.type) {
    case "text":
      return part.text.trim() ? (
        <TextMessage text={part.text.trim()} animate={animate} />
      ) : null;
    case "tool-showProductCard":
      return part.state === "output-available" ? (
        <ProductCard
          {...part.output}
          cartVariantIds={cart?.items.map((item) => item.variant_id) ?? []}
          onAdd={(variant) => onAdd(part.output, variant)}
        />
      ) : null;
    case "tool-showProductCards":
      return part.state === "output-available" ? (
        <ProductCards {...part.output} onLike={onLike} />
      ) : null;
    case "tool-showFaqCard":
      return part.state === "output-available" ? (
        <FaqCard {...part.output} />
      ) : null;
    case "tool-showCart":
      return part.state === "output-available" ? (
        <CartCard cart={cart} />
      ) : null;
    default:
      return null;
  }
}

export default function Message({
  message,
  context,
}: {
  message: ChatMessage;
  context: PartContext;
}) {
  const [live] = useState(context.streaming);
  const parts: ReactNode[] = [];
  message.parts.forEach((part, key) => {
    const node = renderPart(part, context, live);
    if (!node) return;
    parts.push(
      <div key={key} className={`cc-part cc-part--${part.type}`}>
        {node}
      </div>,
    );
  });

  if (!parts.length) return null;

  return (
    <div className={`cc-message cc-message--${message.role}`}>{parts}</div>
  );
}
