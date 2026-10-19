import type { UIMessage } from "ai";
import { z } from "zod";

import type { ChatTools } from "./tools";

export type ChatMessage = UIMessage<
  never,
  { suggestions: string[] },
  ChatTools
>;

export type ChatPart = ChatMessage["parts"][number];

export const chatEventSchema = z.object({
  type: z.literal("client_error"),
  data: z.object({
    kind: z.enum([
      "conversation_load_failed",
      "chat_stream_failed",
      "reset_failed",
    ]),
    message: z.string().max(500),
    open: z.boolean(),
    busy: z.boolean(),
    page: z.string().max(200),
  }),
});

export type ChatEvent = z.infer<typeof chatEventSchema>;
