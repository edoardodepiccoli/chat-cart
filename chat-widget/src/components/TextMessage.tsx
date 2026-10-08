import { useEffect, useRef, useState } from "react";

export type TextMessageProps = {
  text: string;
  animate?: boolean;
  done?: boolean;
  onRevealed?: () => void;
};

const MIN_RATE = 0.04;
const MAX_RATE = 0.2;
const LAG = 1000;

function useSteadyLength(length: number, animate: boolean) {
  const [shown, setShown] = useState(animate ? Math.min(1, length) : length);
  const target = useRef(length);
  const value = useRef(shown);
  target.current = length;
  const behind = shown < length;

  useEffect(() => {
    if (!behind) return;
    let previous = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const backlog = target.current - value.current;
      if (backlog > 0) {
        const rate = Math.min(MAX_RATE, Math.max(MIN_RATE, backlog / LAG));
        value.current = Math.min(
          target.current,
          value.current + rate * (now - previous),
        );
        setShown(Math.floor(value.current));
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [behind]);

  return shown;
}

export default function TextMessage({
  text,
  animate = false,
  done = true,
  onRevealed,
}: TextMessageProps) {
  const shown = useSteadyLength(text.length, animate);
  const revealed = done && shown >= text.length;
  const onRevealedRef = useRef(onRevealed);
  onRevealedRef.current = onRevealed;

  useEffect(() => {
    if (revealed) onRevealedRef.current?.();
  }, [revealed]);

  const rest = text.slice(shown).search(/\s/);
  const visible =
    shown === 0 ? "" : rest < 0 ? text : text.slice(0, shown + rest);
  if (!visible) return null;

  return (
    <>
      {visible.split(/(\s+)/).map((token, index) => (
        <span key={index} className="cc-word">
          {token}
        </span>
      ))}
    </>
  );
}
