import type { FaqCardProps } from "../../../shared/chat";
import { ListIcon } from "../icons";

export default function FaqCard({ title, answer, url }: FaqCardProps) {
  return (
    <div className="cc-card">
      <div className="cc-card__body">
        <a className="cc-card__title" href={url}>
          {title}
        </a>

        <div>{answer}</div>

        <a className="cc-card__view" href={url}>
          <ListIcon className="cc-icon" />
          Read full page
        </a>
      </div>
    </div>
  );
}
