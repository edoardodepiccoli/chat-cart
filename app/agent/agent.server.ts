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
  type Page,
} from "../../shared/chat";
import type { Product } from "../../shared/product";
import { saveMessage } from "../conversations.server";
import { marketPrompt, pagePrompt, SUGGEST, SYSTEM } from "./prompts";
import { tools } from "./tools.server";

if (existsSync(".env")) process.loadEnvFile();

const MODEL = "deepseek/deepseek-v4.1-flash";
const DEBUG = process.env.NODE_ENV !== "production";
const MAX_HISTORY = 20;
const DATA_TOOLS: string[] = [
  "tool-listProducts",
  "tool-getProduct",
  "tool-listStorePages",
  "tool-getStorePage",
];

function lean(product: Product): Product {
  return { ...product, images: [], variants: [] };
}

function compact(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.slice(-MAX_HISTORY);
  const first = recent.findIndex((message) => message.role === "user");

  return recent.slice(Math.max(first, 0)).flatMap((message) => {
    const parts = message.parts.flatMap((part): ChatPart[] => {
      if (DATA_TOOLS.includes(part.type)) return [];
      if (
        part.type === "tool-showProductCard" &&
        part.state === "output-available"
      )
        return [{ ...part, output: lean(part.output) }];
      if (
        part.type === "tool-showProductCards" &&
        part.state === "output-available"
      )
        return [
          { ...part, output: { products: part.output.products.map(lean) } },
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
  history: ChatMessage[],
  userMessage: ChatMessage,
  storefront: StorefrontApiContext,
  market: Market,
  page: Page,
): Promise<Response> {
  const messages = [...history, userMessage];
  const modelMessages = await convertToModelMessages<ChatMessage>(
    compact(messages),
  );
  const firstReply = !messages.some((message) => message.role === "assistant");

  if (DEBUG)
    console.log(
      `[agent] ${messages.length} saved messages, ${modelMessages.length} sent, ${JSON.stringify(modelMessages).length} bytes`,
    );

  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages,
    onEnd: async ({ responseMessage }) => {
      if (responseMessage.parts.length) {
        await saveMessage(conversationId, userMessage);
        await saveMessage(conversationId, responseMessage);
      }
    },
    execute: async ({ writer }) => {
      const result = streamText({
        model: MODEL,
        reasoning: "none",
        system: [
          SYSTEM,
          market.country && marketPrompt(market.country),
          page.productHandle && pagePrompt(page.productHandle),
        ]
          .filter(Boolean)
          .join("\n\n"),
        messages: modelMessages,
        tools: tools(storefront, market),
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
          firstReply && !page.productHandle && stepNumber === 0
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
