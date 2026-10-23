import { describe, expect, it } from "vitest";

import { pickAdapter, type ThemeAdapter } from "./adapter";

function adapter(name: string, detect: () => boolean): ThemeAdapter {
  return { name, detect, sections: () => [], refresh() {} };
}

describe("pickAdapter", () => {
  it("returns the first adapter whose detect passes", () => {
    const b = adapter("b", () => true);
    const adapters = [adapter("a", () => false), b, adapter("c", () => true)];
    expect(pickAdapter(adapters)).toBe(b);
  });

  it("skips an adapter whose detect throws", () => {
    const b = adapter("b", () => true);
    const throws = adapter("throws", () => {
      throw new Error("theme not ready");
    });
    expect(pickAdapter([throws, b])).toBe(b);
  });

  it("returns undefined when none match", () => {
    expect(pickAdapter([adapter("a", () => false)])).toBeUndefined();
  });
});
