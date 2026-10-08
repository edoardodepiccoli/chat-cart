import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import Composer, { type ComposerProps } from "./Composer";
import Launcher from "./Launcher";

export default function Panel({
  open,
  size,
  logRef,
  onClickCapture,
  composer,
  onToggle,
  teaser,
  children,
}: {
  open: boolean;
  size: "s" | "m" | "l";
  logRef?: RefObject<HTMLDivElement>;
  onClickCapture?: (event: React.MouseEvent) => void;
  composer: ComposerProps;
  onToggle?: () => void;
  teaser?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div
        id="cc-panel"
        className="cc-panel"
        data-open={open}
        data-size={size}
        aria-hidden={!open}
      >
        <div className="cc-log" ref={logRef} onClickCapture={onClickCapture}>
          <div className="cc-log__content">{children}</div>
        </div>

        <Composer {...composer} />
      </div>

      {teaser}

      <Launcher open={open} size={size} onClick={onToggle} />
    </>
  );
}

export function useAnchorScroll(
  logRef: RefObject<HTMLDivElement>,
  anchorId: string | undefined,
) {
  const anchored = useRef<string>();

  useLayoutEffect(() => {
    const log = logRef.current;
    const turn = log?.querySelector<HTMLElement>(".cc-turn:last-child");
    if (!log || !turn || !anchorId || anchorId === anchored.current) return;
    if (anchored.current === undefined) log.scrollTop = log.scrollHeight;
    else log.scrollTo({ top: turn.offsetTop, behavior: "smooth" });
    anchored.current = anchorId;
  }, [logRef, anchorId]);
}

export function useIosKeyboard(inputRef: RefObject<HTMLInputElement>) {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.getElementById("chat-cart-root");
    if (!viewport || !root || !CSS.supports("-webkit-touch-callout", "none"))
      return;
    const update = () => {
      if (document.activeElement !== inputRef.current) {
        root.style.removeProperty("--cc-keyboard");
        root.style.removeProperty("--cc-viewport-height");
        return;
      }
      const keyboard = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      root.style.setProperty("--cc-keyboard", `${keyboard}px`);
      root.style.setProperty("--cc-viewport-height", `${viewport.height}px`);
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [inputRef]);
}
