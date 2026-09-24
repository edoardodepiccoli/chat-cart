import { useEffect, useRef, useState } from "react";

export type TextMessageProps = { text: string; streaming?: boolean };

const LEAD = 40;
const WAIT = 400;
const MIN_RATE = 0.05;
const LAG = 600;

function useSteadyLength(length: number, animate: boolean) {
  const [shown, setShown] = useState(animate ? 0 : length);
  const target = useRef(length);
  const value = useRef(shown);
  target.current = length;
  const behind = shown < length;

  useEffect(() => {
    if (!behind) return;
    let previous = performance.now();
    const start = previous;
    let frame = requestAnimationFrame(function tick(now) {
      const backlog = target.current - value.current;
      const waiting =
        value.current === 0 && backlog < LEAD && now - start < WAIT;
      if (!waiting && backlog > 0) {
        const rate = Math.max(MIN_RATE, backlog / LAG);
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
  streaming = false,
}: TextMessageProps) {
  const shown = useSteadyLength(text.length, streaming);
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
