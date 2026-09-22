import type { ChatMessage } from "./components/types";

const CHAT_ENDPOINT = "/apps/chat-cart/chat";

export async function chat(messages: ChatMessage[]): Promise<ChatMessage> {
  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);

  return response.json();
}
