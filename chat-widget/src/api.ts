import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";

import type { ChatEvent, ChatMessage } from "../../shared/chat";
import { getShopperContext } from "./context";

export type Conversation = { id: string; messages: ChatMessage[] };

const PROXY_BASE = "/apps/chat-cart";
const PROXY_HEADERS = { "ngrok-skip-browser-warning": "true" };
const CONVERSATION_KEY = "chat-cart:conversationId";

function legacyContext() {
  const { country, language, page } = getShopperContext();
  return {
    country,
    language,
    productHandle: page.type === "product" ? page.handle : "",
  };
}

export const transport = new DefaultChatTransport<ChatMessage>({
  api: `${PROXY_BASE}/chat`,
  headers: PROXY_HEADERS,
  prepareSendMessagesRequest: ({ id, messages, body }) => ({
    body: {
      ...body,
      id,
      text: messages[messages.length - 1].parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(""),
      ...legacyContext(),
    },
  }),
});

function readId() {
  try {
    return localStorage.getItem(CONVERSATION_KEY);
  } catch {
    return null;
  }
}

function writeId(id: string) {
  try {
    localStorage.setItem(CONVERSATION_KEY, id);
  } catch {
    return;
  }
}

async function fetchConversation(id: string | null): Promise<Conversation> {
  const query = id ? `?id=${encodeURIComponent(id)}` : "";
  const response = await fetch(`${PROXY_BASE}/chat${query}`, {
    headers: PROXY_HEADERS,
  });
  if (!response.ok) throw new Error(`Conversation ${response.status}`);
  return response.json();
}

export async function loadConversation(): Promise<Conversation> {
  const id = readId();
  const conversation = await fetchConversation(id).catch((error) => {
    if (!id) throw error;
    return fetchConversation(null);
  });
  writeId(conversation.id);
  return conversation;
}

export async function fetchTeaser(): Promise<string> {
  const { country, language, productHandle } = legacyContext();
  const query = new URLSearchParams({
    handle: productHandle,
    country,
    language,
  });
  const response = await fetch(`${PROXY_BASE}/teaser?${query}`, {
    headers: PROXY_HEADERS,
  });
  if (!response.ok) throw new Error(`Teaser ${response.status}`);
  return (await response.json()).text;
}

export function sendEvent(conversationId: string, event: ChatEvent) {
  fetch(`${PROXY_BASE}/events`, {
    method: "POST",
    keepalive: true,
    headers: { ...PROXY_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, ...event }),
  }).catch(() => {});
}

export function useConversation() {
  const [conversation, setConversation] = useState<Conversation>();
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    loadConversation()
      .then(setConversation)
      .catch(() => setLoadFailed(true));
  }, []);

  function trackEvent(event: ChatEvent) {
    if (conversation) sendEvent(conversation.id, event);
  }

  return { conversation, loadFailed, trackEvent };
}
