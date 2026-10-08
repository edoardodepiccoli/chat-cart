import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  onIdle?: (idle: boolean) => void;
};

const COMPONENT_REVEAL = 300;

function renderPart(
  part: ChatPart,
  { cart, streaming, onLike, onAdd }: PartContext,
  { animate, onRevealed }: { animate: boolean; onRevealed: () => void },
) {
  switch (part.type) {
    case "text":
      return part.text.trim() ? (
        <TextMessage
          text={part.text.trim()}
          animate={animate}
          done={!streaming || part.state !== "streaming"}
          onRevealed={onRevealed}
        />
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

function ComponentPart({
  onRevealed,
  children,
}: {
  onRevealed: () => void;
  children: ReactNode;
}) {
  const onRevealedRef = useRef(onRevealed);
  onRevealedRef.current = onRevealed;

  useEffect(() => {
    const timer = setTimeout(() => onRevealedRef.current(), COMPONENT_REVEAL);
    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}

export default function Message({
  message,
  context,
}: {
  message: ChatMessage;
  context: PartContext;
}) {
  const [live] = useState(context.streaming);
  const [revealed, setRevealed] = useState(live ? 0 : Infinity);
  const parts: ReactNode[] = [];
  message.parts.forEach((part, key) => {
    const index = parts.length;
    const onRevealed = () =>
      setRevealed((count) => Math.max(count, index + 1));
    const node = renderPart(part, context, { animate: live, onRevealed });
    if (!node) return;
    parts.push(
      <div key={key} className={`cc-part cc-part--${part.type}`}>
        {part.type === "text" ? (
          node
        ) : (
          <ComponentPart onRevealed={onRevealed}>{node}</ComponentPart>
        )}
      </div>,
    );
  });
  const idle = revealed >= parts.length;
  const { onIdle } = context;

  useLayoutEffect(() => {
    onIdle?.(idle);
  }, [onIdle, idle]);

  if (!parts.length) return null;

  return (
    <div className={`cc-message cc-message--${message.role}`}>
      {parts.slice(0, revealed + 1)}
    </div>
  );
}
