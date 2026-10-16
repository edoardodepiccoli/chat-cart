import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { log, setSink } from "./logger.server";
import {
  bindRequest,
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

  it("bindRequest keeps the request context when called from outside it", async () => {
    let later = () => {};
    await withRequestLog("chat", async () => {
      setConversation("abcdef123");
      later = bindRequest(() => log.info("agent", "outside"));
      return new Response(null);
    })({ request: post() });
    later();
    const line = lines.find((l) => l.includes("outside"));
    expect(line).toContain("conv=abcde");
    expect(line).toMatch(/req=[0-9a-f]{4}/);
  });

  it("prints the start line with conv when setConversation comes first", async () => {
    await withRequestLog("chat", async () => {
      setConversation("abcdef123");
      log.info("agent", "inner");
      return new Response(null);
    })({ request: post() });
    expect(lines[0]).toContain("▶ POST /chat");
    expect(lines[0]).toContain("conv=abcde");
    expect(lines.filter((l) => l.includes("▶"))).toHaveLength(1);
  });

  it("prints the start line first, without conv, before an earlier log", async () => {
    await withRequestLog("chat", async () => {
      log.warn("chat", "auth failed");
      setConversation("abcdef123");
      return new Response(null);
    })({ request: post() });
    expect(lines[0]).toContain("▶ POST /chat");
    expect(lines[0]).not.toContain("conv=");
    expect(lines[1]).toContain("auth failed");
    expect(lines.filter((l) => l.includes("▶"))).toHaveLength(1);
  });

  it("prints the start line just before done when nothing else logs", async () => {
    await withRequestLog(
      "chat",
      async () => new Response(null),
    )({
      request: post(),
    });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("▶ POST /chat");
    expect(lines[1]).toContain("■ done");
  });

  it("keeps the request start time on a delayed start line", async () => {
    process.env.LOG_FORMAT = "json";
    const before = Date.now();
    await withRequestLog("chat", async () => {
      await new Promise((r) => setTimeout(r, 30));
      setConversation("abcdef123");
      return new Response(null);
    })({ request: post() });
    const [start, end] = lines.map((l) => JSON.parse(l));
    expect(start.conv).toBe("abcdef123");
    expect(Date.parse(start.time)).toBeLessThan(before + 20);
    expect(
      Date.parse(end.time) - Date.parse(start.time),
    ).toBeGreaterThanOrEqual(25);
  });

  it("prints the start line on a thrown error before anything else", async () => {
    await expect(
      withRequestLog("chat", async () => {
        throw new Error("boom");
      })({ request: post() }),
    ).rejects.toThrow("boom");
    expect(lines[0]).toContain("▶ POST /chat");
    expect(lines[1]).toContain("failed");
    expect(lines[2]).toContain("■ done");
  });

  it("logs rejected as a child when the handler already warned", async () => {
    await expect(
      withRequestLog("chat", async () => {
        log.warn("chat", "auth failed");
        throw new Response("no", { status: 401 });
      })({ request: post() }),
    ).rejects.toBeInstanceOf(Response);
    const line = lines.find((l) => l.includes("rejected"));
    expect(line).toMatch(/chat {6}rejected\s+status=401/);
    expect(line).not.toContain("WARN");
    expect(lines.filter((l) => l.includes("WARN"))).toHaveLength(1);
  });

  it("labels webhook start lines with the request path", async () => {
    await withRequestLog(
      "webhook",
      async () => new Response(null),
    )({
      request: new Request("http://x/webhooks/app/uninstalled", {
        method: "POST",
      }),
    });
    expect(lines[0]).toContain("▶ POST /webhooks/app/uninstalled");
  });

  it("names an empty issue path (body)", async () => {
    await withRequestLog("chat", async () => {
      logRejected("chat", [
        { code: "custom", path: [], message: "expected object" },
      ]);
      return new Response(null);
    })({ request: post() });
    expect(lines.some((l) => l.includes("(body): expected object"))).toBe(true);
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
