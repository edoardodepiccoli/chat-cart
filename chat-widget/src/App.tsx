import { Fragment, useRef, useState } from "react";

import { refreshCart } from "./cart";
import Message from "./components/Message";
import Panel from "./components/Panel";
import Suggestions from "./components/Suggestions";
import { useAnchorScroll } from "./hooks/useAnchorScroll";
import { useChatSession } from "./hooks/useChatSession";
import { useIosKeyboard } from "./hooks/useIosKeyboard";
import { t } from "./i18n";
import { AlertIcon, SparkIcon } from "./icons";
import { groupTurns, typingLabel } from "./messages";

export default function App({ hideSelector = "" }: { hideSelector?: string }) {
  const [open, setOpen] = useState(false);
  const {
    conversation,
    loadFailed,
    messages,
    error,
    busy,
    suggestions,
    send,
    canReset,
    reset,
    resetFailed,
  } = useChatSession();
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turns = groupTurns(messages);
  useAnchorScroll(logRef, turns.at(-1)?.[0].id);
  useIosKeyboard(inputRef);
  const last = messages.at(-1);

  function submitText(text: string) {
    if (!text || busy || !conversation) return;
    setDraft("");
    send(text);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    submitText(draft.trim());
  }

  function startOver() {
    setDraft("");
    reset();
  }

  function pick(text: string) {
    submitText(text);
  }

  return (
    <Panel
      open={open}
      hideSelector={hideSelector}
      logRef={logRef}
      header={{ onReset: startOver, resetDisabled: !canReset }}
      composer={{
        value: draft,
        onChange: setDraft,
        onSubmit: submit,
        disabled: busy || !conversation,
        inputRef,
      }}
      onToggle={() => {
        // The cart shows only in the open panel, so read it fresh on open.
        if (!open) void refreshCart();
        setOpen(!open);
      }}
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
                <span className="cc-typing__mark">
                  <SparkIcon className="cc-typing__spark" />
                </span>
                {typingLabel(last)}
                <span className="cc-typing__dots" aria-hidden="true">
                  <span className="cc-typing__dot" />
                  <span className="cc-typing__dot" />
                  <span className="cc-typing__dot" />
                </span>
              </div>
            </div>
          )}

          {index === all.length - 1 && (error || loadFailed || resetFailed) && (
            <div className="cc-message cc-message--assistant">
              <div className="cc-part cc-notice" role="alert">
                <AlertIcon className="cc-icon" />
                {t("error")}
              </div>
            </div>
          )}
        </div>
      ))}
    </Panel>
  );
}
