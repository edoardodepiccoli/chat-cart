import type { RefObject } from "react";

export default function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement>;
}) {
  return (
    <form className="cc-composer" onSubmit={onSubmit}>
      <input
        ref={inputRef}
        className="cc-control cc-input"
        enterKeyHint="send"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type a message"
        aria-label="Message"
        disabled={disabled}
      />
      <button className="cc-btn" type="submit" disabled={disabled}>
        Send
      </button>
    </form>
  );
}
