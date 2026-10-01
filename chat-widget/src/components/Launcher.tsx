import { ChatIcon, CloseIcon } from "../icons";

export default function Launcher({
  open,
  size,
  onClick,
}: {
  open: boolean;
  size?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="cc-launcher"
      data-open={open}
      data-size={size}
      aria-expanded={open}
      aria-controls="cc-panel"
      aria-label={open ? "Close chat" : "Open chat"}
      onClick={onClick}
    >
      <ChatIcon className="cc-launcher__icon cc-launcher__icon--chat" />
      <CloseIcon className="cc-launcher__icon cc-launcher__icon--close" />
    </button>
  );
}
