import { useChat } from "@ai-sdk/react";

import { transport } from "../api";
import { greeting } from "../messages";
import { useConversation } from "./useConversation";
import type { ChatMessage } from "../../../shared/chat";

export function useChatSession() {
  const { conversation, loadFailed, resetFailed, reset } = useConversation();
  const { messages, sendMessage, status, error } = useChat<ChatMessage>({
    id: conversation?.id,
    transport,
    messages: conversation ? [greeting(), ...conversation.messages] : [],
  });
  const last = messages.at(-1);
  const loading = !conversation && !loadFailed;
  const busy = loading || status === "submitted" || status === "streaming";
  const suggestions =
    status === "ready" && last?.role === "assistant"
      ? last.parts.find((part) => part.type === "data-suggestions")?.data
      : undefined;

  const canReset = !busy && messages.some((message) => message.role === "user");

  function send(text: string) {
    if (!text || busy || !conversation) return;
    sendMessage({ text });
  }

  return {
    conversation,
    loadFailed,
    messages,
    status,
    error,
    busy,
    suggestions,
    send,
    canReset,
    reset,
    resetFailed,
  };
}
