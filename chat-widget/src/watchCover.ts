import { rectInViewport, rectsOverlap } from "./hideSelectors";

function matches(selector: string): Element[] {
  try {
    return [...document.querySelectorAll(selector)];
  } catch {
    return [];
  }
}

// On-screen boxes of an element. Wrappers with no box of their own (e.g. a
// custom element whose only child is position: fixed) report their children.
function visibleRects(el: Element): DOMRect[] {
  const { display } = getComputedStyle(el);
  if (display === "none") return [];
  const rect = el.getBoundingClientRect();
  if (display === "contents" || !rect.width || !rect.height)
    return [...el.children].flatMap(visibleRects);
  const shown =
    el.checkVisibility({ checkVisibilityCSS: true, opacityProperty: true }) &&
    rectInViewport(rect, window.innerWidth, window.innerHeight);
  return shown ? [rect] : [];
}

// Calls onChange with whether any element matching `selectors` is visible and
// overlaps `target()`. Re-checks at most once per frame. Returns a stop fn.
export function watchCover(
  selectors: string[],
  target: () => Element | null,
  onChange: (covered: boolean) => void,
) {
  let frame = 0;
  const observed = new Set<Element>();
  const intersections = new IntersectionObserver(schedule);

  function observe(el: Element) {
    if (observed.has(el)) return;
    observed.add(el);
    intersections.observe(el);
  }

  function check() {
    frame = 0;
    for (const el of observed) {
      if (el.isConnected) continue;
      observed.delete(el);
      intersections.unobserve(el);
    }
    const found = selectors.flatMap(matches);
    for (const el of found) [el, ...el.children].forEach(observe);
    const box = target()?.getBoundingClientRect();
    onChange(
      !!box &&
        found.some((el) => visibleRects(el).some((r) => rectsOverlap(r, box))),
    );
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(check);
  }

  const mutations = new MutationObserver(schedule);
  mutations.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
  document.addEventListener("transitionend", schedule, true);
  document.addEventListener("animationend", schedule, true);
  window.addEventListener("resize", schedule);
  check();

  return () => {
    cancelAnimationFrame(frame);
    mutations.disconnect();
    intersections.disconnect();
    document.removeEventListener("transitionend", schedule, true);
    document.removeEventListener("animationend", schedule, true);
    window.removeEventListener("resize", schedule);
  };
}
