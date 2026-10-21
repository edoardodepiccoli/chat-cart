import { useRef } from "react";

import { useLauncherHidden } from "../hooks/useLauncherHidden";
import { t } from "../i18n";
import { ChatIcon, CloseIcon } from "../icons";

export default function Launcher({
  open,
  hideSelector = "",
  onClick,
}: {
  open: boolean;
  hideSelector?: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const covered = useLauncherHidden(hideSelector, ref);

  return (
    <button
      ref={ref}
      type="button"
      className="cc-launcher"
      data-open={open}
      data-covered={covered && !open}
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
