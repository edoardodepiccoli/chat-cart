import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import Composer, { type ComposerProps } from "./Composer";
import { t } from "../i18n";
import { CloseIcon } from "../icons";
import Launcher from "./Launcher";

export default function Panel({
  open,
  logRef,
  onClickCapture,
  bar,
  composer,
  onToggle,
  teaser,
  children,
}: {
  open: boolean;
  logRef?: RefObject<HTMLDivElement>;
  onClickCapture?: (event: React.MouseEvent) => void;
  bar?: ReactNode;
  composer: ComposerProps;
  onToggle?: () => void;
  teaser?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {onToggle && (
        <div
          className="cc-backdrop"
          data-open={open}
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <div
        id="cc-panel"
        className="cc-panel"
        data-open={open}
        aria-hidden={!open}
        onClickCapture={onClickCapture}
      >
        {onToggle && (
          <button
            type="button"
            className="cc-panel__close"
            aria-label={t("closeChat")}
            onClick={onToggle}
          >
            <CloseIcon />
          </button>
        )}

        <div className="cc-log" ref={logRef}>
          <div className="cc-log__content">{children}</div>
        </div>

        {bar}

        <Composer {...composer} />
      </div>

      {teaser}

      <Launcher open={open} onClick={onToggle} />
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
