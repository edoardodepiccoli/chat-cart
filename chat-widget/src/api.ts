import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";

import type { ChatMessage } from "../../shared/chat";
import { getShopperContext } from "./context";

export type Conversation = { id: string; messages: ChatMessage[] };

const PROXY_BASE = "/apps/chat-cart";
// Only dev builds go through an ngrok tunnel, whose warning page this skips.
const PROXY_HEADERS: Record<string, string> =
  import.meta.env.MODE === "development"
    ? { "ngrok-skip-browser-warning": "true" }
    : {};
const CONVERSATION_KEY = "chat-cart:conversationId";

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

export async function startConversation(): Promise<Conversation> {
  const conversation = await fetchConversation(null);
  writeId(conversation.id);
  return conversation;
}

export async function loadConversation(): Promise<Conversation> {
  const id = readId();
  if (!id) return startConversation();
  const conversation = await fetchConversation(id).catch(() =>
    fetchConversation(null),
  );
  writeId(conversation.id);
  return conversation;
}

export function useConversation() {
  const [conversation, setConversation] = useState<Conversation>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);

  useEffect(() => {
    loadConversation()
      .then(setConversation)
      .catch(() => setLoadFailed(true));
  }, []);

  async function reset() {
    setResetFailed(false);
    try {
      setConversation(await startConversation());
    } catch {
      setResetFailed(true);
    }
  }

  return { conversation, loadFailed, resetFailed, reset };
}
