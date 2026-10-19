import { afterEach, describe, expect, it, vi } from "vitest";

import { startConversation } from "./api";

function stubFetch(impl: () => Promise<unknown>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const json = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe("startConversation", () => {
  it("asks for a new conversation without an id", async () => {
    const fetchMock = stubFetch(() => json({ id: "new", messages: [] }));
    expect(await startConversation()).toEqual({ id: "new", messages: [] });
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("/apps/chat-cart/chat");
  });

  it("rejects on a non-OK status", async () => {
    stubFetch(() => json({}, false));
    await expect(startConversation()).rejects.toThrow();
  });
});
