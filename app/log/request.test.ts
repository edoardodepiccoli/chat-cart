import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { log, setSink } from "./logger.server";
import {
  endRequest,
  logRejected,
  setConversation,
  withRequestLog,
} from "./request.server";

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

const post = () =>
  new Request("http://x/apps/chat-cart/chat", { method: "POST" });
const done = () => lines.filter((l) => l.includes("■ done"));

describe("withRequestLog", () => {
  it("stamps req and conv on lines inside nested async work and callbacks", async () => {
    await withRequestLog("chat", async () => {
      setConversation("abcdef123");
      await Promise.resolve();
      log.info("agent", "inner");
      setTimeout(() => log.info("agent", "later"), 0);
      await new Promise((r) => setTimeout(r, 5));
      return new Response(null);
    })({ request: post() });
    expect(
      lines.filter((l) => l.includes("conv=abcde")).length,
    ).toBeGreaterThanOrEqual(3);
    expect(lines[0]).toContain("▶ POST /chat");
    expect(lines[0]).toMatch(/req=[0-9a-f]{4}/);
  });

  it("logs done exactly once, including after a thrown 400", async () => {
    await expect(
      withRequestLog("chat", async () => {
        throw new Response("bad", { status: 400 });
      })({ request: post() }),
    ).rejects.toBeInstanceOf(Response);
    expect(
      lines.some((l) => l.includes("WARN") && /rejected\s+status=400/.test(l)),
    ).toBe(true);
    expect(done()).toHaveLength(1);
    expect(done()[0]).toContain("status=400");
  });

  it("logs done on return with status and ms", async () => {
    await withRequestLog(
      "teasers",
      async () => new Response(null, { status: 201 }),
    )({
      request: post(),
    });
    expect(done()).toHaveLength(1);
    expect(done()[0]).toMatch(/status=201 ms=\d+/);
    expect(done()[0]).toContain("teaser");
  });

  it("waits for endRequest when endsLater, and ignores a second endRequest", async () => {
    await withRequestLog(
      "chat",
      async () => {
        setTimeout(() => {
          endRequest(200);
          endRequest("error");
        }, 0);
        return new Response(null);
      },
      { endsLater: true },
    )({ request: post() });
    expect(done()).toHaveLength(0);
    await new Promise((r) => setTimeout(r, 10));
    expect(done()).toHaveLength(1);
    expect(done()[0]).toContain("status=200");
  });

  it("still ends an endsLater request that throws before streaming", async () => {
    await expect(
      withRequestLog(
        "chat",
        async () => {
          throw new Response("no", { status: 401 });
        },
        { endsLater: true },
      )({ request: post() }),
    ).rejects.toBeInstanceOf(Response);
    expect(done()).toHaveLength(1);
    expect(done()[0]).toContain("status=401");
  });

  it("logs 500 and rethrows on a plain error", async () => {
    await expect(
      withRequestLog("webhook", async () => {
        throw new Error("boom");
      })({ request: post() }),
    ).rejects.toThrow("boom");
    expect(
      lines.some(
        (l) =>
          l.includes("ERROR") &&
          l.includes("failed") &&
          l.includes('error="boom"'),
      ),
    ).toBe(true);
    expect(done()).toHaveLength(1);
    expect(done()[0]).toContain("status=500");
  });

  it("lists zod issue paths", async () => {
    const result = z
      .object({
        context: z.object({ page: z.object({ handle: z.string().max(3) }) }),
      })
      .safeParse({ context: { page: { handle: "toolong" } } });
    if (result.success) throw new Error("expected failure");
    await withRequestLog("chat", async () => {
      logRejected("chat", result.error.issues);
      return new Response(null);
    })({ request: post() });
    const line = lines.find((l) => l.includes("context.page.handle"));
    expect(line).toBeDefined();
    expect(
      lines.some((l) => l.includes("WARN") && l.includes("invalid body")),
    ).toBe(true);
  });
});
