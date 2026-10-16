import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { log, setContextProvider, setSink } from "./logger.server";

const keys = [
  "LOG_LEVEL",
  "LOG_FORMAT",
  "NO_COLOR",
  "FORCE_COLOR",
  "NODE_ENV",
] as const;
const saved: Record<string, string | undefined> = {};
let lines: string[];
let restore: () => void;

beforeEach(() => {
  for (const k of keys) saved[k] = process.env[k];
  delete process.env.LOG_LEVEL;
  delete process.env.LOG_FORMAT;
  delete process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  lines = [];
  restore = setSink((line) => lines.push(line));
  setContextProvider(() => undefined);
});

afterEach(() => {
  restore();
  setContextProvider(() => undefined);
  for (const k of keys) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("log", () => {
  it("hides info at LOG_LEVEL=warn", () => {
    process.env.LOG_LEVEL = "warn";
    log.info("chat", "hidden");
    log.warn("chat", "shown");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("shown");
  });

  it("hides debug by default", () => {
    log.debug("chat", "hidden");
    expect(lines).toHaveLength(0);
  });

  it("keeps payload only at debug", () => {
    log.info("chat", "a", {}, { payload: { x: 1 } });
    expect(lines[0].split("\n")).toHaveLength(1);
    process.env.LOG_LEVEL = "debug";
    log.debug("chat", "b", {}, { payload: { x: 1 } });
    expect(lines[1].split("\n").length).toBeGreaterThan(1);
  });

  it("stamps the provided context", () => {
    setContextProvider(() => ({ req: "aaaa", route: "chat" }));
    log.info("chat", "hello");
    expect(lines[0]).toContain("req=aaaa");
  });

  it("writes JSON when LOG_FORMAT=json", () => {
    process.env.LOG_FORMAT = "json";
    log.info("tool", "getProduct", { ms: 5 }, { depth: 1 });
    expect(JSON.parse(lines[0])).toMatchObject({
      level: "info",
      tag: "tool",
      message: "getProduct",
      depth: 1,
      fields: { ms: 5 },
    });
  });

  it("defaults to JSON in production", () => {
    process.env.NODE_ENV = "production";
    log.info("chat", "x");
    expect(() => JSON.parse(lines[0])).not.toThrow();
  });

  it("never throws from a throwing sink or context provider", () => {
    restore();
    restore = setSink(() => {
      throw new Error("boom");
    });
    expect(() => log.info("chat", "x")).not.toThrow();
    restore();
    restore = setSink((l) => lines.push(l));
    setContextProvider(() => {
      throw new Error("boom");
    });
    expect(() => log.info("chat", "x")).not.toThrow();
  });

  it("treats FORCE_COLOR=0 as off", () => {
    delete process.env.NO_COLOR;
    process.env.FORCE_COLOR = "0";
    log.info("chat", "x");
    expect(lines[0]).not.toContain("\x1b[");
  });

  it("colors only when forced and NO_COLOR is unset", () => {
    process.env.FORCE_COLOR = "1";
    log.info("chat", "x");
    expect(lines[0]).not.toContain("\x1b[");
    delete process.env.NO_COLOR;
    log.info("chat", "x");
    expect(lines[1]).toContain("\x1b[");
  });
});
