import { Fragment, useRef, useState } from "react";

import Message from "./components/Message";
import Panel, { useAnchorScroll, useIosKeyboard } from "./components/Panel";
import Suggestions from "./components/Suggestions";
import { useChatSession } from "./hooks/useChatSession";
import { t } from "./i18n";
import { groupTurns, typingLabel } from "./turns";

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
      composer={{
        value: draft,
        onChange: setDraft,
        onSubmit: submit,
        disabled: busy || !conversation,
        inputRef,
        onReset: startOver,
        resetDisabled: !canReset,
      }}
      onToggle={() => setOpen(!open)}
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

          {index === all.length - 1 && (error || loadFailed || resetFailed) && (
            <div className="cc-message cc-message--assistant">
              <div className="cc-part">{t("error")}</div>
            </div>
          )}
        </div>
      ))}
    </Panel>
  );
}
