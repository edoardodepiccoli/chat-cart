import { useEffect, useRef, useState } from "react";

import { renderPart } from "./components";
import type { ChatMessage } from "./components/types";
import { fakeChat, fakeGreeting } from "./fakeServer";

export default function App({ shopDomain }: { shopDomain: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"ready" | "submitted">("submitted");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    fakeGreeting().then((greeting) => {
      setMessages([greeting]);
      setStatus("ready");
    });
  }, []);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || status !== "ready") return;

    const next: ChatMessage[] = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "data-textMessage", data: { text } }],
      },
    ];

    setDraft("");
    setMessages(next);
    setStatus("submitted");

    const reply = await fakeChat(next);

    setMessages([...next, reply]);
    setStatus("ready");
  }

  return (
    <div className="cc-panel" data-shop-domain={shopDomain}>
      <div className="cc-log" ref={logRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`cc-message cc-message--${message.role}`}
          >
            {message.parts.map((part, index) => (
              <div key={index} className={`cc-part cc-part--${part.type}`}>
                {renderPart(part)}
              </div>
            ))}
          </div>
        ))}

        {status === "submitted" && (
          <div className="cc-message cc-message--assistant">
            <div className="cc-part cc-typing">Typing…</div>
          </div>
        )}
      </div>

      <form className="cc-composer" onSubmit={send}>
        <input
          className="cc-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message"
          aria-label="Message"
          disabled={status !== "ready"}
        />
        <button className="cc-send" type="submit" disabled={status !== "ready"}>
          Send
        </button>
      </form>
    </div>
  );
}
