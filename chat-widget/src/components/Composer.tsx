import type { RefObject } from "react";

import { t } from "../i18n";
import { SendIcon } from "../icons";

export type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement>;
};

export default function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  inputRef,
}: ComposerProps) {
  return (
    <form className="cc-composer" onSubmit={onSubmit}>
      <div className="cc-composer__field" data-disabled={disabled}>
        <input
          ref={inputRef}
          className="cc-input"
          enterKeyHint="send"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("messageLabel")}
          disabled={disabled}
        />
        <button
          className="cc-composer__send"
          type="submit"
          aria-label={t("send")}
          disabled={disabled || !value.trim()}
        >
          <SendIcon className="cc-icon" />
        </button>
      </div>
    </form>
  );
}
