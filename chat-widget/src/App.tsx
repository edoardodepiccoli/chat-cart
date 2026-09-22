import { useEffect, useRef, useState } from "react";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const GREETING: Message = {
  id: 0,
  role: "assistant",
  text: "Hi! Ask me anything about this store.",
};

export default function App({ shopDomain }: { shopDomain: string }) {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages]);

  function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMessages((prev) => [
      ...prev,
      { id: prev.length, role: "user", text },
      {
        id: prev.length + 1,
        role: "assistant",
        text: "Not wired up yet — the agent layer comes next.",
      },
    ]);
  }

  return (
    <div className="cc-panel" data-shop-domain={shopDomain}>
      <div className="cc-log" ref={logRef}>
        {messages.map((message) => (
          <div key={message.id} className={`cc-message cc-message--${message.role}`}>
            {message.text}
          </div>
        ))}
      </div>

      <form className="cc-composer" onSubmit={send}>
        <input
          className="cc-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message"
          aria-label="Message"
        />
        <button className="cc-send" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
