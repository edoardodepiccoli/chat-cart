import type { ChatMessage, ChatPart } from "../../shared/chat";
import { DATA_TOOLS } from "../../shared/tools";

export const MAX_HISTORY = 20;

const DATA_TOOL_PARTS: string[] = DATA_TOOLS.map((name) => `tool-${name}`);

export function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.slice(-MAX_HISTORY);
  const first = recent.findIndex((message) => message.role === "user");

  return recent.slice(Math.max(first, 0)).flatMap((message) => {
    const parts = message.parts.flatMap((part): ChatPart[] => {
      if (DATA_TOOL_PARTS.includes(part.type)) return [];
      if (
        part.type === "tool-showProducts" &&
        part.state === "output-available"
      )
        return [
          {
            ...part,
            output: {
              products: part.output.products.map((product) => ({
                ...product,
                image: null,
              })),
            },
          },
        ];
      return [part];
    });

    return parts.some(
      (part) => part.type === "text" || part.type.startsWith("tool-"),
    )
      ? [{ ...message, parts }]
      : [];
  });
}
