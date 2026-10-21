import { useLayoutEffect, useRef, type RefObject } from "react";

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
