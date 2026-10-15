import { beforeEach, describe, expect, it, vi } from "vitest";

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

function call(conversationId: string | null) {
  return action({
    request: new Request("http://x/", {
      method: "POST",
      body: JSON.stringify({ conversationId, context }),
    }),
  } as never);
}

beforeEach(() => {
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
});
