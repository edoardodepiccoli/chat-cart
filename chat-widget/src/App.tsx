import { useChat } from "@ai-sdk/react";
import { Fragment, useEffect, useRef, useState } from "react";

import {
  openConversation,
  sendEvent,
  transport,
  type Conversation,
} from "./api";
import { addToCart, getCart, type Cart } from "./cart";
import { renderPart } from "./components";
import Suggestions, { type ShownSuggestions } from "./components/Suggestions";
import { useIosKeyboard, useStickToBottom } from "./hooks";
import { ChatIcon, CloseIcon } from "./icons";
import type {
  ChatMessage,
  ProductCardProps,
  ProductVariant,
} from "../../shared/chat";
import type { ChatEvent } from "../../shared/events";

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
  const [leaving, setLeaving] = useState<ShownSuggestions>();
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { track, pin } = useStickToBottom(logRef);
  useIosKeyboard(inputRef);
  const last = messages.at(-1);
  const loading = !conversation && !loadFailed;
  const busy = loading || status === "submitted" || status === "streaming";
  const size = messages.length >= 5 ? "l" : messages.length > 1 ? "m" : "s";
  const items =
    status === "ready" && last?.role === "assistant"
      ? last.parts.find((part) => part.type === "data-suggestions")?.data
      : undefined;
  const live: ShownSuggestions | undefined =
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

  function pick(text: string) {
    record({ type: "suggestion_clicked", data: { text } });
    send(text);
  }

  function like({ handle, title }: { handle: string; title: string }) {
    if (busy || !conversation) return;
    record({ type: "product_liked", data: { handle } });
    pin();
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
    pin();
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
                const node = renderPart(part, {
                  cart,
                  streaming: status === "streaming" && message === last,
                  onLike: like,
                  onAdd: add,
                });
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
                    <Suggestions
                      {...suggestions}
                      leaving={suggestions === leaving}
                      onPick={pick}
                      onLeft={() => setLeaving(undefined)}
                    />
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
            className="cc-control cc-input"
            enterKeyHint="send"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a message"
            aria-label="Message"
            disabled={busy || !conversation}
          />
          <button
            className="cc-btn"
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
        <ChatIcon className="cc-launcher__icon cc-launcher__icon--chat" />
        <CloseIcon className="cc-launcher__icon cc-launcher__icon--close" />
      </button>
    </>
  );
}
