import type { ReactNode } from "react";

import type { ChatMessage, ChatPart } from "../../../shared/chat";
import { DISPLAY_TOOLS, type DisplayTool } from "../../../shared/tools";
import { PARTS } from "../parts";

function renderPart(part: ChatPart) {
  if (part.type === "text") return part.text.trim() || null;
  const name = part.type.slice("tool-".length) as DisplayTool;
  if (
    !part.type.startsWith("tool-") ||
    !DISPLAY_TOOLS.includes(name) ||
    !("state" in part) ||
    part.state !== "output-available"
  )
    return null;
  const Part = PARTS[name] as (props: { output: unknown }) => JSX.Element;
  return <Part output={part.output} />;
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
