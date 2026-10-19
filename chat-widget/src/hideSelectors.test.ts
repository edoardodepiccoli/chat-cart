import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLatch,
  parseSelectors,
  rectInViewport,
  rectsOverlap,
} from "./hideSelectors";

const rect = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
  width: right - left,
  height: bottom - top,
});

describe("parseSelectors", () => {
  it("splits on commas and trims", () => {
    expect(parseSelectors(" #menu , .quick-add ")).toEqual([
      "#menu",
      ".quick-add",
    ]);
  });

  it("keeps commas inside parens and quotes", () => {
    expect(parseSelectors(':is(.a, .b) > i, [data-x="a,b"], .c')).toEqual([
      ":is(.a, .b) > i",
      '[data-x="a,b"]',
      ".c",
    ]);
  });

  it("accepts newlines as separators", () => {
    expect(parseSelectors("#a\n#b")).toEqual(["#a", "#b"]);
  });

  it("returns nothing for empty or missing input", () => {
    expect(parseSelectors(undefined)).toEqual([]);
    expect(parseSelectors(" , ,")).toEqual([]);
  });
});

describe("rectInViewport", () => {
  it("is true when overlapping the viewport", () => {
    expect(rectInViewport(rect(0, 0, 100, 100), 800, 600)).toBe(true);
    expect(rectInViewport(rect(700, 500, 900, 700), 800, 600)).toBe(true);
  });

  it("is false when fully off-screen", () => {
    expect(rectInViewport(rect(-300, 0, 0, 600), 800, 600)).toBe(false);
    expect(rectInViewport(rect(0, 600, 800, 700), 800, 600)).toBe(false);
  });

  it("is false for empty rects", () => {
    expect(rectInViewport(rect(10, 10, 10, 50), 800, 600)).toBe(false);
  });
});

describe("rectsOverlap", () => {
  const launcher = rect(317, 776, 373, 832);

  it("is true for a bottom bar under the launcher", () => {
    expect(rectsOverlap(rect(0, 777, 393, 852), launcher)).toBe(true);
  });

  it("is false for a left drawer that stops short of the launcher", () => {
    expect(rectsOverlap(rect(0, 0, 300, 852), launcher)).toBe(false);
  });

  it("is false for rects that only touch edges", () => {
    expect(rectsOverlap(rect(0, 0, 317, 852), launcher)).toBe(false);
  });
});

describe("createLatch", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("turns on immediately and off after the delay", () => {
    const onChange = vi.fn();
    const latch = createLatch(onChange, 200);
    latch.set(true);
    expect(onChange).toHaveBeenLastCalledWith(true);
    latch.set(false);
    vi.advanceTimersByTime(199);
    expect(onChange).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("stays on when re-set before the delay ends", () => {
    const onChange = vi.fn();
    const latch = createLatch(onChange, 200);
    latch.set(true);
    latch.set(false);
    vi.advanceTimersByTime(100);
    latch.set(true);
    vi.advanceTimersByTime(500);
    expect(onChange.mock.calls).toEqual([[true]]);
  });

  it("ignores repeats and stops after cancel", () => {
    const onChange = vi.fn();
    const latch = createLatch(onChange, 200);
    latch.set(false);
    latch.set(true);
    latch.set(true);
    latch.set(false);
    latch.cancel();
    vi.advanceTimersByTime(500);
    expect(onChange.mock.calls).toEqual([[true]]);
  });
});
