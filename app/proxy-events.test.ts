import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setSink } from "./log/logger.server";

vi.mock("./shopify.server", () => ({
  authenticate: {
    public: {
      appProxy: async () => ({ session: { shop: "s.myshopify.com" } }),
    },
  },
}));

import { action } from "./routes/proxy.events";

const clientError = {
  type: "client_error",
  data: {
    kind: "chat_stream_failed",
    message: "timeout",
    open: false,
    busy: false,
    page: "product:serum",
  },
};

const post = (body: unknown) =>
  action({
    request: new Request("http://x/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  } as never);

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

describe("events route", () => {
  it("logs a client error without a conversation", async () => {
    const response = await post({ conversationId: null, ...clientError });
    expect(response.status).toBe(204);
    const line = lines.find((l) => l.includes("ERROR") && l.includes("client"));
    expect(line).toContain("chat_stream_failed");
    expect(line).toContain("message=timeout");
    expect(line).toContain("page=product:serum");
  });

  it("logs a client error with a conversation", async () => {
    const response = await post({ conversationId: "c1", ...clientError });
    expect(response.status).toBe(204);
    expect(lines.some((l) => l.includes("ERROR"))).toBe(true);
  });

  it("rejects an unknown event", async () => {
    const rejected = await post({
      conversationId: null,
      type: "product_clicked",
      data: { handle: "serum" },
    }).catch((response: Response) => response);
    expect((rejected as Response).status).toBe(400);
  });
});
