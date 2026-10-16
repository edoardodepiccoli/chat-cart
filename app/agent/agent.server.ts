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
import type { ShopperContext } from "../../shared/context";
import { DISPLAY_TOOLS } from "../../shared/tools";
import { saveMessage } from "../conversations.server";
import { log } from "../log/logger.server";
import { loadCatalog, logContext, resolveContext } from "./context.server";
import { trimHistory } from "./history";
import { MODEL } from "./model";
import { contextPrompt, teaserTurnPrompt } from "./prompts/context";
import { SYSTEM_PROMPT } from "./prompts/system";
import { generateSuggestions } from "./suggestions.server";
import { createTools } from "./tools.server";

const DISPLAY: readonly string[] = DISPLAY_TOOLS;

const toolParts = (messages: ChatMessage[]) =>
  messages
    .flatMap((message) => message.parts)
    .filter((part) => part.type.startsWith("tool-")).length;

const yesNo = (value: boolean) => (value ? "yes" : "no");

export async function runAgent(
  messages: ChatMessage[],
  storefront: StorefrontApiContext,
  context: ShopperContext,
  teaser = false,
) {
  const market = { country: context.country, language: context.language };
  const firstReply = !messages.some((message) => message.role === "assistant");
  const trimmed = trimHistory(messages);

  log.info(
    "chat",
    "history",
    {},
    {
      depth: 1,
      detail: `${messages.length - 1} saved messages, ${trimmed.length} sent to model (${toolParts(messages) - toolParts(trimmed)} tool parts dropped)`,
    },
  );
  log.info(
    "chat",
    "flags",
    { teaser: yesNo(teaser), "first-reply": yesNo(firstReply) },
    { depth: 1 },
  );

  const { catalog, stats } = await loadCatalog(storefront, context);
  const resolved = resolveContext(context, catalog);
  logContext(context, resolved, stats);

  if (teaser)
    log.info(
      "chat",
      "teaser-turn",
      {},
      {
        depth: 1,
        detail:
          resolved.page.type === "product"
            ? "getProduct"
            : resolved.page.type === "other"
              ? "none"
              : "listProducts",
      },
    );

  const modelMessages = await convertToModelMessages<ChatMessage>(trimmed);
  const system = [
    SYSTEM_PROMPT,
    contextPrompt(resolved),
    teaser && teaserTurnPrompt(resolved.page),
  ]
    .filter(Boolean)
    .join("\n\n");

  log.debug("agent", "system prompt", {}, { depth: 1, payload: system });
  log.debug(
    "agent",
    "model messages",
    { count: modelMessages.length },
    { depth: 1, payload: modelMessages },
  );

  let step = 0;
  const result = streamText({
    model: MODEL,
    reasoning: "medium",
    system,
    messages: modelMessages,
    tools: createTools(storefront, market),
    stopWhen: [isStepCount(10), hasToolCall(...DISPLAY_TOOLS)],
    onLanguageModelCallEnd: ({ usage, content, finishReason, performance }) => {
      log.info(
        "agent",
        `step ${step++}`,
        { ms: Math.round(performance.responseTimeMs) },
        { depth: 1 },
      );
      const cached = usage.inputTokenDetails.cacheReadTokens;
      log.info(
        "agent",
        "tokens",
        {},
        {
          depth: 2,
          detail: `in=${usage.inputTokens ?? 0} out=${usage.outputTokens ?? 0}${cached ? ` (cached ${cached})` : ""}`,
        },
      );
      const text = content
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join("")
        .trim();
      if (text)
        log.info(
          "agent",
          "text",
          {},
          { depth: 2, detail: text, quote: "model" },
        );
      const display = content.some(
        (part) => part.type === "tool-call" && DISPLAY.includes(part.toolName),
      );
      if (!display)
        log.info("agent", "finish", {}, { depth: 2, detail: finishReason });
    },
    onStepEnd: ({ toolCalls }) => {
      if (toolCalls.some((call) => DISPLAY.includes(call.toolName)))
        log.info(
          "agent",
          "finish",
          {},
          { depth: 2, detail: "display tool (stop)" },
        );
    },
    onError: ({ error }) => {
      log.error("agent", "stream failed", {
        error: `"${error instanceof Error ? error.message : String(error)}"`,
      });
    },
    prepareStep: ({ stepNumber }) =>
      firstReply && resolved.page.type === "other" && stepNumber === 0
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
        context,
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
