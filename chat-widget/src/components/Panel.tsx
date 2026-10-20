import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { useCart } from "../cart";
import CartSheet from "./CartSheet";
import CheckoutBar from "./CheckoutBar";
import Composer, { type ComposerProps } from "./Composer";
import Launcher from "./Launcher";

export default function Panel({
  open,
  hideSelector,
  logRef,
  composer,
  onToggle,
  children,
}: {
  open: boolean;
  hideSelector: string;
  logRef: RefObject<HTMLDivElement>;
  composer: ComposerProps;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { cart } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);
  const hasItems = Boolean(cart?.items.length);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    if (!hasItems) setSheetOpen(false);
  }, [hasItems]);

  return (
    <>
      <div
        className="cc-backdrop"
        data-open={open}
        onClick={onToggle}
        aria-hidden="true"
      />

      <div
        id="cc-panel"
        className="cc-panel"
        data-open={open}
        aria-hidden={!open}
      >
        <div className="cc-log" ref={logRef}>
          <div className="cc-log__content">{children}</div>
        </div>

        {cart && hasItems && (
          <>
            <CheckoutBar cart={cart} onOpen={() => setSheetOpen(true)} />
            <CartSheet open={sheetOpen} onClose={closeSheet} />
          </>
        )}

        <Composer {...composer} />
      </div>

      <Launcher open={open} hideSelector={hideSelector} onClick={onToggle} />
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
