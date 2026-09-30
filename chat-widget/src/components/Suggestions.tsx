export type ShownSuggestions = { id: string; items: string[]; top?: number };

export default function Suggestions({
  items,
  top,
  leaving,
  onPick,
  onLeft,
}: ShownSuggestions & {
  leaving: boolean;
  onPick: (text: string) => void;
  onLeft: () => void;
}) {
  return (
    <div
      className="cc-suggestions"
      data-leaving={leaving}
      style={{ top }}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onLeft();
      }}
    >
      {items.map((suggestion, index) => (
        <button
          key={suggestion}
          type="button"
          className="cc-suggestion"
          style={{ "--cc-i": index } as React.CSSProperties}
          onClick={() => onPick(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
