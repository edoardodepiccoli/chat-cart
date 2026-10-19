import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";
import { z } from "zod";

import type { ChatEvent, ChatMessage } from "../../shared/chat";
import { getShopperContext } from "./context";

export type Conversation = { id: string; messages: ChatMessage[] };

const PROXY_BASE = "/apps/chat-cart";
const PROXY_HEADERS = { "ngrok-skip-browser-warning": "true" };
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

type ErrorKind = Extract<ChatEvent, { type: "client_error" }>["data"]["kind"];
type ErrorState = { open: boolean; busy: boolean };

const NO_STATE: ErrorState = { open: false, busy: false };

function pageLabel() {
  const page = getShopperContext().page;
  if (page.type === "other") return "other";
  return `${page.type}:${page.type === "search" ? page.terms : page.handle}`;
}

export function reportError(
  conversationId: string | null,
  kind: ErrorKind,
  error: unknown,
  state: ErrorState,
) {
  const message = error instanceof Error ? error.message : String(error);
  sendEvent(conversationId, {
    type: "client_error",
    data: {
      kind,
      message: message.slice(0, 500),
      open: state.open,
      busy: state.busy,
      page: pageLabel().slice(0, 200),
    },
  });
}

export function sendEvent(conversationId: string | null, event: ChatEvent) {
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
  const [resetFailed, setResetFailed] = useState(false);

  useEffect(() => {
    loadConversation()
      .then(setConversation)
      .catch((error) => {
        reportError(null, "conversation_load_failed", error, NO_STATE);
        setLoadFailed(true);
      });
  }, []);

  function trackEvent(event: ChatEvent) {
    if (conversation) sendEvent(conversation.id, event);
  }

  async function reset() {
    setResetFailed(false);
    try {
      setConversation(await startConversation());
    } catch (error) {
      reportError(conversation?.id ?? null, "reset_failed", error, NO_STATE);
      setResetFailed(true);
    }
  }

  return { conversation, loadFailed, resetFailed, reset, trackEvent };
}
