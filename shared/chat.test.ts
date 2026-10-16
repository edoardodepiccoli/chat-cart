import { describe, expect, it } from "vitest";

import { chatEventSchema } from "./chat";

const error = (data: Record<string, unknown>) => ({
  type: "client_error",
  data: {
    kind: "teasers_failed",
    message: "boom",
    open: false,
    busy: true,
    page: "product:serum",
    ...data,
  },
});

describe("client_error event", () => {
  it("parses a valid event", () => {
    expect(chatEventSchema.safeParse(error({})).success).toBe(true);
  });

  it("rejects a message over 500 characters", () => {
    expect(
      chatEventSchema.safeParse(error({ message: "x".repeat(501) })).success,
    ).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(chatEventSchema.safeParse(error({ kind: "other" })).success).toBe(
      false,
    );
  });
});
