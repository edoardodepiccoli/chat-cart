import ProductCard from "./ProductCard";
import TextMessage from "./TextMessage";
import type { ChatPart } from "./types";

export function renderPart(part: ChatPart) {
  switch (part.type) {
    case "data-textMessage":
      return <TextMessage {...part.data} />;
    case "data-productCard":
      return <ProductCard {...part.data} />;
  }
}
