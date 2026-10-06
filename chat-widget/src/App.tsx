import { useChat } from "@ai-sdk/react";
import { Fragment, useEffect, useRef, useState } from "react";

import { CHECKOUT_URL, useCart } from "./cart";
import Message from "./components/Message";
import Panel, { useIosKeyboard, useStickToBottom } from "./components/Panel";
import Suggestions, { type ShownSuggestions } from "./components/Suggestions";
import { sendEvent, transport, useConversation } from "./conversation";
import { t } from "./i18n";
import type {
  ChatMessage,
  ProductCardProps,
  ProductVariant,
} from "../../shared/chat";

function greeting(): ChatMessage {
  return {
    id: "greeting",
    role: "assistant",
    parts: [
      { type: "text", text: t("greeting") },
      {
        type: "data-suggestions",
        data: [t("suggestion1"), t("suggestion2"), t("suggestion3")],
      },
    ],
  };
}

export default function App() {
  const { conversation, loadFailed, record } = useConversation();
  const { cart, add: addToCart } = useCart(record);
  const { messages, sendMessage, status, error } = useChat<ChatMessage>({
    id: conversation?.id,
    transport,
    messages: conversation ? [greeting(), ...conversation.messages] : [],
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
    if (open && conversation)
      sendEvent(conversation.id, { type: "widget_opened" });
  }, [open, conversation]);

  function recordLink(event: React.MouseEvent) {
    const href = (event.target as Element).closest("a")?.getAttribute("href");
    if (!href) return;
    record(
      href === CHECKOUT_URL
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
    send(t("liked", { title }));
  }

  async function add(product: ProductCardProps, variant: ProductVariant) {
    if (busy || !conversation) return;
    await addToCart(product, variant);
    const label =
      product.variants.length > 1
        ? ` (${variant.selectedOptions.map((option) => option.value).join(" / ")})`
        : "";
    pin();
    send(t("added", { title: product.title, options: label }));
  }

  return (
    <Panel
      open={open}
      size={size}
      logRef={logRef}
      onScroll={track}
      onClickCapture={recordLink}
      composer={{
        value: draft,
        onChange: setDraft,
        onSubmit: submit,
        disabled: busy || !conversation,
        inputRef,
      }}
      onToggle={() => setOpen(!open)}
    >
      {messages.map((message) => (
        <Fragment key={message.id}>
          <Message
            message={message}
            context={{
              cart,
              streaming: status === "streaming" && message === last,
              onLike: like,
              onAdd: add,
            }}
          />
          {suggestions?.id === message.id && (
            <Suggestions
              {...suggestions}
              leaving={suggestions === leaving}
              onPick={pick}
              onLeft={() => setLeaving(undefined)}
            />
          )}
        </Fragment>
      ))}

      {busy && (
        <div className="cc-message cc-message--assistant">
          <div className="cc-part cc-typing">
            {t("typing")}
            <span className="cc-typing__dot">.</span>
            <span className="cc-typing__dot">.</span>
            <span className="cc-typing__dot">.</span>
          </div>
        </div>
      )}

      {(error || loadFailed) && (
        <div className="cc-message cc-message--assistant">
          <div className="cc-part">{t("error")}</div>
        </div>
      )}
    </Panel>
  );
}
