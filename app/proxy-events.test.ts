import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setSink } from "./log/logger.server";

const mocks = vi.hoisted(() => ({ saveEvent: vi.fn() }));

vi.mock("./shopify.server", () => ({
  authenticate: {
    public: {
      appProxy: async () => ({ session: { shop: "s.myshopify.com" } }),
    },
  },
}));
vi.mock("./metrics.server", () => ({ saveEvent: mocks.saveEvent }));

import { action } from "./routes/proxy.events";

const clientError = {
  type: "client_error",
  data: {
    kind: "teasers_failed",
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
  mocks.saveEvent.mockReset();
});

afterEach(() => {
  restore();
  process.env = { ...saved };
});

describe("events route", () => {
  it("logs a client error without a conversation and does not save it", async () => {
    const response = await post({ conversationId: null, ...clientError });
    expect(response.status).toBe(204);
    expect(mocks.saveEvent).not.toHaveBeenCalled();
    const line = lines.find((l) => l.includes("ERROR") && l.includes("client"));
    expect(line).toContain("teasers_failed");
    expect(line).toContain("message=timeout");
    expect(line).toContain("page=product:serum");
  });

  it("saves a client error with a conversation", async () => {
    mocks.saveEvent.mockResolvedValue(true);
    const response = await post({ conversationId: "c1", ...clientError });
    expect(response.status).toBe(204);
    expect(mocks.saveEvent).toHaveBeenCalledOnce();
    expect(lines.some((l) => l.includes("ERROR"))).toBe(true);
  });

  it("rejects other events without a conversation", async () => {
    const rejected = await post({
      conversationId: null,
      type: "product_clicked",
      data: { handle: "serum" },
    }).catch((response: Response) => response);
    expect((rejected as Response).status).toBe(400);
    expect(mocks.saveEvent).not.toHaveBeenCalled();
  });
});
