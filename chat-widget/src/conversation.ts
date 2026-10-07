import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";

import type { ChatEvent, ChatMessage, Market, Page } from "../../shared/chat";

export type Conversation = { id: string; messages: ChatMessage[] };

const BASE = "/apps/chat-cart";
const HEADERS = { "ngrok-skip-browser-warning": "true" };
const KEY = "chat-cart:conversationId";

let market: Market = { country: "", language: "" };

let page: Page = { productHandle: "" };

export function setMarket(value: Market) {
  market = value;
}

export function setPage(value: Page) {
  page = value;
}

export const transport = new DefaultChatTransport<ChatMessage>({
  api: `${BASE}/chat`,
  headers: HEADERS,
  prepareSendMessagesRequest: ({ id, messages }) => ({
    body: {
      id,
      text: messages[messages.length - 1].parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(""),
      ...market,
      ...page,
    },
  }),
});

function readId() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function writeId(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    return;
  }
}

async function fetchConversation(id: string | null): Promise<Conversation> {
  const query = id ? `?id=${encodeURIComponent(id)}` : "";
  const response = await fetch(`${BASE}/chat${query}`, { headers: HEADERS });
  if (!response.ok) throw new Error(`Conversation ${response.status}`);
  return response.json();
}

export async function openConversation(): Promise<Conversation> {
  const id = readId();
  const conversation = await fetchConversation(id).catch((error) => {
    if (!id) throw error;
    return fetchConversation(null);
  });
  writeId(conversation.id);
  return conversation;
}

export function sendEvent(conversationId: string, event: ChatEvent) {
  fetch(`${BASE}/events`, {
    method: "POST",
    keepalive: true,
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, ...event }),
  }).catch(() => {});
}

export function useConversation() {
  const [conversation, setConversation] = useState<Conversation>();
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    openConversation()
      .then(setConversation)
      .catch(() => setLoadFailed(true));
  }, []);

  function record(event: ChatEvent) {
    if (conversation) sendEvent(conversation.id, event);
  }

  return { conversation, loadFailed, record };
}
