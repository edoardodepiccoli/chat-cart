import { t } from "../i18n";
import { ArrowRightIcon, PageIcon } from "../icons";

export default function FaqCard({
  title,
  answer,
  url,
}: {
  title: string;
  answer: string;
  url: string;
}) {
  return (
    <div className="cc-card cc-faq">
      <div className="cc-faq__head">
        <span className="cc-faq__icon">
          <PageIcon className="cc-icon" />
        </span>
        <a className="cc-card__title" href={url}>
          {title}
        </a>
      </div>

      <div className="cc-faq__answer">{answer}</div>

      <a
        className="cc-btn cc-btn--secondary cc-btn--sm cc-faq__link"
        href={url}
      >
        {t("readFullPage")}
        <ArrowRightIcon className="cc-icon" />
      </a>
    </div>
  );
}
