import { useChat } from "@ai-sdk/react";
import { Fragment, useEffect, useRef, useState } from "react";

import { CHECKOUT_URL, useCart } from "./cart";
import Message from "./components/Message";
import Panel, { useAnchorScroll, useIosKeyboard } from "./components/Panel";
import Suggestions from "./components/Suggestions";
import Teaser from "./components/Teaser";
import {
  fetchTeaser,
  getPageContext,
  markTeaserSeen,
  sendEvent,
  teaserSeen,
  transport,
  useConversation,
} from "./api";
import { t } from "./i18n";
import type { ChatMessage } from "../../shared/chat";
import type { Product, ProductVariant } from "../../shared/product";

const TEASER_DELAY = 3000;

const TOOL_LABELS = {
  listProducts: "lookingUpProducts",
  getProduct: "lookingUpProducts",
  listStorePages: "checkingStore",
  getStorePage: "checkingStore",
} as const;

function typingLabel(message: ChatMessage | undefined) {
  const part =
    message?.role === "assistant"
      ? message.parts
          .filter(
            (part) =>
              part.type.startsWith("tool-") &&
              "state" in part &&
              (part.state === "input-streaming" ||
                part.state === "input-available"),
          )
          .at(-1)
      : undefined;
  const tool = part?.type.slice("tool-".length);
  return t(TOOL_LABELS[tool as keyof typeof TOOL_LABELS] ?? "typing");
}

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

function groupTurns(messages: ChatMessage[]) {
  return messages.reduce<ChatMessage[][]>((turns, message) => {
    const current = turns.at(-1);
    if (message.role === "user" || !current) turns.push([message]);
    else current.push(message);
    return turns;
  }, []);
}

export default function App() {
  const { conversation, loadFailed, trackEvent } = useConversation();
  const { cart, add: addToCart } = useCart(trackEvent);
  const { messages, sendMessage, status, error } = useChat<ChatMessage>({
    id: conversation?.id,
    transport,
    messages: conversation ? [greeting(), ...conversation.messages] : [],
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [teaser, setTeaser] = useState<string>();
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turns = groupTurns(messages);
  useAnchorScroll(logRef, turns.at(-1)?.[0].id);
  useIosKeyboard(inputRef);
  const last = messages.at(-1);
  const loading = !conversation && !loadFailed;
  const busy = loading || status === "submitted" || status === "streaming";
  const size = messages.length >= 5 ? "l" : messages.length > 1 ? "m" : "s";
  const suggestions =
    status === "ready" && last?.role === "assistant"
      ? last.parts.find((part) => part.type === "data-suggestions")?.data
      : undefined;

  useEffect(() => {
    if (open && conversation)
      sendEvent(conversation.id, { type: "widget_opened" });
  }, [open, conversation]);

  useEffect(() => {
    if (!conversation || !getPageContext().productHandle) return;
    if (open) {
      markTeaserSeen();
      setTeaser(undefined);
      return;
    }
    if (teaserSeen()) return;
    let cancelled = false;
    Promise.all([
      fetchTeaser(),
      new Promise((resolve) => setTimeout(resolve, TEASER_DELAY)),
    ])
      .then(([text]) => {
        if (cancelled || !text) return;
        markTeaserSeen();
        setTeaser(text);
        sendEvent(conversation.id, { type: "teaser_shown" });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, conversation]);

  function clickTeaser() {
    if (!teaser) return;
    trackEvent({ type: "teaser_clicked" });
    setTeaser(undefined);
    setOpen(true);
    send(teaser);
  }

  function dismissTeaser() {
    trackEvent({ type: "teaser_dismissed" });
    setTeaser(undefined);
  }

  function recordLink(event: React.MouseEvent) {
    const href = (event.target as Element).closest("a")?.getAttribute("href");
    if (!href) return;
    trackEvent(
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
    sendMessage({ text });
  }

  function pick(text: string) {
    trackEvent({ type: "suggestion_clicked", data: { text } });
    send(text);
  }

  function like({ handle, title }: { handle: string; title: string }) {
    if (busy || !conversation) return;
    trackEvent({ type: "product_liked", data: { handle } });
    send(t("liked", { title }));
  }

  async function add(product: Product, variant: ProductVariant) {
    if (busy || !conversation) return;
    await addToCart(product, variant);
    const label =
      product.variants.length > 1
        ? ` (${variant.selectedOptions.map((option) => option.value).join(" / ")})`
        : "";
    send(t("added", { title: product.title, options: label }));
  }

  return (
    <Panel
      open={open}
      size={size}
      logRef={logRef}
      onClickCapture={recordLink}
      composer={{
        value: draft,
        onChange: setDraft,
        onSubmit: submit,
        disabled: busy || !conversation,
        inputRef,
      }}
      onToggle={() => setOpen(!open)}
      teaser={
        !open && teaser ? (
          <Teaser
            text={teaser}
            onClick={clickTeaser}
            onDismiss={dismissTeaser}
          />
        ) : undefined
      }
    >
      {(turns.length ? turns : [[]]).map((turn, index, all) => (
        <div className="cc-turn" key={turn[0]?.id ?? "start"}>
          {turn.map((message) => (
            <Fragment key={message.id}>
              <Message
                message={message}
                context={{
                  cart,
                  onLike: like,
                  onAdd: add,
                }}
              />
              {message === last && suggestions && (
                <Suggestions items={suggestions} onPick={pick} />
              )}
            </Fragment>
          ))}

          {index === all.length - 1 && busy && (
            <div className="cc-message cc-message--assistant">
              <div className="cc-part cc-typing">
                {typingLabel(last)}
                <span className="cc-typing__dots" aria-hidden="true">
                  <span className="cc-typing__dot" />
                  <span className="cc-typing__dot" />
                  <span className="cc-typing__dot" />
                </span>
              </div>
            </div>
          )}

          {index === all.length - 1 && (error || loadFailed) && (
            <div className="cc-message cc-message--assistant">
              <div className="cc-part">{t("error")}</div>
            </div>
          )}
        </div>
      ))}
    </Panel>
  );
}
