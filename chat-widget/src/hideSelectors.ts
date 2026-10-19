type Box = Pick<
  DOMRect,
  "left" | "top" | "right" | "bottom" | "width" | "height"
>;

export function parseSelectors(raw: string | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let current = "";
  for (const ch of raw) {
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if ((ch === "," && depth === 0 && !quote) || ch === "\n") {
      out.push(current);
      current = "";
    } else current += ch;
  }
  out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
}

export function rectInViewport(
  rect: Box,
  viewportWidth: number,
  viewportHeight: number,
) {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < viewportWidth &&
    rect.top < viewportHeight
  );
}

export function rectsOverlap(a: Box, b: Box) {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  );
}

// Turns on at once, turns off only after `delay` ms of staying off, so
// swapping one drawer for another doesn't flash the launcher in between.
export function createLatch(onChange: (on: boolean) => void, delay: number) {
  let on = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
  }

  function set(next: boolean) {
    if (next) {
      cancel();
      if (!on) onChange((on = true));
    } else if (on && !timer) {
      timer = setTimeout(() => {
        timer = undefined;
        onChange((on = false));
      }, delay);
    }
  }

  return { set, cancel };
}
