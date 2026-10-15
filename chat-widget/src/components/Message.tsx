import type { ReactNode } from "react";

import type { ChatMessage, ChatPart } from "../../../shared/chat";
import FaqCard from "./FaqCard";
import ProductCards from "./ProductCards";

function renderPart(part: ChatPart) {
  switch (part.type) {
    case "text":
      return part.text.trim() || null;
    case "tool-showProducts":
      return part.state === "output-available" ? (
        <ProductCards {...part.output} />
      ) : null;
    case "tool-showFaqCard":
      return part.state === "output-available" ? (
        <FaqCard {...part.output} />
      ) : null;
    default:
      return null;
  }
}

export default function Message({ message }: { message: ChatMessage }) {
  const parts: ReactNode[] = [];
  message.parts.forEach((part, key) => {
    const node = renderPart(part);
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
