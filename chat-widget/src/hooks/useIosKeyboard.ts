import { useEffect, type RefObject } from "react";

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
