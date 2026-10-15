import { t } from "../i18n";
import { CloseIcon } from "../icons";

export default function Teasers({
  items,
  onPick,
  onDismiss,
}: {
  items: string[];
  onPick: (text: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="cc-teasers">
      {items.map((text) => (
        <button
          type="button"
          className="cc-teaser__text"
          key={text}
          onClick={() => onPick(text)}
        >
          {text}
        </button>
      ))}
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
