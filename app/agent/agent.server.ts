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
  type ChatPart,
  type Market,
  type PageContext,
} from "../../shared/chat";
import type { Product } from "../../shared/product";
import { saveMessage } from "../conversations.server";
import {
  marketPrompt,
  pagePrompt,
  SUGGESTIONS_PROMPT,
  SYSTEM_PROMPT,
  teaserPrompt,
  type TeaserProduct,
} from "./prompts";
import { createTools } from "./tools.server";

if (existsSync(".env")) process.loadEnvFile();

const MODEL = "deepseek/deepseek-v4.1-flash";
const DEBUG = process.env.NODE_ENV !== "production";
const MAX_HISTORY = 20;
const DATA_TOOL_PARTS: string[] = [
  "tool-listProducts",
  "tool-listCollections",
  "tool-getProduct",
  "tool-listStorePages",
  "tool-getStorePage",
];

function stripProductMedia(product: Product): Product {
  return { ...product, images: [], variants: [] };
}

function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.slice(-MAX_HISTORY);
  const first = recent.findIndex((message) => message.role === "user");

  return recent.slice(Math.max(first, 0)).flatMap((message) => {
    const parts = message.parts.flatMap((part): ChatPart[] => {
      if (DATA_TOOL_PARTS.includes(part.type)) return [];
      if (
        part.type === "tool-showProductCard" &&
        part.state === "output-available"
      )
        return [{ ...part, output: stripProductMedia(part.output) }];
      if (
        part.type === "tool-showProductCards" &&
        part.state === "output-available"
      )
        return [
          {
            ...part,
            output: { products: part.output.products.map(stripProductMedia) },
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

const SUGGESTIONS_SCHEMA = z.object({
  suggestions: z.array(z.string().min(1).max(30)).length(3),
});

export async function generateSuggestions(
  messages: ModelMessage[],
): Promise<string[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const { output } = await generateText({
        model: MODEL,
        reasoning: "none",
        output: Output.object({ schema: SUGGESTIONS_SCHEMA }),
        messages: [...messages, { role: "user", content: SUGGESTIONS_PROMPT }],
      });

      return output.suggestions;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
}

export async function generateTeaser(
  product: TeaserProduct,
  language: string,
): Promise<string> {
  const { text } = await generateText({
    model: MODEL,
    reasoning: "none",
    prompt: teaserPrompt(product, language),
  });

  return text.trim();
}

export async function runAgent(
  messages: ChatMessage[],
  storefront: StorefrontApiContext,
  market: Market,
  pageContext: PageContext,
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
    ]
      .filter(Boolean)
      .join("\n\n"),
    messages: modelMessages,
    tools: createTools(storefront, market),
    stopWhen: [isStepCount(10), hasToolCall(...COMPONENT_TOOLS)],
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
