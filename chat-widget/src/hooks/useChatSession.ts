import { useChat } from "@ai-sdk/react";

import { useEffect, useRef } from "react";

import { reportError, transport, useConversation } from "../api";
import { greeting } from "../turns";
import type { ChatMessage } from "../../../shared/chat";

export function useChatSession({ open }: { open: boolean }) {
  const { conversation, loadFailed, resetFailed, reset } =
    useConversation();
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
  const reported = useRef<unknown>(undefined);

  useEffect(() => {
    if (!error || reported.current === error) return;
    reported.current = error;
    reportError(conversation?.id ?? null, "chat_stream_failed", error, {
      open,
      busy,
    });
  }, [error, conversation, open, busy]);

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
