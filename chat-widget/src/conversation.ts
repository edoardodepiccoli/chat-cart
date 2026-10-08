import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";

import type {
  ChatEvent,
  ChatMessage,
  Market,
  PageContext,
} from "../../shared/chat";

export type Conversation = { id: string; messages: ChatMessage[] };

const BASE = "/apps/chat-cart";
const HEADERS = { "ngrok-skip-browser-warning": "true" };
const KEY = "chat-cart:conversationId";

let market: Market = { country: "", language: "" };

let pageContext: PageContext = { productHandle: "" };

export function setMarket(value: Market) {
  market = value;
}

export function setPageContext(value: PageContext) {
  pageContext = value;
}

export function getPageContext() {
  return pageContext;
}

export const transport =new DefaultChatTransport<ChatMessage>({
  api: `${BASE}/chat`,
  headers: HEADERS,
  prepareSendMessagesRequest: ({ id, messages }) => ({
    body: {
      id,
      text: messages[messages.length - 1].parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(""),
      ...market,
      ...pageContext,
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
  const query = new URLSearchParams({
    handle: pageContext.productHandle,
    country: market.country,
    language: market.language,
  });
  const response = await fetch(`${BASE}/teaser?${query}`, { headers: HEADERS });
  if (!response.ok) throw new Error(`Teaser ${response.status}`);
  return (await response.json()).text;
}

function teaserKey() {
  return `chat-cart:teaser:${pageContext.productHandle}`;
}

export function teaserSeen() {
  try {
    return sessionStorage.getItem(teaserKey()) !== null;
  } catch {
    return false;
  }
}

export function markTeaserSeen() {
  try {
    sessionStorage.setItem(teaserKey(), "1");
  } catch {
    return;
  }
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
    loadConversation()
      .then(setConversation)
      .catch(() => setLoadFailed(true));
  }, []);

  function record(event: ChatEvent) {
    if (conversation) sendEvent(conversation.id, event);
  }

  return { conversation, loadFailed, record };
}
