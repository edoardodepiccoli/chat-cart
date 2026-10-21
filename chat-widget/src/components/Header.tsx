import { t } from "../i18n";
import { CloseIcon, ResetIcon, SparkIcon } from "../icons";

export type HeaderProps = {
  onReset: () => void;
  resetDisabled?: boolean;
};

export default function Header({
  onReset,
  resetDisabled,
  onClose,
}: HeaderProps & { onClose: () => void }) {
  return (
    <header className="cc-header">
      <span className="cc-header__mark">
        <SparkIcon className="cc-header__spark" />
      </span>
      <h2 className="cc-header__title">{t("assistantName")}</h2>
      <button
        className="cc-btn cc-btn--ghost cc-btn--icon"
        type="button"
        aria-label={t("resetChat")}
        title={t("resetChat")}
        onClick={onReset}
        disabled={resetDisabled}
      >
        <ResetIcon className="cc-icon" />
      </button>
      {/* Phones only: the panel covers the launcher there. */}
      <button
        className="cc-btn cc-btn--ghost cc-btn--icon cc-header__close"
        type="button"
        aria-label={t("closeChat")}
        onClick={onClose}
      >
        <CloseIcon className="cc-icon cc-icon--stroke" />
      </button>
    </header>
  );
}
