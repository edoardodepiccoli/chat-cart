import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  hasToolCall,
  isStepCount,
  streamText,
} from "ai";
import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import type { ChatMessage } from "../../shared/chat";
import type { ShopperContext } from "../../shared/shopperContext";
import { DISPLAY_TOOLS } from "../../shared/tools";
import { saveMessage } from "../conversations.server";
import { resolvePage } from "./context.server";
import { trimHistory } from "./history";
import { MODEL } from "./model";
import { contextPrompt } from "./prompts/context";
import { SYSTEM_PROMPT } from "./prompts/system";
import { generateSuggestions } from "./suggestions.server";
import { createTools } from "./tools.server";

export async function runAgent(
  messages: ChatMessage[],
  storefront: StorefrontApiContext,
  context: ShopperContext,
) {
  const market = { country: context.country, language: context.language };
  const page = await resolvePage(storefront, market, context.page);
  const modelMessages = await convertToModelMessages<ChatMessage>(
    trimHistory(messages),
  );
  const firstReply = !messages.some((message) => message.role === "assistant");

  const result = streamText({
    model: MODEL,
    reasoning: "medium",
    system: [
      SYSTEM_PROMPT,
      contextPrompt({ country: context.country, page }),
    ].join("\n\n"),
    messages: modelMessages,
    tools: createTools(storefront, market),
    stopWhen: [isStepCount(10), hasToolCall(...DISPLAY_TOOLS)],
    prepareStep: ({ stepNumber }) =>
      firstReply && page.type === "other" && stepNumber === 0
        ? { toolChoice: { type: "tool", toolName: "listProducts" } }
        : undefined,
  });

  return { modelMessages, result };
}

export async function streamReply(
  conversationId: string,
  history: ChatMessage[],
  userMessage: ChatMessage,
  storefront: StorefrontApiContext,
  context: ShopperContext,
): Promise<Response> {
  const messages = [...history, userMessage];

  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages,
    onError: (error) => {
      console.error("[agent] stream failed:", error);
      return "An error occurred.";
    },
    onEnd: async ({ responseMessage }) => {
      if (responseMessage.parts.length) {
        await saveMessage(conversationId, userMessage);
        await saveMessage(conversationId, responseMessage);
      }
    },
    execute: async ({ writer }) => {
      const { modelMessages, result } = await runAgent(
        messages,
        storefront,
        context,
      );

      writer.merge(
        result.toUIMessageStream({ sendFinish: false, sendReasoning: false }),
      );

      const suggestions = await generateSuggestions([
        ...modelMessages,
        ...(await result.responseMessages),
      ]);
      writer.write({ type: "data-suggestions", data: suggestions });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
