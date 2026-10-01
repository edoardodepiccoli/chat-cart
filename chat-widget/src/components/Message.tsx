import type { ChatMessage } from "../../../shared/chat";
import { renderPart, type PartContext } from ".";

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
