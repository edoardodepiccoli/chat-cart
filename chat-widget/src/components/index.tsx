import ProductCard from "./ProductCard";
import TextMessage from "./TextMessage";
import type { ChatPart } from "./types";

export function renderPart(part: ChatPart) {
  switch (part.type) {
    case "text":
      return part.text.trim() ? <TextMessage text={part.text.trim()} /> : null;
    case "tool-showProductCard":
      return part.state === "output-available" ? (
        <ProductCard {...part.output} />
      ) : null;
    default:
      return null;
  }
}
