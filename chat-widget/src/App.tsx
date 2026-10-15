import { Fragment, useEffect, useRef, useState } from "react";

import Message from "./components/Message";
import Panel, { useAnchorScroll, useIosKeyboard } from "./components/Panel";
import Suggestions from "./components/Suggestions";
import Teasers from "./components/Teasers";
import { useChatSession } from "./hooks/useChatSession";
import { useLinkTracking } from "./hooks/useLinkTracking";
import { useTeasers } from "./hooks/useTeasers";
import { sendEvent } from "./api";
import { t } from "./i18n";
import { groupTurns, typingLabel } from "./turns";

export default function App() {
  const {
    conversation,
    loadFailed,
    messages,
    error,
    busy,
    suggestions,
    send,
    trackEvent,
  } = useChatSession();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turns = groupTurns(messages);
  useAnchorScroll(logRef, turns.at(-1)?.[0].id);
  useIosKeyboard(inputRef);
  const last = messages.at(-1);
  const trackLink = useLinkTracking(trackEvent);
  const teasers = useTeasers({
    open,
    busy,
    conversationId: conversation?.id,
    trackEvent,
    onPick: (text) => {
      setOpen(true);
      submitText(text, true);
    },
  });

  useEffect(() => {
    if (open && conversation)
      sendEvent(conversation.id, { type: "widget_opened" });
  }, [open, conversation]);

  function submitText(text: string, teaser = false) {
    if (!text || busy || !conversation) return;
    setDraft("");
    send(text, { teaser });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    submitText(draft.trim());
  }

  function pick(text: string) {
    trackEvent({ type: "suggestion_clicked", data: { text } });
    submitText(text);
  }

  return (
    <Panel
      open={open}
      logRef={logRef}
      onClickCapture={trackLink}
      composer={{
        value: draft,
        onChange: setDraft,
        onSubmit: submit,
        disabled: busy || !conversation,
        inputRef,
      }}
      onToggle={() => setOpen(!open)}
      teaser={
        !open && teasers.teasers.length ? (
          <Teasers
            items={teasers.teasers}
            onPick={teasers.pick}
            onDismiss={teasers.dismiss}
          />
        ) : undefined
      }
    >
      {(turns.length ? turns : [[]]).map((turn, index, all) => (
        <div className="cc-turn" key={turn[0]?.id ?? "start"}>
          {turn.map((message) => (
            <Fragment key={message.id}>
              <Message message={message} />
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
