import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  hasToolCall,
  isStepCount,
  Output,
  streamText,
  type ModelMessage,
} from "ai";
import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";
import { existsSync } from "node:fs";
import { z } from "zod";

import {
  COMPONENT_TOOLS,
  type ChatMessage,
  type Market,
} from "../../shared/chat";
import { saveMessage } from "../conversations.server";
import { marketPrompt, SUGGEST, SYSTEM } from "./prompts";
import { tools } from "./tools.server";

if (existsSync(".env")) process.loadEnvFile();

const MODEL = "deepseek/deepseek-v4.1-flash";

async function suggest(messages: ModelMessage[]): Promise<string[]> {
  const { output } = await generateText({
    model: MODEL,
    reasoning: "none",
    output: Output.object({
      schema: z.object({ suggestions: z.array(z.string()).length(3) }),
    }),
    messages: [
      ...messages,
      { role: "user", content: SUGGEST },
    ],
  });

  return output.suggestions;
}

export async function reply(
  conversationId: string,
  messages: ChatMessage[],
  storefront: StorefrontApiContext,
  market: Market,
): Promise<Response> {
  const modelMessages = await convertToModelMessages<ChatMessage>(messages);
  const firstReply = !messages.some((message) => message.role === "assistant");

  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages,
    onEnd: async ({ responseMessage }) => {
      if (responseMessage.parts.length) {
        await saveMessage(conversationId, responseMessage);
      }
    },
    execute: async ({ writer }) => {
      const result = streamText({
        model: MODEL,
        reasoning: "none",
        system:
          market.country && market.currency
            ? `${SYSTEM}\n\n${marketPrompt(market.country, market.currency)}`
            : SYSTEM,
        messages: modelMessages,
        tools: tools(storefront, market),
        stopWhen: [isStepCount(10), hasToolCall(...COMPONENT_TOOLS)],
        prepareStep: ({ stepNumber }) =>
          firstReply && stepNumber === 0
            ? { toolChoice: { type: "tool", toolName: "listProducts" } }
            : undefined,
      });

      writer.merge(result.toUIMessageStream({ sendFinish: false }));

      const suggestions = await suggest([
        ...modelMessages,
        ...(await result.responseMessages),
      ]);
      writer.write({ type: "data-suggestions", data: suggestions });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
