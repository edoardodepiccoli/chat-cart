export default function Suggestions({
  items,
  onPick,
}: {
  items: string[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="cc-suggestions">
      {items.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          className="cc-suggestion"
          onClick={() => onPick(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
