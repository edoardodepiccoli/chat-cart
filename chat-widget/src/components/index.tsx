import type { Cart } from "../cart";
import CartSummary from "./CartSummary";
import FaqCard from "./FaqCard";
import type {
  ChatPart,
  ProductCardProps,
  ProductVariant,
} from "../../../shared/chat";
import ProductCard from "./ProductCard";
import ProductCards from "./ProductCards";
import TextMessage from "./TextMessage";

export function renderPart(
  part: ChatPart,
  like: (product: ProductCardProps) => void,
  add: (product: ProductCardProps, variant: ProductVariant) => Promise<void>,
  cart: Cart | undefined,
  streaming: boolean,
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
          onAdd={(variant) => add(part.output, variant)}
        />
      ) : null;
    case "tool-showProductCards":
      return part.state === "output-available" ? (
        <ProductCards {...part.output} onLike={like} />
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
