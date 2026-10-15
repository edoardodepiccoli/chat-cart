import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";
import { z } from "zod";

import type { ChatEvent, ChatMessage } from "../../shared/chat";
import { getShopperContext } from "./context";

export type Conversation = { id: string; messages: ChatMessage[] };

const PROXY_BASE = "/apps/chat-cart";
const PROXY_HEADERS = { "ngrok-skip-browser-warning": "true" };
const CONVERSATION_KEY = "chat-cart:conversationId";
const TEASERS_TIMEOUT = 12000;
const teasersResponseSchema = z.object({ teasers: z.array(z.string()) });

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
      context: getShopperContext(),
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

export async function fetchTeasers(conversationId: string): Promise<string[]> {
  try {
    const response = await fetch(`${PROXY_BASE}/teasers`, {
      method: "POST",
      headers: { ...PROXY_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, context: getShopperContext() }),
      signal: AbortSignal.timeout(TEASERS_TIMEOUT),
    });
    if (!response.ok) return [];
    const parsed = teasersResponseSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.teasers : [];
  } catch {
    return [];
  }
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
