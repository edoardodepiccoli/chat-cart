import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

import { renderPart } from "./components";
import type { ChatMessage } from "./components/types";

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
});

export default function App({ shopDomain }: { shopDomain: string }) {
  const { messages, sendMessage, status, error } = useChat<ChatMessage>({
    transport,
    messages: [GREETING],
  });
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const last = messages.at(-1);
  const busy = status === "submitted" || status === "streaming";
  const suggestions =
    status === "ready" && last?.role === "assistant"
      ? last.parts.find((part) => part.type === "data-suggestions")?.data
      : undefined;

  useEffect(() => {
    const log = logRef.current;
    log?.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    send(draft.trim());
  }

  function send(text: string) {
    if (!text || busy) return;
    setDraft("");
    sendMessage({ text });
  }

  return (
    <div className="cc-panel" data-shop-domain={shopDomain}>
      <div className="cc-log" ref={logRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`cc-message cc-message--${message.role}`}
          >
            {message.parts.map((part, index) => {
              const node = renderPart(part);
              return (
                node && (
                  <div key={index} className={`cc-part cc-part--${part.type}`}>
                    {node}
                  </div>
                )
              );
            })}
          </div>
        ))}

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

        {error && (
          <div className="cc-message cc-message--assistant">
            <div className="cc-part">Something went wrong. Please try again.</div>
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
          disabled={busy}
        />
        <button className="cc-send" type="submit" disabled={busy}>
          Send
        </button>
      </form>
    </div>
  );
}
