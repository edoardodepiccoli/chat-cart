import type { UIMessage } from "ai";

import type { ChatTools } from "./tools";

export type ChatMessage = UIMessage<
  never,
  { suggestions: string[] },
  ChatTools
>;

export type ChatPart = ChatMessage["parts"][number];
