export type TextMessageProps = { text: string };

export default function TextMessage({ text }: TextMessageProps) {
  return (
    <>
      {text.split(/(\s+)/).map((token, index) => (
        <span key={index} className="cc-word">
          {token}
        </span>
      ))}
    </>
  );
}
