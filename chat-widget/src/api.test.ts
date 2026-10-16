import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchTeasers, startConversation } from "./api";

function stubFetch(impl: () => Promise<unknown>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const json = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe("fetchTeasers", () => {
  it("returns teasers from a valid body and posts the context", async () => {
    const fetchMock = stubFetch(() => json({ teasers: ["a", "b", "c"] }));
    expect(await fetchTeasers("c1")).toEqual(["a", "b", "c"]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/apps/chat-cart/teasers");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({
      conversationId: "c1",
      context: { page: { type: "other" } },
    });
  });

  it("returns nothing on a non-OK status", async () => {
    stubFetch(() => json({ teasers: ["a"] }, false));
    expect(await fetchTeasers("c1")).toEqual([]);
  });

  it("returns nothing on a malformed body", async () => {
    stubFetch(() => json({ teasers: "a" }));
    expect(await fetchTeasers("c1")).toEqual([]);
  });

  it("returns nothing when the request fails", async () => {
    stubFetch(() => Promise.reject(new Error("offline")));
    expect(await fetchTeasers("c1")).toEqual([]);
  });
});

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
