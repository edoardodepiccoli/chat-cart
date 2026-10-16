import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";

import { setSink } from "../log/logger.server";
import { withRequestLog } from "../log/request.server";

const mocks = vi.hoisted(() => ({
  saveMessage: vi.fn(),
  model: { current: null as unknown },
}));

vi.mock("./model", () => ({
  get MODEL() {
    return mocks.model.current;
  },
}));
vi.mock("../conversations.server", () => ({
  saveMessage: mocks.saveMessage,
}));
vi.mock("./suggestions.server", () => ({
  generateSuggestions: async () => ["a", "b", "c"],
}));
vi.mock("./tools.server", () => ({ createTools: () => ({}) }));

import { streamReply } from "./agent.server";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 3, text: 3, reasoning: 0 },
};

const reply = [
  { type: "stream-start", warnings: [] },
  { type: "text-start", id: "1" },
  { type: "text-delta", id: "1", delta: "Hi" },
  { type: "text-end", id: "1" },
  {
    type: "finish",
    finishReason: { unified: "stop", raw: "stop" },
    usage,
  },
];

function model(chunks: unknown[]) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({ chunks }),
    }),
  } as never);
}

let lines: string[];
let restore: () => void;
const saved = { ...process.env };

beforeEach(() => {
  delete process.env.LOG_LEVEL;
  process.env.LOG_FORMAT = "pretty";
  process.env.NO_COLOR = "1";
  lines = [];
  restore = setSink((line) => lines.push(line));
  mocks.saveMessage.mockReset();
});

afterEach(() => {
  restore();
  process.env = { ...saved };
});

async function run() {
  const response = await withRequestLog(
    "chat",
    () =>
      streamReply(
        "conv1",
        [
          {
            id: "a",
            role: "assistant",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
        { id: "u", role: "user", parts: [{ type: "text", text: "hi" }] },
        {} as never,
        { country: "IT", language: "it", page: { type: "other" }, history: [] },
      ),
    { endsLater: true },
  )({ request: new Request("http://x/", { method: "POST" }) });
  await response.text();
  await new Promise((r) => setTimeout(r, 10));
}

const index = (text: string) => lines.findIndex((l) => l.includes(text));
const done = () => lines.filter((l) => l.includes("■ done"));

describe("streamReply end of request", () => {
  it("logs saved, totals, then one done line", async () => {
    mocks.model.current = model(reply);
    await run();
    expect(done()).toHaveLength(1);
    expect(done()[0]).toContain("status=200");
    expect(index("saved")).toBeLessThan(index("totals"));
    expect(index("totals")).toBeLessThan(index("■ done"));
    expect(lines[index("totals")]).toContain("steps=1 tools=0 tokens in=10");
  });

  it("ends with status=error after a failed save", async () => {
    mocks.model.current = model(reply);
    mocks.saveMessage.mockRejectedValue(new Error("db down"));
    await run();
    expect(index("✗ save failed")).toBeGreaterThanOrEqual(0);
    expect(lines[index("✗ save failed")]).toContain('error="db down"');
    expect(done()).toHaveLength(1);
    expect(done()[0]).toContain("status=error");
    expect(index("✗ save failed")).toBeLessThan(index("■ done"));
  });

  it("logs stream failed before a single done line on a stream error", async () => {
    mocks.model.current = model([
      { type: "stream-start", warnings: [] },
      { type: "error", error: new Error("boom") },
    ]);
    await run();
    expect(lines.filter((l) => l.includes("stream failed"))).toHaveLength(1);
    expect(done()).toHaveLength(1);
    expect(done()[0]).toContain("status=error");
    expect(index("stream failed")).toBeLessThan(index("■ done"));
  });
});
