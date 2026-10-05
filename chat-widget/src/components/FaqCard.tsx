import type { FaqCardProps } from "../../../shared/chat";
import { t } from "../i18n";
import { ListIcon } from "../icons";

export default function FaqCard({ title, answer, url }: FaqCardProps) {
  return (
    <div className="cc-card">
      <div className="cc-card__body">
        <a className="cc-card__title" href={url}>
          {title}
        </a>

        <div>{answer}</div>

        <a className="cc-btn cc-btn--secondary" href={url}>
          <ListIcon className="cc-icon" />
          {t("readFullPage")}
        </a>
      </div>
    </div>
  );
}
