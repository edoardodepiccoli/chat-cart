import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  hasToolCall,
  isStepCount,
  streamText,
} from "ai";
import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import type { ChatMessage, Market, PageContext } from "../../shared/chat";
import { DISPLAY_TOOLS } from "../../shared/tools";
import { saveMessage } from "../conversations.server";
import { trimHistory } from "./history";
import { MODEL } from "./model";
import { marketPrompt, pagePrompt, teaserTurnPrompt } from "./prompts/context";
import { SYSTEM_PROMPT } from "./prompts/system";
import { generateSuggestions } from "./suggestions.server";
import { createTools } from "./tools.server";

const DEBUG = process.env.NODE_ENV !== "production";

export async function runAgent(
  messages: ChatMessage[],
  storefront: StorefrontApiContext,
  market: Market,
  pageContext: PageContext,
  teaser = false,
) {
  const modelMessages = await convertToModelMessages<ChatMessage>(
    trimHistory(messages),
  );
  const firstReply = !messages.some((message) => message.role === "assistant");

  if (DEBUG)
    console.log(
      `[agent] ${messages.length} saved messages, ${modelMessages.length} sent, ${JSON.stringify(modelMessages).length} bytes`,
    );

  const result = streamText({
    model: MODEL,
    reasoning: "medium",
    system: [
      SYSTEM_PROMPT,
      market.country && marketPrompt(market.country),
      pageContext.productHandle && pagePrompt(pageContext.productHandle),
      teaser &&
        pageContext.productHandle &&
        teaserTurnPrompt(pageContext.productHandle),
    ]
      .filter(Boolean)
      .join("\n\n"),
    messages: modelMessages,
    tools: createTools(storefront, market),
    stopWhen: [isStepCount(10), hasToolCall(...DISPLAY_TOOLS)],
    onStepEnd: ({ stepNumber, toolCalls, toolResults, usage }) => {
      if (!DEBUG) return;
      console.log(
        `[agent] step ${stepNumber}: ${usage.inputTokens} input tokens, ${usage.outputTokens} output tokens`,
      );
      for (const call of toolCalls) {
        const result = toolResults.find(
          (item) => item.toolCallId === call.toolCallId,
        );
        console.log(
          `[agent]   ${call.toolName}(${JSON.stringify(call.input)}) -> ${JSON.stringify(result?.output ?? null).length} bytes`,
        );
      }
    },
    prepareStep: ({ stepNumber }) =>
      firstReply && !pageContext.productHandle && stepNumber === 0
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
  market: Market,
  pageContext: PageContext,
  teaser = false,
): Promise<Response> {
  const messages = [...history, userMessage];

  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages,
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
        market,
        pageContext,
        teaser,
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
