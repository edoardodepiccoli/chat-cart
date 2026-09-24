import FaqCard from "./FaqCard";
import ProductCard, {
  type ProductCardProps,
  type ProductVariant,
} from "./ProductCard";
import ProductCards from "./ProductCards";
import TextMessage from "./TextMessage";
import type { ChatPart } from "./types";

export function renderPart(
  part: ChatPart,
  like: (product: ProductCardProps) => void,
  add: (product: ProductCardProps, variant: ProductVariant) => Promise<void>,
  cartVariantIds: number[],
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
          cartVariantIds={cartVariantIds}
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
    default:
      return null;
  }
}
