import { t } from "../i18n";
import { CloseIcon } from "../icons";

export default function Teaser({
  text,
  onClick,
  onDismiss,
}: {
  text: string;
  onClick?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="cc-teaser">
      <button type="button" className="cc-teaser__text" onClick={onClick}>
        {text}
      </button>
      <button
        type="button"
        className="cc-teaser__close"
        aria-label={t("dismissTeaser")}
        onClick={onDismiss}
      >
        <CloseIcon />
      </button>
    </div>
  );
}
