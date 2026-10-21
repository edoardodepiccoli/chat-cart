import { describe, expect, it } from "vitest";

import { rectsOverlap } from "./useLauncherHidden";

const rect = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
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

  it("is false for an off-screen bar", () => {
    expect(rectsOverlap(rect(0, 852, 393, 926), launcher)).toBe(false);
  });
});
