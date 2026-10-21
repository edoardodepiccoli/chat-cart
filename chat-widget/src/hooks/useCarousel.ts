import { useCallback, useEffect, useState, type RefObject } from "react";

import { visibleRange } from "../carousel";

// Tracks which cards of a scroll-snapping track are in view, and scrolls it
// one card at a time.
export function useCarousel(trackRef: RefObject<HTMLElement>, count: number) {
  const [state, setState] = useState({ overflow: false, first: 0, last: 0 });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const slots = Array.from(track.children, (item) => {
      const element = item as HTMLElement;
      return { left: element.offsetLeft, width: element.offsetWidth };
    });
    const view = visibleRange(
      slots,
      track.scrollLeft + padding,
      track.clientWidth - 2 * padding,
    );
    setState({
      overflow: track.scrollWidth > track.clientWidth + 1,
      ...view,
    });
  }, [trackRef]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    track.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [trackRef, measure, count]);

  function step(direction: 1 | -1) {
    const track = trackRef.current;
    const index = direction === 1 ? state.first + 1 : state.first - 1;
    const item = track?.children[index] as HTMLElement | undefined;
    if (!track || !item) return;
    const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({
      left: item.offsetLeft - padding,
      behavior: still ? "auto" : "smooth",
    });
  }

  return { ...state, step };
}
