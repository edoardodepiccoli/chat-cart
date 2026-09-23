import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

import { renderPart } from "./components";
import type { ChatMessage } from "./components/types";
import { openConversation, type Conversation } from "./conversation";

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  parts: [
    { type: "text", text: "Hi! Ask me anything about this store." },
    {
      type: "data-suggestions",
      data: [
        "What do you sell?",
        "Help me find a gift",
        "What are your best sellers?",
      ],
    },
  ],
};

const transport = new DefaultChatTransport<ChatMessage>({
  api: "/apps/chat-cart/chat",
  headers: { "ngrok-skip-browser-warning": "true" },
  prepareSendMessagesRequest: ({ id, messages }) => ({
    body: { id, message: messages.at(-1) },
  }),
});

export default function App({ shopDomain }: { shopDomain: string }) {
  const [conversation, setConversation] = useState<Conversation>();
  const [loadFailed, setLoadFailed] = useState(false);
  const { messages, sendMessage, status, error } = useChat<ChatMessage>({
    id: conversation?.id,
    transport,
    messages: conversation ? [GREETING, ...conversation.messages] : [],
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const last = messages.at(-1);
  const loading = !conversation && !loadFailed;
  const busy = loading || status === "submitted" || status === "streaming";
  const size = messages.length >= 5 ? "l" : messages.length > 1 ? "m" : "s";
  const suggestions =
    status === "ready" && last?.role === "assistant"
      ? last.parts.find((part) => part.type === "data-suggestions")?.data
      : undefined;

  useEffect(() => {
    openConversation()
      .then(setConversation)
      .catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    const log = logRef.current;
    log?.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    send(draft.trim());
  }

  function send(text: string) {
    if (!text || busy || !conversation) return;
    setDraft("");
    sendMessage({ text });
  }

  return (
    <>
      <div
        id="cc-panel"
        className="cc-panel"
        data-open={open}
        data-size={size}
        aria-hidden={!open}
        data-shop-domain={shopDomain}
      >
        <div className="cc-log" ref={logRef}>
          {messages.map((message) => {
            const parts = message.parts.map((part, index) => {
              const node = renderPart(part);
              return (
                node && (
                  <div key={index} className={`cc-part cc-part--${part.type}`}>
                    {node}
                  </div>
                )
              );
            });
            return (
              parts.some(Boolean) && (
                <div
                  key={message.id}
                  className={`cc-message cc-message--${message.role}`}
                >
                  {parts}
                </div>
              )
            );
          })}

          {suggestions && (
            <div className="cc-suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  className="cc-suggestion"
                  style={{ "--cc-i": index } as React.CSSProperties}
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {busy && (
            <div className="cc-message cc-message--assistant">
              <div className="cc-part cc-typing">
                Typing
                <span className="cc-typing__dot">.</span>
                <span className="cc-typing__dot">.</span>
                <span className="cc-typing__dot">.</span>
              </div>
            </div>
          )}

          {(error || loadFailed) && (
            <div className="cc-message cc-message--assistant">
              <div className="cc-part">
                Something went wrong. Please try again.
              </div>
            </div>
          )}
        </div>

        <form className="cc-composer" onSubmit={submit}>
          <input
            className="cc-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a message"
            aria-label="Message"
            disabled={busy || !conversation}
          />
          <button
            className="cc-send"
            type="submit"
            disabled={busy || !conversation}
          >
            Send
          </button>
        </form>
      </div>

      <button
        type="button"
        className="cc-launcher"
        data-open={open}
        data-size={size}
        aria-expanded={open}
        aria-controls="cc-panel"
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          className="cc-launcher__icon cc-launcher__icon--chat"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <svg
          className="cc-launcher__icon cc-launcher__icon--close"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </>
  );
}
