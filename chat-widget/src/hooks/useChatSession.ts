import { useChat } from "@ai-sdk/react";

import { transport, useConversation } from "../api";
import { greeting } from "../turns";
import type { ChatEvent, ChatMessage } from "../../../shared/chat";

export function useChatSession() {
  const { conversation, loadFailed, trackEvent } = useConversation();
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

  function send(text: string, options?: { teaser?: boolean }) {
    if (!text || busy || !conversation) return;
    sendMessage(
      { text },
      options?.teaser ? { body: { teaser: true } } : undefined,
    );
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
    trackEvent: trackEvent as (event: ChatEvent) => void,
  };
}
