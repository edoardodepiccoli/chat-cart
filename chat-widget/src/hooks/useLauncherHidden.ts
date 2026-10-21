import { useEffect, useState, type RefObject } from "react";

type Box = Pick<DOMRect, "left" | "top" | "right" | "bottom">;

export function rectsOverlap(a: Box, b: Box) {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  );
}

// On-screen boxes of an element. Wrappers with no box of their own (e.g. a
// custom element whose only child is position: fixed) report their children.
function visibleRects(el: Element): DOMRect[] {
  const { display } = getComputedStyle(el);
  if (display === "none") return [];
  const rect = el.getBoundingClientRect();
  if (display === "contents" || !rect.width || !rect.height)
    return [...el.children].flatMap(visibleRects);
  return el.checkVisibility({ checkVisibilityCSS: true, opacityProperty: true })
    ? [rect]
    : [];
}

// Whether any visible element matching `selector` overlaps `ref`.
export function useLauncherHidden(selector: string, ref: RefObject<Element>) {
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    if (!selector) return;
    try {
      document.querySelector(selector);
    } catch {
      console.warn(`[chat-cart] invalid hide selector: ${selector}`);
      return;
    }

    let frame = 0;
    const check = () => {
      frame = 0;
      const box = ref.current?.getBoundingClientRect();
      setCovered(
        !!box &&
          [...document.querySelectorAll(selector)].some((el) =>
            visibleRects(el).some((r) => rectsOverlap(r, box)),
          ),
      );
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(check);
    };

    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    const events = ["scroll", "resize", "transitionend", "animationend"];
    for (const type of events)
      window.addEventListener(type, schedule, { capture: true, passive: true });
    check();

    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      for (const type of events)
        window.removeEventListener(type, schedule, { capture: true });
    };
  }, [selector, ref]);

  return covered;
}
