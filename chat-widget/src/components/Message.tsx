import type { Cart } from "../cart";
import type {
  ChatMessage,
  ChatPart,
  ProductCardProps,
  ProductVariant,
} from "../../../shared/chat";
import CartSummary from "./CartSummary";
import FaqCard from "./FaqCard";
import ProductCard from "./ProductCard";
import ProductCards from "./ProductCards";
import TextMessage from "./TextMessage";

export type PartContext = {
  cart: Cart | undefined;
  streaming: boolean;
  onLike: (product: ProductCardProps) => void;
  onAdd: (product: ProductCardProps, variant: ProductVariant) => Promise<void>;
};

function renderPart(
  part: ChatPart,
  { cart, streaming, onLike, onAdd }: PartContext,
) {
  switch (part.type) {
    case "text":
      return part.text.trim() ? (
        <TextMessage text={part.text.trim()} streaming={streaming} />
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
        <CartSummary cart={cart} />
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
  const parts = message.parts.map((part, index) => {
    const node = renderPart(part, context);
    return (
      node && (
        <div key={index} className={`cc-part cc-part--${part.type}`}>
          {node}
        </div>
      )
    );
  });
  if (!parts.some(Boolean)) return null;

  return (
    <div className={`cc-message cc-message--${message.role}`}>{parts}</div>
  );
}
