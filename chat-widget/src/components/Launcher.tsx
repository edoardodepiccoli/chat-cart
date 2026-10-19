import { forwardRef } from "react";

import { t } from "../i18n";
import { ChatIcon, CloseIcon } from "../icons";

const Launcher = forwardRef<
  HTMLButtonElement,
  { open: boolean; suppressed?: boolean; onClick?: () => void }
>(function Launcher({ open, suppressed = false, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="cc-launcher"
      data-open={open}
      data-suppressed={suppressed}
      aria-hidden={suppressed || undefined}
      aria-expanded={open}
      aria-controls="cc-panel"
      aria-label={open ? t("closeChat") : t("openChat")}
      onClick={onClick}
    >
      <ChatIcon className="cc-launcher__icon cc-launcher__icon--chat" />
      <CloseIcon className="cc-launcher__icon cc-launcher__icon--close" />
    </button>
  );
});

export default Launcher;
