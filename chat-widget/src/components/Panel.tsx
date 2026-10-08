import {
  useEffect,
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
  onScroll,
  onClickCapture,
  composer,
  onToggle,
  teaser,
  children,
}: {
  open: boolean;
  size: "s" | "m" | "l";
  logRef?: RefObject<HTMLDivElement>;
  onScroll?: () => void;
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
        <div
          className="cc-log"
          ref={logRef}
          onScroll={onScroll}
          onClickCapture={onClickCapture}
        >
          <div className="cc-log__content">{children}</div>
        </div>

        <Composer {...composer} />
      </div>

      {teaser}

      <Launcher open={open} size={size} onClick={onToggle} />
    </>
  );
}

export function useStickToBottom(logRef: RefObject<HTMLDivElement>) {
  const pinned = useRef(true);
  const lastTop = useRef(0);

  useEffect(() => {
    const log = logRef.current;
    const content = log?.firstElementChild;
    if (!log || !content) return;
    const observer = new ResizeObserver(() => {
      if (pinned.current)
        log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [logRef]);

  function track() {
    const log = logRef.current;
    if (!log) return;
    if (log.scrollHeight - log.scrollTop - log.clientHeight < 24)
      pinned.current = true;
    else if (log.scrollTop < lastTop.current) pinned.current = false;
    lastTop.current = log.scrollTop;
  }

  function pin() {
    pinned.current = true;
  }

  return { track, pin };
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
