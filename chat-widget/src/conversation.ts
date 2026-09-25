import type { ChatMessage } from "./components/types";
import type { ChatEvent } from "./events";

export type Conversation = { id: string; messages: ChatMessage[] };

const KEY = "chat-cart:conversationId";

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
  const response = await fetch(`/apps/chat-cart/chat${query}`, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });
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
  fetch("/apps/chat-cart/events", {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ conversationId, ...event }),
  }).catch(() => {});
}
