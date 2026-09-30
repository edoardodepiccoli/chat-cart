import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Fragment, useEffect, useRef, useState } from "react";

import { addToCart, getCart, type Cart } from "./cart";
import { renderPart } from "./components";
import type {
  ProductCardProps,
  ProductVariant,
} from "./components/ProductCard";
import type { ChatMessage } from "./components/types";
import {
  openConversation,
  sendEvent,
  type Conversation,
} from "./conversation";
import type { ChatEvent } from "./events";

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "Hi! I'm your personal AI shopping assistant. I can find the right product for you, check sizes and stock, and answer questions about shipping and returns. What are you looking for today?",
    },
    {
      type: "data-suggestions",
      data: [
        "What do you sell?",
        "Help me find a gift",
        "How long does shipping take?",
      ],
    },
  ],
};

type Suggestions = { id: string; items: string[]; top?: number };

const transport = new DefaultChatTransport<ChatMessage>({
  api: "/apps/chat-cart/chat",
  headers: { "ngrok-skip-browser-warning": "true" },
  prepareSendMessagesRequest: ({ id, messages }) => ({
    body: { id, message: messages.at(-1) },
  }),
});

export default function App() {
  const [conversation, setConversation] = useState<Conversation>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [cart, setCart] = useState<Cart>();
  const { messages, sendMessage, status, error } = useChat<ChatMessage>({
    id: conversation?.id,
    transport,
    messages: conversation ? [GREETING, ...conversation.messages] : [],
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [leaving, setLeaving] = useState<Suggestions>();
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pinned = useRef(true);
  const lastTop = useRef(0);
  const last = messages.at(-1);
  const loading = !conversation && !loadFailed;
  const busy = loading || status === "submitted" || status === "streaming";
  const size = messages.length >= 5 ? "l" : messages.length > 1 ? "m" : "s";
  const items =
    status === "ready" && last?.role === "assistant"
      ? last.parts.find((part) => part.type === "data-suggestions")?.data
      : undefined;
  const live: Suggestions | undefined =
    last && items ? { id: last.id, items } : undefined;
  const suggestions = live ?? leaving;

  useEffect(() => {
    openConversation()
      .then(setConversation)
      .catch(() => setLoadFailed(true));
    getCart()
      .then(setCart)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open && conversation)
      sendEvent(conversation.id, { type: "widget_opened" });
  }, [open, conversation]);

  useEffect(() => {
    const log = logRef.current;
    const content = log?.firstElementChild;
    if (!log || !content) return;
    const observer = new ResizeObserver(() => {
      if (pinned.current)
        log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.getElementById("chat-cart-root");
    if (!viewport || !root || !CSS.supports("-webkit-touch-callout", "none"))
      return;
    const update = () => {
      if (document.activeElement !== inputRef.current) {
        root.style.removeProperty("--cc-keyboard");
        root.style.removeProperty("--cc-viewport-height");
        return;
      }
      const keyboard = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      root.style.setProperty("--cc-keyboard", `${keyboard}px`);
      root.style.setProperty("--cc-viewport-height", `${viewport.height}px`);
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  function track() {
    const log = logRef.current;
    if (!log) return;
    if (log.scrollHeight - log.scrollTop - log.clientHeight < 24)
      pinned.current = true;
    else if (log.scrollTop < lastTop.current) pinned.current = false;
    lastTop.current = log.scrollTop;
  }

  function record(event: ChatEvent) {
    if (conversation) sendEvent(conversation.id, event);
  }

  function recordLink(event: React.MouseEvent) {
    const href = (event.target as Element).closest("a")?.getAttribute("href");
    if (!href) return;
    record(
      href === "/checkout"
        ? { type: "checkout_clicked" }
        : { type: "link_clicked", data: { url: href } },
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    send(draft.trim());
  }

  function send(text: string) {
    if (!text || busy || !conversation) return;
    setDraft("");
    if (live)
      setLeaving({
        ...live,
        top: logRef.current?.querySelector<HTMLElement>(".cc-suggestions")
          ?.offsetTop,
      });
    sendMessage({ text });
  }

  function like({ handle, title }: { handle: string; title: string }) {
    if (busy || !conversation) return;
    record({ type: "product_liked", data: { handle } });
    pinned.current = true;
    send(`I like ${title}, tell me more about it.`);
  }

  async function add(product: ProductCardProps, variant: ProductVariant) {
    if (busy || !conversation) return;
    await addToCart(variant.id);
    record({
      type: "added_to_cart",
      data: { handle: product.handle, variantId: variant.id },
    });
    setCart(await getCart());
    const label =
      product.variants.length > 1
        ? ` (${variant.selectedOptions.map((option) => option.value).join(" / ")})`
        : "";
    pinned.current = true;
    send(`I added ${product.title}${label} to my cart.`);
  }

  return (
    <>
      <div
        id="cc-panel"
        className="cc-panel"
        data-open={open}
        data-size={size}
        aria-hidden={!open}
      >
        <div
          className="cc-log"
          ref={logRef}
          onScroll={track}
          onClickCapture={recordLink}
        >
          <div className="cc-log__content">
            {messages.map((message) => {
              const parts = message.parts.map((part, index) => {
                const node = renderPart(
                  part,
                  like,
                  add,
                  cart,
                  status === "streaming" && message === last,
                );
                return (
                  node && (
                    <div
                      key={index}
                      className={`cc-part cc-part--${part.type}`}
                    >
                      {node}
                    </div>
                  )
                );
              });
              return (
                <Fragment key={message.id}>
                  {parts.some(Boolean) && (
                    <div className={`cc-message cc-message--${message.role}`}>
                      {parts}
                    </div>
                  )}
                  {suggestions?.id === message.id && (
                    <div
                      className="cc-suggestions"
                      data-leaving={suggestions === leaving}
                      style={{ top: suggestions.top }}
                      onAnimationEnd={(event) => {
                        if (event.target === event.currentTarget)
                          setLeaving(undefined);
                      }}
                    >
                      {suggestions.items.map((suggestion, index) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="cc-suggestion"
                          style={{ "--cc-i": index } as React.CSSProperties}
                          onClick={() => {
                            record({
                              type: "suggestion_clicked",
                              data: { text: suggestion },
                            });
                            send(suggestion);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </Fragment>
              );
            })}

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
        </div>

        <form className="cc-composer" onSubmit={submit}>
          <input
            ref={inputRef}
            className="cc-input"
            enterKeyHint="send"
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
        onClick={() => setOpen(!open)}
      >
        <svg
          className="cc-launcher__icon cc-launcher__icon--chat"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle
            className="cc-launcher__spark-cut"
            cx="20.5"
            cy="3.5"
            r="5"
          />
          <path
            className="cc-launcher__spark"
            d="M20.5 0Q20.5 3.5 24 3.5Q20.5 3.5 20.5 7Q20.5 3.5 17 3.5Q20.5 3.5 20.5 0Z"
          />
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
