import { t } from "../i18n";
import { ChatIcon, CloseIcon } from "../icons";

export default function Launcher({
  open,
  size,
  onClick,
}: {
  open: boolean;
  size?: "s" | "m" | "l";
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
      aria-label={open ? t("closeChat") : t("openChat")}
      onClick={onClick}
    >
      <ChatIcon className="cc-launcher__icon cc-launcher__icon--chat" />
      <CloseIcon className="cc-launcher__icon cc-launcher__icon--close" />
    </button>
  );
}
