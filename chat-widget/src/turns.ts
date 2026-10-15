import { t } from "./i18n";
import type { ChatMessage } from "../../shared/chat";
import { TOOLS, type ToolName } from "../../shared/tools";

export function typingLabel(message: ChatMessage | undefined) {
  const part =
    message?.role === "assistant"
      ? message.parts
          .filter(
            (part) =>
              part.type.startsWith("tool-") &&
              "state" in part &&
              (part.state === "input-streaming" ||
                part.state === "input-available"),
          )
          .at(-1)
      : undefined;
  const tool = part?.type.slice("tool-".length);
  return t(TOOLS[tool as ToolName]?.label ?? "typing");
}

export function greeting(): ChatMessage {
  return {
    id: "greeting",
    role: "assistant",
    parts: [
      { type: "text", text: t("greeting") },
      {
        type: "data-suggestions",
        data: [t("suggestion1"), t("suggestion2"), t("suggestion3")],
      },
    ],
  };
}

export function groupTurns(messages: ChatMessage[]) {
  return messages.reduce<ChatMessage[][]>((turns, message) => {
    const current = turns.at(-1);
    if (message.role === "user" || !current) turns.push([message]);
    else current.push(message);
    return turns;
  }, []);
}
