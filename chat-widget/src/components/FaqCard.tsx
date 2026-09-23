export type FaqCardProps = {
  title: string;
  answer: string;
  url: string;
};

export default function FaqCard({ title, answer, url }: FaqCardProps) {
  return (
    <div className="cc-card">
      <div className="cc-card__body">
        <a className="cc-card__title" href={url}>
          {title}
        </a>

        <div>{answer}</div>

        <a className="cc-card__view" href={url}>
          Read full page
        </a>
      </div>
    </div>
  );
}
