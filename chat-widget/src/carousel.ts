export type Slot = { left: number; width: number };

// The first and last items wholly inside the visible window, as indexes.
// Half a pixel of slack absorbs subpixel layout; when no item fits whole
// (a window narrower than a card), the one under the window's start counts.
export function visibleRange(
  slots: Slot[],
  viewLeft: number,
  viewWidth: number,
): { first: number; last: number } {
  const viewRight = viewLeft + viewWidth;
  const inside = slots
    .map((slot, index) => ({ ...slot, index }))
    .filter(
      (slot) =>
        slot.left >= viewLeft - 0.5 &&
        slot.left + slot.width <= viewRight + 0.5,
    );
  if (inside.length) {
    return { first: inside[0].index, last: inside[inside.length - 1].index };
  }
  const under = slots.findIndex((slot) => slot.left + slot.width > viewLeft);
  const index = under === -1 ? Math.max(0, slots.length - 1) : under;
  return { first: index, last: index };
}
