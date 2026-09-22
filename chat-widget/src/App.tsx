import { useEffect, useRef, useState } from "react";

import { renderComponent } from "./components";
import type { ChatMessage } from "./components/types";

const GREETING: ChatMessage[] = [
  {
    id: 0,
    role: "assistant",
    component: {
      type: "textMessage",
      props: { text: "Hi! Ask me anything about this store." },
    },
  },
  {
    id: 1,
    role: "assistant",
    component: {
      type: "productCard",
      props: {
        title: "Ayers Chambray",
        price: "$128.00",
        imageUrl:
          "https://ranger-ngiknsha.myshopify.com/cdn/shop/files/chambray_5f232530-4331-492a-872c-81c225d6bafd.jpg?v=1790077051&width=3840",
        productUrl:
          "https://ranger-ngiknsha.myshopify.com/products/ayers-chambray",
        options: [
          { name: "Fabric", values: ["Chambray", "Oxford", "Flannel"] },
          { name: "Fit", values: ["Slim", "Regular", "Relaxed"] },
          { name: "Sleeve", values: ["Short", "Long"] },
        ],
      },
    },
  },
];

export default function App({ shopDomain }: { shopDomain: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(GREETING);
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
      {
        id: prev.length,
        role: "user",
        component: { type: "textMessage", props: { text } },
      },
      {
        id: prev.length + 1,
        role: "assistant",
        component: {
          type: "textMessage",
          props: { text: "Not wired up yet — the agent layer comes next." },
        },
      },
    ]);
  }

  return (
    <div className="cc-panel" data-shop-domain={shopDomain}>
      <div className="cc-log" ref={logRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`cc-message cc-message--${message.role} cc-message--${message.component.type}`}
          >
            {renderComponent(message.component)}
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
