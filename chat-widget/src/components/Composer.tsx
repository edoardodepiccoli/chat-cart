import type { RefObject } from "react";

import { t } from "../i18n";
import { ResetIcon, SendIcon } from "../icons";

export type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement>;
  onReset?: () => void;
  resetDisabled?: boolean;
};

export default function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  inputRef,
  onReset,
  resetDisabled,
}: ComposerProps) {
  return (
    <form className="cc-composer" onSubmit={onSubmit}>
      {onReset && (
        <button
          className="cc-btn cc-btn--secondary cc-btn--icon"
          type="button"
          aria-label={t("resetChat")}
          title={t("resetChat")}
          onClick={onReset}
          disabled={resetDisabled}
        >
          <ResetIcon className="cc-icon" />
        </button>
      )}
      <input
        ref={inputRef}
        className="cc-control cc-input"
        enterKeyHint="send"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("messageLabel")}
        disabled={disabled}
      />
      <button
        className="cc-btn cc-btn--secondary cc-btn--icon"
        type="submit"
        aria-label={t("send")}
        disabled={disabled}
      >
        <SendIcon className="cc-icon" />
      </button>
    </form>
  );
}
