import { DefaultChatTransport } from "ai";

import type { ChatMessage } from "../../shared/chat";
import type { ChatEvent } from "../../shared/events";

export type Conversation = { id: string; messages: ChatMessage[] };

const BASE = "/apps/chat-cart";
const HEADERS = { "ngrok-skip-browser-warning": "true" };
const KEY = "chat-cart:conversationId";

export const transport = new DefaultChatTransport<ChatMessage>({
  api: `${BASE}/chat`,
  headers: HEADERS,
  prepareSendMessagesRequest: ({ id, messages }) => ({
    body: { id, message: messages.at(-1) },
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
