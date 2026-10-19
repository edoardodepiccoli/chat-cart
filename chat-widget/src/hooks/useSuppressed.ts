import { useEffect, useState, type RefObject } from "react";

import { createLatch } from "../hideSelectors";
import { watchCover } from "../watchCover";

// Whether the closed launcher should step aside: a configured element covers
// it, or the page asked via `chat-cart:hide` / `chat-cart:show` events.
// An open panel is never hidden, so a conversation can't vanish mid-reply.
export function useSuppressed(
  selectors: string[],
  launcherRef: RefObject<HTMLElement>,
  open: boolean,
) {
  const [covered, setCovered] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!selectors.length) return;
    const latch = createLatch(setCovered, 200);
    const stop = watchCover(selectors, () => launcherRef.current, latch.set);
    return () => {
      stop();
      latch.cancel();
    };
  }, [selectors, launcherRef]);

  useEffect(() => {
    const hide = () => setRequested(true);
    const show = () => setRequested(false);
    document.addEventListener("chat-cart:hide", hide);
    document.addEventListener("chat-cart:show", show);
    return () => {
      document.removeEventListener("chat-cart:hide", hide);
      document.removeEventListener("chat-cart:show", show);
    };
  }, []);

  return !open && (covered || requested);
}
