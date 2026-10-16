import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setSink } from "./log/logger.server";

const mocks = vi.hoisted(() => ({
  loadMessages: vi.fn(),
  buildTeaserInput: vi.fn(),
  generateTeasers: vi.fn(),
}));

vi.mock("./shopify.server", () => ({
  authenticate: {
    public: {
      appProxy: async () => ({
        session: { shop: "s.myshopify.com" },
        storefront: {},
      }),
    },
  },
}));
vi.mock("./conversations.server", () => ({
  loadMessages: mocks.loadMessages,
}));
vi.mock("./agent/teasers.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./agent/teasers.server")>()),
  buildTeaserInput: mocks.buildTeaserInput,
  generateTeasers: mocks.generateTeasers,
}));

import { action } from "./routes/proxy.teasers";

const context = {
  country: "IT",
  language: "it",
  page: { type: "product", handle: "serum" },
  history: [],
};

function post(body: unknown) {
  return action({
    request: new Request("http://x/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  } as never);
}

const call = (conversationId: string | null, page: unknown = context.page) =>
  post({ conversationId, context: { ...context, page } });

let lines: string[];
let restore: () => void;
const saved = { ...process.env };

afterEach(() => {
  restore();
  process.env = { ...saved };
});

beforeEach(() => {
  delete process.env.LOG_LEVEL;
  process.env.LOG_FORMAT = "pretty";
  process.env.NO_COLOR = "1";
  lines = [];
  restore = setSink((line) => lines.push(line));
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.buildTeaserInput.mockResolvedValue({
    context: { page: { type: "product" } },
  });
});

describe("teasers route", () => {
  it("uses an empty chat for an unknown conversation", async () => {
    mocks.loadMessages.mockResolvedValue(null);
    mocks.generateTeasers.mockResolvedValue(["a", "b", "c"]);
    const response = await call("missing");
    expect(await response.json()).toEqual({ teasers: ["a", "b", "c"] });
    expect(mocks.buildTeaserInput).toHaveBeenCalledWith(
      expect.anything(),
      context,
      [],
    );
  });

  it("uses an empty chat without a conversation id", async () => {
    mocks.generateTeasers.mockResolvedValue(["a", "b", "c"]);
    await call(null);
    expect(mocks.loadMessages).not.toHaveBeenCalled();
    expect(mocks.buildTeaserInput).toHaveBeenCalledWith(
      expect.anything(),
      context,
      [],
    );
  });

  it("returns no teasers when generation fails", async () => {
    mocks.loadMessages.mockResolvedValue([]);
    mocks.generateTeasers.mockRejectedValue(new Error("bad output"));
    expect(await (await call("c")).json()).toEqual({ teasers: [] });
  });

  it("logs a skipped other page and ends once", async () => {
    const response = await call(null, { type: "other" });
    expect(await response.json()).toEqual({ teasers: [] });
    expect(lines.some((l) => /skipped\s+reason=page-other/.test(l))).toBe(true);
    const done = lines.filter((l) => l.includes("■ done"));
    expect(done).toHaveLength(1);
    expect(done[0]).toContain("status=200");
  });

  it("logs the issue paths of an invalid body", async () => {
    await expect(
      post({
        conversationId: null,
        context: { ...context, page: { type: "product" } },
      }),
    ).rejects.toBeInstanceOf(Response);
    expect(lines.some((l) => l.includes("invalid body"))).toBe(true);
    expect(lines.some((l) => l.includes("context.page"))).toBe(true);
    const done = lines.filter((l) => l.includes("■ done"));
    expect(done).toHaveLength(1);
    expect(done[0]).toContain("status=400");
  });
});
