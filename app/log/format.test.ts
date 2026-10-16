import { describe, expect, it } from "vitest";
import { formatJson, formatPretty } from "./format";

const base = {
  time: new Date("2026-10-16T10:42:07.312Z"),
  level: "info",
  tag: "tool",
  message: "getProduct",
  depth: 2,
  fields: { ms: 210 },
} as const;

describe("formatPretty", () => {
  it("lays out time, level, tag, indent, message and fields without color", () => {
    const line = formatPretty(
      { ...base, ctx: { req: "7f3c", conv: "ab12f9999", route: "chat" } },
      { color: false },
    );
    expect(line).toMatch(
      /^\d\d:\d\d:\d\d\.312 INFO {2}tool {8}getProduct\s+ms=210 conv=ab12f req=7f3c$/,
    );
  });

  it("colors ms yellow from 2000 and red from 5000", () => {
    expect(
      formatPretty({ ...base, fields: { ms: 2000 } }, { color: true }),
    ).toContain("\x1b[33mms=2000");
    expect(
      formatPretty({ ...base, fields: { ms: 5000 } }, { color: true }),
    ).toContain("\x1b[31mms=5000");
    expect(
      formatPretty({ ...base, fields: { ms: 1999 } }, { color: true }),
    ).not.toContain("\x1b[33mms=");
  });

  it("quotes, cuts and cleans shopper text", () => {
    const line = formatPretty(
      { ...base, detail: "a\nb\x1b[31m" + "x".repeat(200), quote: "shopper" },
      { color: false },
    );
    expect(line).toContain('"a b');
    expect(line).not.toContain("\x1b[31m");
    expect(line).toContain('…"');
    expect(line.split("\n")).toHaveLength(1);
  });

  it("styles shopper text bold and model text italic", () => {
    expect(
      formatPretty(
        { ...base, detail: "hi", quote: "shopper" },
        { color: true },
      ),
    ).toContain('\x1b[1m"hi"');
    expect(
      formatPretty({ ...base, detail: "hi", quote: "model" }, { color: true }),
    ).toContain('\x1b[3m"hi"');
  });

  it("colors status symbols in detail", () => {
    const line = formatPretty(
      { ...base, detail: "⚠ a ✓ b ✗ c" },
      { color: true },
    );
    expect(line).toContain("\x1b[33m⚠");
    expect(line).toContain("\x1b[32m✓");
    expect(line).toContain("\x1b[31m✗");
  });

  it("prints a debug payload as an indented block and survives circular data", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(
      formatPretty({ ...base, payload: { a: 1 } }, { color: false }).split("\n")
        .length,
    ).toBeGreaterThan(1);
    expect(() =>
      formatPretty({ ...base, payload: circular }, { color: false }),
    ).not.toThrow();
    expect(formatJson({ ...base, payload: circular })).toContain(
      "[unserializable]",
    );
  });

  it("starts a request with a blank line", () => {
    expect(
      formatPretty({ ...base, edge: "start" }, { color: false }).startsWith(
        "\n",
      ),
    ).toBe(true);
    expect(
      formatPretty({ ...base, edge: "start" }, { color: false }),
    ).toContain("▶ getProduct");
    expect(formatPretty({ ...base, edge: "end" }, { color: false })).toContain(
      "■ getProduct",
    );
  });
});

describe("formatPretty hardening", () => {
  it("keeps message and field values on one line without escapes", () => {
    const line = formatPretty(
      {
        ...base,
        message: "a\nb\x1b[31mc\x1b]0;t\x07d",
        fields: { x: "p\r\nq\x1b[2Jr\x07" },
      },
      { color: false },
    );
    expect(line.split("\n")).toHaveLength(1);
    // eslint-disable-next-line no-control-regex
    expect(line).not.toMatch(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/);
    expect(line).toContain("a bcd");
    expect(line).toContain("x=p  qr");
  });

  it("cleans ctx values", () => {
    const line = formatPretty(
      { ...base, ctx: { req: "a\nb", conv: "c\x1b[0md", route: "chat" } },
      { color: false },
    );
    expect(line.split("\n")).toHaveLength(1);
  });

  it("restores quote style after a symbol", () => {
    const line = formatPretty(
      { ...base, detail: "⚠ x", quote: "shopper" },
      { color: true },
    );
    expect(line).toContain("\x1b[33m⚠\x1b[0m\x1b[1m");
  });

  it("cuts by code points", () => {
    const line = formatPretty(
      { ...base, detail: "😀".repeat(161), quote: "model" },
      { color: false },
    );
    expect(line).toContain("😀".repeat(160) + '…"');
    expect(line).not.toContain("\ud83d…");
  });

  it("omits conv when absent", () => {
    const line = formatPretty(
      { ...base, ctx: { req: "7f3c", route: "chat" } },
      { color: false },
    );
    expect(line).toMatch(/ms=210 req=7f3c$/);
  });

  it("does not truncate a label longer than 24 characters", () => {
    const long = "a-very-long-message-label-over-24";
    const line = formatPretty(
      { ...base, message: long, depth: 0 },
      { color: false },
    );
    expect(line).toContain(`${long} ms=210`);
  });
});

describe("formatJson", () => {
  it("writes JSON on one line with context", () => {
    const text = formatJson({ ...base, ctx: { req: "7f3c", route: "chat" } });
    expect(text.split("\n")).toHaveLength(1);
    expect(JSON.parse(text)).toMatchObject({
      level: "info",
      tag: "tool",
      message: "getProduct",
      depth: 2,
      fields: { ms: 210 },
      req: "7f3c",
      route: "chat",
    });
  });
});
