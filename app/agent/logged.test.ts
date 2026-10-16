import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setSink } from "../log/logger.server";
import { logged } from "./logged.server";

let lines: string[];
let restore: () => void;
const saved = { ...process.env };

beforeEach(() => {
  delete process.env.LOG_LEVEL;
  process.env.LOG_FORMAT = "pretty";
  process.env.NO_COLOR = "1";
  lines = [];
  restore = setSink((line) => lines.push(line));
});

afterEach(() => {
  restore();
  process.env = { ...saved };
});

describe("logged", () => {
  it("logs the tool, its input, a result line and ms", async () => {
    const execute = logged("getProduct", async () => null);
    expect(await execute({ handle: "serum" })).toBeNull();
    const text = lines.join("\n");
    expect(text).toMatch(/tool\s+getProduct\s+ms=\d+/);
    expect(text).toMatch(/input\s+handle=serum/);
    expect(text).toMatch(/result\s+⚠ not found/);
  });

  it("logs a thrown error and rethrows it", async () => {
    const execute = logged("showProducts", async () => {
      throw new Error("boom");
    });
    await expect(execute({ handles: ["x"] })).rejects.toThrow("boom");
    const error = lines.find((line) => line.includes('⚠ error "boom"'));
    expect(error).toMatch(/^\S+ WARN /);
  });

  it("puts the raw output in a debug payload", async () => {
    process.env.LOG_LEVEL = "debug";
    await logged("listCollections", async () => [{ title: "Eye Care" }])({});
    expect(lines.join("\n")).toContain('"title": "Eye Care"');
  });
});
